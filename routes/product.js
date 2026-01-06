const express = require('express');
const router = express.Router();
const { throwError, AppError } = require('../utils/AppError.js');
const { productSchema } = require('../schemas.js');
const Product = require('../models/product.js');
const { isLoggedin } = require('../middleware.js');
const products = require('../controllers/products.js');

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

router.get('/new', isLoggedin, products.renderNewForm);

router.post('', validateProduct, products.createProduct);

router.get('/:id', products.showProduct);

router.get('/:id/edit', isLoggedin, products.editForm);

router.put('/:id', isLoggedin, validateProduct, products.updateProduct);

router.delete('/:id', isLoggedin, products.deleteProduct);

module.exports = router;