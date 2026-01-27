const express = require('express');
const router = express.Router();
const { requireLogin, isAdmin, validateProduct, splitFiles } = require('../middleware');
const products = require('../controllers/products');
const multer = require('multer')
const upload = multer({
    storage: multer.memoryStorage(),
    // limits 10MB/file
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.route('/')
    .get(products.index)
    .post(requireLogin,
        isAdmin,
        upload.fields([
            { name: 'image', maxCount: 10 },
            { name: 'designFileStandard', maxCount: 4 },
            { name: 'designFileS', maxCount: 3 },
            { name: 'designFileM', maxCount: 3 },
            { name: 'designFileX', maxCount: 3 },
            { name: 'designFileXL', maxCount: 3 },
        ]),
        splitFiles,
        validateProduct,
        products.createProduct
    );

router.get('/new', requireLogin, isAdmin, products.renderNewForm);

router.route('/:id')
    .get(products.showProduct)
    .put(
        requireLogin,
        isAdmin,
        upload.fields([
            { name: 'image', maxCount: 10 },
            { name: 'designFile', maxCount: 5 }
        ]),
        splitFiles,
        validateProduct,
        products.updateProduct)
    .delete(requireLogin, isAdmin, products.deleteProduct);

router.get('/:id/edit', requireLogin, isAdmin, products.editForm);

module.exports = router;