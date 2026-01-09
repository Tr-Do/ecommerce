const express = require('express');
const router = express.Router();
const { AppError } = require('../utils/AppError.js');
const { productSchema } = require('../schemas.js');
const { isLoggedin } = require('../middleware');
const products = require('../controllers/products');
const multer = require('multer')
const { storage } = require('../cloudinary');
const upload = multer({ storage })


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

router.route('/')
    .get(products.index)
    .post(upload.array('image'), validateProduct, products.createProduct);

router.get('/new', isLoggedin, products.renderNewForm);

router.route('/:id')
    .get(products.showProduct)
    .put(isLoggedin, upload.array('image'), validateProduct, products.updateProduct)
    .delete(isLoggedin, products.deleteProduct);

router.get('/:id/edit', isLoggedin, products.editForm);

module.exports = router;