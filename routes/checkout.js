const express = require("express");
const checkout = require("../controllers/checkout");
const stripe = require("../controllers/checkout/stripe");
const paypal = require("../controllers/checkout/paypal");
const router = express.Router();

// stripe payment
router.post("/create-session", stripe.createSession);
router.get("/success", stripe.paymentConfirmation);

// paypal payment: create order -> return url -> capture -> finalize
router.post("/paypal/create", paypal.createPaypalOrder);
router.get("/paypal/return", paypal.paypalReturn);
router.post("/paypal/capture", paypal.capturePaypalOrder);
router.post("/paypal/finalize", paypal.paypalFinalize);

// crypto payment
router.post("/coinbase/create", checkout.createCoinbaseCharge);

module.exports = router;
