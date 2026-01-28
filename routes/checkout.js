const express = require('express');
const checkout = require('../controllers/checkout');
const router = express.Router();

router.post('/create-session', checkout.createSession);

router.get('/success', checkout.paymentConfirmation);

module.exports = router;