const express = require('express');
const router = express.Router();
const { AppError } = require('../utils/AppError.js');
const { productSchema } = require('../schemas.js');
const { isLoggedin } = require('../middleware');
const products = require('../controllers/products');
const multer = require('multer')
const { storage } = require('../cloudinary');
const uploadImages = multer({ storage });
const uploadFiles = multer({
    storage: multer.memoryStorage(),
    // limits 10MB/file
    limits: { fileSize: 10 * 1024 * 1024 }
});


const validateProduct = (req, res, next) => {
    const { error } = productSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',')
        throw new AppError(msg, 400);
    }
    else next();
}

router.route('/')
    .get(products.index)
    .post(
        uploadImages.array('image'),

        (req, res, next) => {
            req.cloudinaryImages = req.files || [];
            // empty req body for multer to get design files
            req.files = [];
            next();
        },
        uploadFiles.array('designFile'),
        validateProduct,
        products.createProduct
    );

router.get('/new', isLoggedin, products.renderNewForm);

router.route('/:id')
    .get(products.showProduct)
    .put(
        isLoggedin,
        uploadImages.array('image'),
        (req, res, next) => {
            req.cloudinaryImages = req.files || [];
            // empty req body for multer to get design files
            req.files = [];
            next();
        },
        uploadFiles.array('designFile'),
        validateProduct,
        products.updateProduct)
    .delete(isLoggedin, products.deleteProduct);

router.get('/:id/edit', isLoggedin, products.editForm);

module.exports = router;