const express = require('express');
const router = express.Router();
const { requireLogin, isAdmin } = require('../middleware');
const admin = require('../controllers/admin');

router.get('/orderView', requireLogin, isAdmin, admin.orderView);

router.get(`/orders/:orderNumber`, requireLogin, isAdmin, admin.orderDetail);

module.exports = router;