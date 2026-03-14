const express = require("express");
const router = express.Router({ mergeParams: true });
const refund = require("../controllers/refund");
const { requireLogin, isAdmin } = require("../middleware");

router.post("/", requireLogin, isAdmin, refund.stripeRefund);
router.post("/", requireLogin, isAdmin, refund.paypalRefund);

module.exports = router;
