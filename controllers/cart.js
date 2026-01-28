const Design = require('../models/design');
const Variant = require('../models/variant');
const { throwError } = require('../middleware');

module.exports.addToCart = async (req, res) => {
    const { productId, variantId } = req.body;
    if (!productId || !variantId) {
        return res.status(400).json({ error: 'Invalid cart data', body: req.body });
    }

    // enforece productID and size must be present
    if (!productId || !variantId) return res.status(400).send('Invalid cart data');

    // if there is no cart, initialize an empty one
    if (!req.session.cart) req.session.cart = { items: [] };
    const cart = req.session.cart.items;

    // prevent adding the same item to cart, comparing 2 Mongo DB object IDs
    const itemInCart = cart.find(item =>
        String(item.productId) === String(productId) &&
        String(item.variantId) === String(variantId));
    if (itemInCart) return res.status(409).json({ error: 'Item already in cart' });

    // pull information from db instead of relying on req.body
    // skip document, return js object
    const product = await Design.findById(productId).lean();
    if (!product) throwError(product);
    const variant = await Variant.findById(variantId).lean();
    if (!variant) throwError(variant);
    if (String(variant.productId) !== String(product._id)) return res.status(400).json({ error: 'Variant does not belong to product' });

    const price = variant.price;
    const size = variant.size;

    cart.push({ productId, variantId, price, size });

    return res.status(201).json({ productId, size, variantId, cartCount: cart.length });
};

module.exports.removeProduct = async (req, res) => {
    const { productId, variantId } = req.body;

    if (!req.session.cart || !req.session.cart.items) return res.status(400).json({ error: 'Cart is empty' });

    const items = req.session.cart.items;

    // create array with matched conditions
    const updatedItems = items.filter(item => !(String(item.productId) === String(productId) && String(item.variantId) === String(variantId)));

    req.session.cart.items = updatedItems;

    const cartCount = updatedItems.length;

    // calculate subtotal
    let subtotal = 0;
    for (let i = 0; i < updatedItems.length; i++) {
        subtotal += Number(updatedItems[i].price) || 0;
    }
    return res.json({ cartCount, subtotal });      // AJAX response
}

module.exports.renderCart = async (req, res) => {
    const cart = req.session.cart || { items: [] };

    const productIds = cart.items.map(i => i.productId);
    const variantIds = cart.items.map(i => i.variantId);

    // run both search in parallel, O(n) = max(t1, t2), use promise for multiple asyncs
    const [products, variants] = await Promise.all([
        Design.find({ _id: { $in: productIds } }),
        Variant.find({ _id: { $in: variantIds } }).lean()]);

    if (products.length !== productIds.length || variants.length !== variantIds.length) {
        req.session.cart.items = [];
        return res.redirect('/cart');
    }

    const productMap = new Map(products.map(p => [String(p._id), p]));
    const variantMap = new Map(variants.map(v => [String(v._id), v]));

    const items = cart.items.map(i => ({
        ...i,
        product: productMap.get(String(i.productId)),
        variant: variantMap.get(String(i.variantId))
    }));

    res.render('cart/index', { cart: { items } });
}