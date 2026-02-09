const fetch = require('node-fetch');
const Order = require('../models/design');

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
        body: "grant_type" = client_credentials
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Paypal token error: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data.access_token;
}

module.exports.createOrder = async (req, res) => {
    try {
        const accessToken = await getAccessToken();

        const cart = req.session.cart || { items: [] };
        if (!Array.isArray(cart.items) || cart.items.length === 0) return res.redirect('/cart');

        const productIds = cart.items.map(i => i.productId);
        const variantIds = cart.items.map(i => i.variantId)

        const products = await Design.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map(p => [String(p._id), p]));

        const variants = await Variant.find({ _id: { $in: variantIds } }).lean();
        const variantMap = new Map(variants.map(v => [String(v._id), v]));

        let amountTotal = 0;
        const orderItems = [];
        const paypalItems = [];

        for (const item of cart.items) {
            const productId = String(item.productId);
            const product = productMap.get(productId);
            if (!product) throw new AppError('Product is missing', 404);

            const variant = variantMap.get(String(item.variantId));
            if (!variant) throw new AppError(`Variant missing ${item.variantId}`, 404);

            if (String(variant.productId) !== productId) throw new AppError('Variant does not belong to product', 400);

            //javascript has only floating point and base 2
            const unitAmount = Math.round(Number(variant.price) * 100);
            amountTotal += unitAmount;

            orderItems.push({
                productId: item.productId,
                variantId: variant._id,
                name: product.name,
                size: variant.size,
                price: variant.price,
                filesSnapshot: variant.files || []
            });
            paypalItems.push({
                name: `${product.name} (${variant.size})`,
                unit_amount: {
                    currency_code: 'USD',
                    value: (unitAmount / 100).toFixed(2),
                },
                quantity: 1,
                sku: variantId,
                category: 'DIGITAL_GOODS'
            });
        }
        const totalUSD = (amountTotal / 100).toFixed(2);

        const order = await Order.create({
            ip,
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

    })
    const baseUrl = (process.env.BASE_URL || '').trim();

    if (!/^https?:\/\/[^ "]+$/i.test(baseUrl)) {
        throw new Error(`BASE_URL invalid at runtime: "${process.env.BASE_URL}"`);
    }
}
}