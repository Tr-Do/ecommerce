const Product = require('../models/product.js');
const { throwError } = require('../utils/AppError.js');

module.exports.index = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const products = await Product.find({})
        .skip(skip)
        .limit(limit);
    const totalProducts = await Product.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);
    res.render('home', { products, currentPage: page, totalPages });
}

module.exports.renderNewForm = (req, res) => {
    res.render('products/new');
}

module.exports.createProduct = async (req, res) => {
    const product = new Product(req.body.product);
    await product.save();
    req.flash('success', 'Add product sucessfully');
    res.redirect(`/products/${product._id}`);
}

module.exports.showProduct = async (req, res) => {
    const products = await Product.findById(req.params.id);
    throwError(products);
    res.render('products/show', { products });
}

module.exports.editForm = async (req, res) => {
    const products = await Product.findById(req.params.id);
    throwError(products);
    res.render('products/edit', { products });
}

module.exports.updateProduct = async (req, res) => {
    const { id } = req.params;
    const products = await Product.findByIdAndUpdate(id, { ...req.body.product });
    throwError(products);
    req.flash('success', 'Update product sucessfully');
    res.redirect(`/products/${products._id}`);
}

module.exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    const products = await Product.findByIdAndDelete(id);
    throwError(products);
    req.flash('success', 'Delete product sucessfully');
    res.redirect('/');
}