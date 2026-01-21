const express = require('express');
const router = express.Router();
const Order = require('../models/order');
const Design = require('../models/design');
const { AppError } = require('../utils/AppError');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../s3');

// check and assign order status
router.get('/session/:sessionId/status', async (req, res, next) => {
    try {
        const { sessionId } = req.params;
        const order = await Order.findOne({ stripeSessionId: sessionId });
        // change undefined value to false
        res.json({ paid: !!order?.paid });
    } catch (e) { next(e) };
});

// issue download link upon payment confirmation
router.get('/session/:sessionId/files', async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const order = await Order.findOne({ stripeSessionId: sessionId });
        if (!order) throw new AppError('Order not found', 404);
        if (!order.paid) throw new AppError('Payment not confirmed', 403);

        const productIds = order.items.map(i => i.productId);
        const designs = await Design.find({ _id: { $in: productIds } });

        const files = [];
        for (const design of designs) {
            for (const file of design.downloadFiles) {
                const cmd = new GetObjectCommand({ Bucket: file.bucket, Key: file.key });
                // expires in 12 hours
                const url = await getSignedUrl(s3, cmd, { expires: 60 * 60 * 12 });

                files.push({
                    name: design.name,
                    size: design.size,
                    url
                });
            }
        }

        res.json({ files });
    } catch (e) { next(e); }
});

module.exports = router;