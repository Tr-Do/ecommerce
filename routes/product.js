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
            { name: 'designFile', maxCount: 5 }
        ]),
        splitFiles,
        validateProduct,
        products.createProduct
    );

router.post('/products/:id/images', upload.array('images'), async (req, res) => {
    const files = req.files || [];
    const uploaded = [];

    for (const file of files) {
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'product' },
                (err, r) => (err ? reject(err) : resolve(r))
            );
            stream.end(file.buffer);
        });
        uploaded.push({
            url: result.secure_url || result.url,
            filename: result.public_id
        });
    }
    res.json({ images: uploaded });
});

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