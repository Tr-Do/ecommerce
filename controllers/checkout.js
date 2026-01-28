const { AppError, throwError } = require('../utils/AppError.js');
const Design = require('../models/design');
const Order = require('../models/order');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../s3');
const { sendEmail } = require('../utils/mailgun');
const { buildDownloadEmail } = require('../utils/emailTemplate');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const Variant = require('../models/variant.js');

module.exports.createSession = async (req, res, next) => {
    try {
        const line_items = [];
        const ip = req.ip;

        const cart = req.session.cart || { items: [] };
        if (!Array.isArray(cart.items) || cart.items.length === 0) return res.redirect('/cart');

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
            amountTotalCents += unitAmount;

            line_items.push({
                quantity: 1,
                price_data: {
                    currency: 'usd',
                    unit_amount: unitAmount,
                    product_data: {
                        name: `${product.name} (${variant.size})`,
                        images: product.images?.length ? [product.images[0].showPage] : [],
                        metadata: {
                            productId: productId,
                            variantId: String(variant._id),
                            size: item.size
                        }
                    }
                }
            });
            orderItems.push({
                productId: item.productId,
                variantId: variant._id,
                name: product.name,
                size: variant.size,
                price: variant.price,
                filesSnapshot: variant.files || []
            });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items,
            success_url: `${process.env.BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.BASE_URL}/cart`,
        });

        const order = await Order.create({
            stripeSessionId: session.id,
            ip,
            user: req.user ? req.user._id : null,
            items: orderItems,
            amountTotal: amountTotalCents,
            paid: false,
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

        const order = await Order.findOne({ stripeSessionId: sessionId });

        if (!order) {
            req.flash('error', 'Order not found');
            res.locals.error = req.flash('error');
            return res.redirect('/cart');
        }
        if (order && order.paid) {
            req.flash('success', 'Payment completed.');
            res.locals.success = req.flash('success');

            // reset cart count after payment confirmation
            req.session.cart = { items: [] };
            delete req.session.lastOrderId;
            res.locals.cartCount = 0;
        } else {
            req.flash('success', 'Payment processing...');
        }

        return res.render('orders/show', { order, sessionId });
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

    const session = event.data.object; // checkout.session
    const sessionId = session.id;

    const order = await Order.findOne({ stripeSessionId: sessionId });

    if (!order || order.paid) return res.json({ received: true });

    order.paid = true;
    order.email = session.customer_details?.email || order.email;
    await order.save();

    if (!order.emailSentAt && order.email) {
        const files = [];

        for (const item of order.items) {
            for (const file of (item.fileSnapshot || [])) {
                const cmd = new GetObjectCommand({
                    Bucket: file.bucket,
                    Key: file.key
                });

                const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 * 12 });

                files.push({
                    name: `${item.name} (${item.size})`,
                    size: item.size,
                    url,
                });
            }
        }

        const html = buildDownloadEmail({
            orderNumber: order.orderNumber,
            files
        });

        await sendEmail({
            to: order.email,
            subject: `Your Terrarium Files - ${order.orderNumber}`,
            html
        });

        order.emailSentAt = new Date();
        await order.save();
    }
}