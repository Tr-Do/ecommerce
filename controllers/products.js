const Design = require('../models/design');
const { throwError } = require('../utils/AppError');

module.exports.index = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const products = await Design.find({})
        .skip(skip)
        .limit(limit);
    const totalProducts = await Design.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    res.render('home', { products, currentPage: page, totalPages });
}

module.exports.renderNewForm = (req, res) => {
    res.render('products/new');
}

module.exports.createProduct = async (req, res) => {
    const product = new Design(req.body.product);
    await product.save();
    req.flash('success', 'Add product sucessfully');
    res.redirect(`/products/${product._id}`);
}

module.exports.showProduct = async (req, res) => {
    const product = await Design.findById(req.params.id);
    throwError(product);
    res.render('products/show', { product });
}

module.exports.editForm = async (req, res) => {
    const product = await Design.findById(req.params.id);
    throwError(product);
    res.render('products/edit', { product });
}

module.exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const product = await Design.findByIdAndUpdate(id, { ...req.body.product });
    throwError(product);
    req.flash('success', 'Update product sucessfully');
    res.redirect(`/products/${product._id}`);
}

module.exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    const product = await Design.findByIdAndDelete(id);
    throwError(product);
    req.flash('success', 'Delete product sucessfully');
    res.redirect('/products');
}