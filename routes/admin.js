const express = require('express');
const router = express.Router();
const { requireLogin, isAdmin } = require('../middleware');
const admin = require('../controllers/admin');

router.get('/adminView', requireLogin, isAdmin, admin.renderView);

router.get(`/{orderNumber}`, requireLogin, isAdmin, admin.orderDetail);

module.exports = router;