const express = require('express');
const router = express.Router();
const { isLoggedin, validateProduct, splitFiles } = require('../middleware');
const products = require('../controllers/products');
const multer = require('multer')
const upload = multer({
    storage: multer.memoryStorage(),
    // limits 10MB/file
    limits: { fileSize: 10 * 1024 * 1024 }
});

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

module.exports = router;