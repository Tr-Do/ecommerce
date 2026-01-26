const { AppError } = require('../utils/AppError.js');
const Design = require('../models/design');
const Order = require('../models/order');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../s3');
const { sendEmail } = require('../utils/mailgun');
const { buildDownloadEmail } = require('../utils/emailTemplate');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

module.exports.createSession = async (req, res, next) => {
    try {
        const line_items = [];
        const ip = req.ip;

        const cart = req.session.cart || { items: [] };
        if (!Array.isArray(cart.items) || cart.items.length === 0) return res.redirect('/cart');
        const productIds = cart.items.map(i => i.productId);
        const products = await Design.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map(p => [String(p._id), p]));

        for (const item of cart.items) {
            const productId = String(item.productId);
            const product = productMap.get(productId);

            if (!product) throw new AppError('Product is missing', 404);

            const lineItem = {
                quantity: 1,
                price_data: {
                    currency: 'usd',
                    //javascript has only floating point and base 2
                    unit_amount: Math.round(Number(product.price) * 100),
                    product_data: {
                        name: product.name,
                        images: [product.images[0].showPage],
                        metadata: {
                            productId: productId,
                            size: item.size
                        }
                    }
                }
            };

            line_items.push(lineItem);
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            line_items,
            success_url: `${process.env.BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.BASE_URL}/cart`,
        });

        let amountTotal = 0;
        const orderItems = [];

        for (const item of cart.items) {
            const product = productMap.get(String(item.productId));
            if (!product) throw new AppError('Missing product for order', 404);

            // js only has base 2 and floating point
            const unitAmount = Math.round(Number(product.price) * 100);
            amountTotal += unitAmount;

            orderItems.push({
                productId: item.productId,
                name: product.name,
                size: item.size,
                price: unitAmount
            });
        }

        const order = await Order.create({
            stripeSessionId: session.id,
            ip: ip,
            user: req.user ? req.user._id : null,
            items: orderItems,
            amountTotal,
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
        const productIds = order.items.map(i => i.productId);
        const designs = await Design.find({ _id: { $in: productIds } });

        const files = [];

        for (const design of designs) {
            for (const file of design.downloadFiles) {
                const cmd = new GetObjectCommand({
                    Bucket: file.bucket,
                    Key: file.key,
                });

                const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 * 12 });

                files.push({
                    name: design.name,
                    size: design.size,
                    url,
                })
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

    return res.json({ received: true });
}