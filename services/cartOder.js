const { AppError } = require('../utils/AppError.js');
const Variant = require('../models/variant.js');
const Design = require('../models/design');

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

        //javascript has only floating point and base 2, need to work around to get value of decimal
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

module.exports = { buildCartOrder }