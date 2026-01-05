const express = require('express');
const router = express.Router();
const { throwError, AppError } = require('../utils/AppError.js');
const { productSchema } = require('../schemas.js');
const Design = require('../models/design');
const { isLoggedin } = require('../middleware');
const designs = require('../controllers/designs');

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

router.get('/new', isLoggedin, designs.renderNewForm);

router.post('', validateProduct, designs.createDesign);

router.get('/:id', designs.showDesign);

router.get('/:id/edit', isLoggedin, designs.editForm);

router.put('/:id', isLoggedin, validateProduct, designs.updateDesign);

router.delete('/:id', isLoggedin, designs.deleteDesign);

module.exports = router;