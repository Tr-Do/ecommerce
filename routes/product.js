const express = require('express');
const router = express.Router();
const { AppError } = require('../utils/AppError.js');
const { productSchema, reviewSchema } = require('../schemas.js');
const { isLoggedin } = require('../middleware');
const products = require('../controllers/products');
const multer = require('multer')
const upload = multer({
    storage: multer.memoryStorage(),
    // limits 10MB/file
    limits: { fileSize: 10 * 1024 * 1024 }
});


const validateProduct = (req, res, next) => {
    const { error } = productSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',')
        throw new AppError(msg, 400);
    } else next();
};

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',')
        throw new AppError(msg, 400);
    } else next();
}

// Busboy of multer parses request stream once, file splitting is needed
const splitFiles = (req, res, next) => {
    const imageFiles = req.files?.image || [];
    const designFiles = req.files?.designFile || [];

    req.imageFiles = imageFiles;
    req.designFiles = designFiles;

    next();
};

router.route('/')
    .get(products.index)
    .post(isLoggedin,
        upload.fields([
            { name: 'image', maxCount: 10 },
            { name: 'designFile', maxCount: 5 }
        ]),
        splitFiles,
        validateProduct,
        products.createProduct
    );

router.get('/new', isLoggedin, products.renderNewForm);

router.route('/:id')
    .get(products.showProduct)
    .put(
        isLoggedin,
        upload.fields([
            { name: 'image', maxCount: 10 },
            { name: 'designFile', maxCount: 5 }
        ]),
        splitFiles,
        validateProduct,
        products.updateProduct)
    .delete(isLoggedin, products.deleteProduct);

router.get('/:id/edit', isLoggedin, products.editForm);

router.route('/:id/review', validateReview)
    .post(products.review);

module.exports = router;