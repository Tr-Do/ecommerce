const express = require('express');
const router = express.Router();
const { throwError, AppError } = require('../utils/AppError.js');
const { productSchema } = require('../schemas.js');
const Design = require('../models/design');

const validateProduct = (req, res, next) => {
    const { error } = productSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',')
        throw new AppError(msg, 400);
    }
    else {
        next();
    }
}

router.get('/new', (req, res) => {
    if (!req.isAuthenticated()) {
        req.flash('error', 'You must log in');
        return res.redirect('/login');
    }
    res.render('designs/new');
})

router.post('', validateProduct, async (req, res) => {
    const product = new Design(req.body.product);
    await product.save();
    req.flash('success', 'Add product sucessfully');
    res.redirect(`/product/${product._id}`);
})

router.get('/:id', async (req, res) => {
    const product = await Design.findById(req.params.id);
    throwError(product);
    res.render('designs/show', { product });
})

router.get('/:id/edit', async (req, res) => {
    const product = await Design.findById(req.params.id);
    throwError(product);
    res.render('designs/edit', { product });
})

router.put('/:id', validateProduct, async (req, res) => {
    const { id } = req.params;
    const product = await Design.findByIdAndUpdate(id, { ...req.body.product });
    throwError(product);
    req.flash('success', 'Update product sucessfully');
    res.redirect(`/product/${product._id}`);
})

router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const product = await Design.findByIdAndDelete(id);
    throwError(product);
    req.flash('success', 'Delete product sucessfully');
    res.redirect('/');
})

module.exports = router;