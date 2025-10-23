const stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession(product) {
    return await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
            price_data: {
                currency: 'usd',
                product_data: {
                    name: product.title,
                    description: product.description,
                },
                unit_amount: Math.round(Number(product.price) * 100),
            },
            quantity: 1,
        }],
        success_url: `${process.env.CLIENT_URL}/success`,
        cancel_url: `${process.env.CLIENT_URL}/cancel`,
    });
}
module.exports = { createCheckoutSession };