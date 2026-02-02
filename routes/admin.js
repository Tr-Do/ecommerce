const express = require('express');
const router = express.Router();
const { requireLogin, isAdmin } = require('../middleware');
const admin = require('../controllers/admin');

router.get('/orderOverview', requireLogin, isAdmin, admin.orderOverview);

router.get(`/orders/:orderNumber`, requireLogin, isAdmin, admin.orderDetail);

router.get('/userOverview', requireLogin, isAdmin, admin.userOverview);

router.get('/dashboard', requireLogin, isAdmin, admin.dashboard);

router.post('/userOverview/:userId', requireLogin, isAdmin, admin.deleteUser);

module.exports = router;