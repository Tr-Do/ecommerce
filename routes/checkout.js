const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Design = require('../models/design');
const Order = require('../models/order');

const router = express.Router();

router.post('/create-session', async (req, res, next) => {
    try {
        const line_items = [];

        const cart = req.session.cart || { items: [] };
        if (!Array.isArray(cart.items) || cart.items.length === 0) return res.redirect('/cart');
        const productIds = cart.items.map(i => i.productId);
        const products = await Design.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map(p => [String(p._id), p]));

        for (const item of cart.items) {
            const productId = String(item.productId);
            const product = productMap.get(productId);

            if (!product) {
                throw new Error('Product is missing')
            }
            const lineItem = {
                quantity: 1,
                price_data: {
                    currency: 'usd',
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
            }
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
            if (!product) throw new Error('Missing product for order');

            const unitAmount = Math.round(Number(product.price) * 100);
            amountTotal += unitAmount;

            orderItems.push({
                productId: item.productId,
                size: item.size,
                price: unitAmount
            });
        }

        const order = await Order.create({
            stripeSessionId: session.id,
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
});

router.get('/success', async (req, res, next) => {
    try {
        const lastOrderId = req.session.lastOrderId;
        if (!lastOrderId) {
            req.flash('success', 'Checkout finished.');
            return res.redirect('/products');
        }
        const order = await Order.findById(lastOrderId);
        if (order && order.paid) {
            req.session.cart = { items: [] };
            delete req.session.lastOrderId;
            req.flash('success', 'Payment completed.');
        } else req.flash('success', 'Payment processing...');
        return res.redirect('/products');
    } catch (err) {
        return next(err);
    }
});

router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const order = await Order.findOne({ stripeSessionId: session.id });

        if (!order) return res.status(404).send('Order not found');
        if (order.paid) return res.json({ received: true });
        if (session.payment_status !== 'paid') return res.status(400).send('Order not paid');

        order.paid = true;
        await order.save();
    }
    return res.json({ received: true });
}
);

module.exports = router;