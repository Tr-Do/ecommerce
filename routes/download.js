const express = require('express');
const router = express.Router();
const downloads = require('../controllers/downloads');

// check and assign order status
router.get('/session/:sessionId/status', downloads.status);
// issue download link upon payment confirmation
router.get('/session/:sessionId/files', downloads.getFiles);

router.get('/order/:orderId/status', downloads.statusByOrder);
router.get('/order/:orderId/files', downloads.getFilesByOrder);

module.exports = router;