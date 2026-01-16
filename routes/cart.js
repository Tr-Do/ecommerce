const express = require('express');
const router = express.Router();
const Design = require('../models/design');
const cart = require('../controllers/cart');

router.route('/')
    .post(cart.addToCart)
    .get(cart.renderCart);

router.post('/remove', cart.removeProduct);

module.exports = router;