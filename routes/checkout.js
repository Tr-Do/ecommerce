const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Design = require('../models/design');
const Order = require('../models/order');
const checkout = require('../controllers/checkout');

const router = express.Router();

router.post('/create-session', checkout.createSession);

router.get('/success', checkout.paymentConfirmation);

router.post('/webhook', express.raw({ type: 'application/json' }), checkout.webhook);

module.exports = router;