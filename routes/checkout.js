const express = require('express');
const checkout = require('../controllers/checkout');
const router = express.Router();

router.post('/create-session', checkout.createSession);

router.get('/success', checkout.paymentConfirmation);

router.post('/paypal/create', checkout.createPaypalOrder);

router.post('/paypal/capture', checkout.capturePaypalOrder);

router.post('/paypal/finalize', checkout.paypalFinalize);

router.get('/paypal/return', checkout.paypalReturn);

module.exports = router;