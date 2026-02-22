const Order = require('../models/order');
const Stripe = require('stripe');
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
const { deliverFiles } = require('../services/fileDelivery');
const { buildCartOrder } = require('../services/cartOrder');
const paypalService = require('../services/payment/paypal');

if (!STRIPE_KEY) throw new Error('Missing STRIPE_SECRET key');
const stripe = new Stripe(STRIPE_KEY);

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

module.exports.createSession = async (req, res, next) => {
    try {
        const { orderItems, amountTotalCents } = await buildCartOrder(req);

        const baseUrl = (process.env.BASE_URL || '').trim();
        if (!/^https?:\/\/[^ "]+$/i.test(baseUrl)) {
            throw new Error(`BASE_URL invalid at runtime: "${process.env.BASE_URL}"`);
        }
        const successUrl = new URL('/checkout/success?session_id={CHECKOUT_SESSION_ID}', baseUrl).toString();

        const cancelUrl = new URL('/cart', baseUrl).toString();

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
            email: null,
        });
        const { paypalOrderId, approveUrl } = await paypalService.createPaypalOrder({
            dbOrderId: order._id,
            amountTotalCents
        });
        await Order.updateOne(
            { _id: order._id },
            { $set: { 'payment.paypalOrderId': paypalOrderId } }
        );
        return res.json({
            orderID: paypalOrderId,
            approveUrl,
            dbOrderId: String(order._id),
        });
    } catch (e) {
        return res.status(e.status || 500).json({ error: e.message || 'Server error' });
    }
}

module.exports.paypalReturn = async (req, res) => {
    try {
        const orderID = req.query.token;
        if (!orderID) return res.status(400).send('Missing token');

        const cap = await paypalService.capturePaypalOrder(orderID);

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