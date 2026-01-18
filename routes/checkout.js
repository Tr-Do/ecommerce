const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Design = require('../models/design');

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
        return res.redirect(303, session.url);
    } catch (err) {
        return next(err);
    }
});

router.get('/success', (req, res) => {
    req.session.cart = { items: [] };
    req.flash('success', 'Payment completed.');
    res.redirect('/products');
})

module.exports = router;