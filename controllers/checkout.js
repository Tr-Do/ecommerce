const { AppError } = require('../utils/AppError.js');
const Design = require('../models/design');
const Order = require('../models/order');
const Stripe = require('stripe');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../s3');
const { sendEmail } = require('../utils/mailgun');
const { buildDownloadEmail } = require('../utils/emailTemplate');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const Variant = require('../models/variant.js');
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_KEY) throw new Error('Missing STRIPE_SECRET key');
const stripe = new Stripe(STRIPE_KEY);

async function buildCartOrder(req) {
    const cart = req.session.cart || { items: [] };
    if (!Array.isArray(cart.items) || cart.items.length === 0)
        throw new AppError('Cart empty', 400);

    const productIds = cart.items.map(i => i.productId);
    const variantIds = cart.items.map(i => i.variantId)

    const products = await Design.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [String(p._id), p]));

    const variants = await Variant.find({ _id: { $in: variantIds } }).lean();
    const variantMap = new Map(variants.map(v => [String(v._id), v]));

    let amountTotalCents = 0;
    const orderItems = [];

    for (const item of cart.items) {
        const productId = String(item.productId);
        const product = productMap.get(productId);
        if (!product) throw new AppError('Product is missing', 404);

        const variant = variantMap.get(String(item.variantId));
        if (!variant) throw new AppError(`Variant missing ${item.variantId}`, 404);

        if (String(variant.productId) !== productId) throw new AppError('Variant does not belong to product', 400);

        //javascript has only floating point and base 2
        const unitAmount = Math.round(Number(variant.price) * 100);
        if (!Number.isFinite(unitAmount) || unitAmount < 0) throw new AppError('Invalid price', 400);
        amountTotalCents += unitAmount;

        const img0 = product.images?.[0]?.showPage || null;

        orderItems.push({
            productId: item.productId,
            variantId: variant._id,
            name: product.name,
            image: img0,
            size: variant.size,
            price: Number(variant.price),
            filesSnapshot: variant.files || []
        });
    }
    return { orderItems, amountTotalCents, currency: 'usd' }
}

function buildStripeLineItems(orderItems) {
    return orderItems.map(item => {
        const unitAmount = Math.round(Number(item.price) * 100);
        const stripeImages =
            typeof item.image === 'string' && /^https?:\/\//i.test(item.image) ? [item.image] : [];

        return {
            quantity: 1,
            price_data: {
                currency: 'usd',
                unit_amount: unitAmount,
                product_data: {
                    name: `${item.name} (${item.size})`,
                    images: stripeImages,
                    metadata: {
                        productId: String(item.productId),
                        variantId: String(item.variantId),
                        size: item.size
                    }
                }
            }
        }
    })
}

async function getAccessToken() {
    const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const res = await fetch(`${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: 'grant_type=client_credentials'
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Paypal token error: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data.access_token;
}

async function deliverFiles(orderId) {
    const order = await Order.findById(orderId);
    if (!order || order.payment.status !== 'paid') return;
    if (order.payment.emailSentAt || !order.email) return;

    const files = [];
    for (const item of order.items) {
        for (const file of (item.filesSnapshot || [])) {
            const cmd = new GetObjectCommand(
                {
                    Bucket: file.bucket,
                    Key: file.key
                }
            );
            const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 * 12 })
            files.push({ name: `${item.name} (${item.size})`, size: item.size, url });
        }
    }
    const html = buildDownloadEmail({ orderNumber: order.orderNumber, files });
    await sendEmail({ to: order.email, subject: `Your Terrarium Files - ${order.orderNumber}`, html });

    order.payment.emailSentAt = new Date();
    await order.save();
}

module.exports.createPaypalOrder = async (req, res) => {
    try {
        const { orderItems, amountTotalCents, currency } = await buildCartOrder(req);

        const order = await Order.create({
            ip: req.ip,
            user: req.user?._id || null,
            items: orderItems,
            payment: {
                provider: 'paypal',
                status: 'pending',
                currency,
                amountTotal: amountTotalCents,
            },
            email: null
        });
        const accessToken = await getAccessToken();
        const totalUSD = (amountTotalCents / 100).toFixed(2);

        const ppRes = await fetch(`${process.env.PAYPAL_BASE_URL}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                intent: 'CAPTURE',
                purchase_units: [{
                    custom_id: String(order._id),
                    amount: {
                        currency_code: 'USD',
                        value: totalUSD
                    }
                }],
                application_context: {
                    shipping_preference: 'NO_SHIPPING',
                    user_action: 'PAY_NOW',
                    return_url: `${process.env.BASE_URL}/checkout/paypal/return`,
                    cancel_url: `${process.env.BASE_URL}/cart`
                }
            })
        });
        let ppOrder;
        try {
            ppOrder = await ppRes.json();
        } catch {
            ppOrder = { error: 'Non-JSON response from Paypal' };
        }

        if (!ppRes.ok) {
            await Order.updateOne(
                { _id: order._id },
                {
                    $set: {
                        'payment.status': 'failed',
                        paypalError: ppOrder
                    }
                }
            );
            return res.status(502).json(ppOrder);
        }
        await Order.updateOne(
            { _id: order._id },
            { $set: { 'payment.paypalOrderId': ppOrder.id } }
        );
        const approveLink = ppOrder.links?.find(link => link.rel === 'approve');
        if (!approveLink?.href)
            return res.status(502).json({ error: 'Paypal approve link missing', ppOrder });

        return res.json({
            orderID: ppOrder.id,
            approveUrl: approveLink.href,
            dbOrderId: String(order._id)
        });
    } catch (e) {
        return res.status(e.status || 500).json({ error: e.message || 'Server error' });
    }

}

module.exports.capturePaypalOrder = async (req, res) => {
    try {
        const { orderID } = req.body;
        if (!orderID) return res.status(400).json({ error: 'Missing order ID' });

        const accessToken = await getAccessToken();

        const capRes = await fetch(
            `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        const cap = await capRes.json();
        if (!capRes.ok) return res.status(502).json(cap);

        const pu = cap.purchase_units?.[0];
        const dbOrderId = pu?.custom_id;
        const captureId = pu?.payments?.captures?.[0]?.id;
        const payerEmail = cap.payer?.email_address || null;
        const chargedCents = Math.round(Number(pu.amount.value) * 100);

        if (!dbOrderId) return res.status(400).json({ error: 'Missing order ID', cap });

        if (!captureId || capture?.status !== 'COMPLETED')
            return res.status(400).json({ error: 'Capture not completed', cap });


        const dbOrder = await Order.findOne(
            {
                _id: dbOrderId,
                'payment.paypalOrderId': orderID
            })
        if (!dbOrder) return res.status(400).json({ error: 'Order not found' });

        if (dbOrder.payment.status === 'paid') return res.json({ ok: true });

        const currencyCode = pu?.amount?.currency_code;
        if (!pu?.amount.value || !currencyCode)
            return res.status(400).json({ error: 'Missing purchase amount', cap });
        if (currencyCode.toLowerCase() !== dbOrder.payment.currency)
            return res.status(400).json({ error: 'Currency mismatch', currencyCode, expected: dbOrder.payment.currency });
        if (!captureId) return res.status(400).json({ error: 'Missing captureId', cap });

        if (chargedCents !== dbOrder.payment.amountTotal)
            return res.status(400).json({ error: 'Amount mismatch', chargedCents, expected: dbOrder.payment.amountTotal });

        const capture = pu?.payments?.captures?.[0];
        const captureStatus = capture?.status;
        if (captureStatus !== 'COMPLETED') {
            return res.status(400).json({ error: 'Not Completed', cap });
        }

        const result = await Order.updateOne(
            {
                _id: dbOrderId,
                'payment.paypalOrderId': orderID
            },
            {
                $set:
                {
                    email: payerEmail,
                    'payment.status': 'paid',
                    'payment.paidAt': new Date(),
                    'payment.paypalCaptureId': captureId,
                    'payment.amountCharged': chargedCents,
                }
            });

        if (result.matchedCount !== 1) return res.status(400).json({ error: 'Order does not match', dbOrderId });

        await deliverFiles(dbOrderId);
        return res.json(cap);
    } catch (e) {
        return res.status(500).json({ error: e.message || 'Server error' });
    }
}

module.exports.paypalReturn = async (req, res) => {
    try {
        const orderID = req.query.token;
        if (!orderID) return res.status(400).send('Missing token');

        const accessToken = await getAccessToken();

        const capRes = await fetch(
            `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
            }
        );
        const cap = await capRes.json().catch(() => ({}));
        if (!capRes.ok) return res.status(502).json(cap);

        const pu = cap.purchase_units?.[0];
        const capture = pu?.payments?.captures?.[0];
        const dbOrderId = pu?.custom_id || capture?.custom_id || null;
        const captureId = capture?.id;
        const payerEmail = cap.payer?.email_address || null;


        if (!dbOrderId) return res.status(400).json({ error: 'Missing custom id', cap });
        if (!captureId || capture?.status !== 'COMPLETED')
            return res.status(400).json({ error: 'Capture not complete', cap });

        const dbOrder = await Order.findOne({ _id: dbOrderId, 'payment.paypalOrderId': orderID });
        if (!dbOrder) return res.status(400).json({ error: 'Order not found' });

        const valueStr = capture?.amount?.value ?? pu?.amount?.value ?? null;
        const chargedCents = valueStr ? Math.round(Number(valueStr) * 100) : null;

        if (chargedCents !== dbOrder.payment.amountTotal)
            return res.status(400).json({ error: 'Paid amount mismatch', chargedCents, expect: dbOrder.payment.amountTotal })
        else if (chargedCents === null)
            return res.status(400).json({ error: 'Paid amount missing', cap })



        await Order.updateOne(
            {
                _id: dbOrderId,
                'payment.paypalOrderId': orderID
            },
            {
                $set: {
                    email: payerEmail,
                    'payment.status': 'paid',
                    'payment.paidAt': new Date(),
                    'payment.paypalCaptureId': captureId,
                    'payment.amountCharged': chargedCents
                }
            }
        );
        req.session.cart = { items: [] };

        await deliverFiles(dbOrderId);

        const order = await Order.findById(dbOrderId).lean();
        return res.render('orders/index', { order, sessionId: null });

    } catch (e) {
        return res.status(500).json({ error: e.message || 'Server error' });
    }
}

module.exports.paypalFinalize = async (req, res) => {
    const { dbOrderId, paypalOrderId, paypalCaptureId } = req.body;

    if (!dbOrderId || !paypalOrderId) return res.status(400).json({ error: 'Missing order id' });

    const result = await Order.updateOne({
        _id: dbOrderId,
        'payment.provider': 'paypal'
    }, {
        $set: {
            'payment.status': 'paid',
            'payment.paidAt': new Date(),
            'payment.paypalOrderId': paypalOrderId,
            'payment.paypalCaptureId': paypalCaptureId || null,
        }
    })
    if (result.matchedCount !== 1)
        return res.status(400).json({ error: 'Order not found', dbOrderId });

    req.session.cart = { items: [] };
    return res.json({ ok: true })
}

module.exports.createSession = async (req, res, next) => {
    try {
        const { orderItems, amountTotalCents } = await buildCartOrder(req);

        const baseUrl = (process.env.BASE_URL || '').trim();
        if (!/^https?:\/\/[^ "]+$/i.test(baseUrl)) {
            throw new Error(`BASE_URL invalid at runtime: "${process.env.BASE_URL}"`);
        }
        const successUrl = `${baseUrl} / checkout / success ? session_id = { CHECKOUT_SESSION_ID }`;
        const cancelUrl = `${baseUrl} / cart`;

        const line_items = buildStripeLineItems(orderItems);

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items,
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        const order = await Order.create({
            ip: req.ip,
            user: req.user ? req.user._id : null,
            items: orderItems,
            payment: {
                provider: 'stripe',
                status: 'pending',
                stripeSessionId: session.id,
                currency: 'usd',
                amountCharged: null,
                paymentIntentId: null,
                paidAt: null,
                emailSentAt: null,
                card: {
                    brand: null,
                    last4: null
                },
                amountTotal: amountTotalCents
            },
            email: null,
        });

        req.session.lastOrderId = order._id;
        return res.redirect(303, session.url);
    } catch (err) {
        return next(err);
    }
}

module.exports.paymentConfirmation = async (req, res, next) => {
    try {
        const sessionId = req.query.session_id;

        if (!sessionId) {
            req.flash('error', 'Something went wrong');
            // display flash on order confimation page
            res.locals.error = req.flash('error');
            return res.redirect('/products');
        }

        const order = await Order.findOne({ 'payment.stripeSessionId': sessionId });

        if (!order) {
            req.flash('error', 'Order not found');
            res.locals.error = req.flash('error');
            return res.redirect('/cart');
        }
        if (order?.payment?.status === 'paid') {
            req.flash('success', 'Payment completed.');
            res.locals.success = req.flash('success');

            // reset cart count after payment confirmation
            req.session.cart = { items: [] };
            delete req.session.lastOrderId;
            res.locals.cartCount = 0;

        } else {
            req.flash('info', 'Payment processing...');
        }

        return res.render('orders/index', { order, sessionId });
    } catch (err) {
        return next(err);
    }
}

module.exports.webhook = async (req, res) => {
    const signature = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook signature failed`);
    }

    if (event.type !== 'checkout.session.completed') {
        return res.json({ received: true });
    }

    try {
        const session = event.data.object; // checkout.session
        if (session.payment_status !== 'paid') return res.json({ received: true });

        const order = await Order.findOne({ 'payment.stripeSessionId': session.id });
        if (!order || order.payment?.status === 'paid') return res.json({ received: true });

        if (typeof session.amount_total === 'number' && session.amount_total !== order.payment.amountTotal)
            return res.status(400).json({ error: 'Amount mismatch' });

        order.payment.status = 'paid';
        order.payment.amountCharged = session.amount_total ?? null;
        order.payment.currency = session.currency ?? 'usd';
        order.payment.paymentIntentId = session.payment_intent ?? null;
        order.payment.paidAt = new Date();

        // fetch payment from the latest charge to extract card information and store it to DB
        if (session.payment_intent) {
            const pi = await stripe.paymentIntents.retrieve(session.payment_intent, {
                expand: ['latest_charge']
            });
            const card = pi.latest_charge?.payment_method_details?.card;

            order.payment.card = {
                brand: card?.brand ?? null,
                last4: card?.last4 ?? null
            };
        }

        order.email = session.customer_details?.email || order.email;
        await order.save();
        await deliverFiles(order._id);
        return res.json({ received: true });
    } catch (err) {
        return res.status(500).json({ received: false });
    }
}