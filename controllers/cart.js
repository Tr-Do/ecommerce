const Design = require('../models/design');


module.exports.addToCart = (req, res) => {
    const { size, productId } = req.body;
    if (!productId || !size) return res.status(400).send('Invalid cart data');
    if (!req.session.cart) req.session.cart = { items: [] };
    const cart = req.session.cart.items;
    const currentItem = cart.find(item => item.productId === productId && item.size === size);
    if (currentItem) {
        req.flash('error', 'Product is already in cart');
        return res.redirect(`/products/${productId}`);
    }
    cart.push({ productId, size });
    res.redirect('/cart');
}

module.exports.removeProduct = async (req, res) => {
    const { productId, size } = req.body;
    if (!req.session.cart || !req.session.cart.items) return res.redirect('/cart');

    const items = req.session.cart.items;
    const updatedItems = [];
    for (const item of items) {
        if (item.productId !== productId || item.size !== size) {
            updatedItems.push(item);
        }
    }
    req.session.cart.items = updatedItems;
    res.redirect('/cart');
}

module.exports.renderCart = async (req, res) => {
    const cart = req.session.cart || { items: [] };
    const productIds = cart.items.map(i => i.productId);
    const products = await Design.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map(p => [String(p._id), p]));
    const item = cart.items.map(i => ({ ...i, product: productMap.get(String(i.productId)) }));
    res.render('cart/index', { cart: { items: item } });
}