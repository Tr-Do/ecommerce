const Order = require('../models/order');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../s3');

module.exports.status = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const order = await Order.findOne({ stripeSessionId: sessionId });
        if (!order) return res.status(404).json({ paid: false });

        res.json({ paid: order.paid });

    } catch (e) {
        res.status(500).json({ paid: false })
    }
};

module.exports.getFiles = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const order = await Order.findOne({ stripeSessionId: sessionId }).lean();
        if (!order || !order.paid) return res.status(403).json({ error: 'Not paid' });

        const files = [];

        for (const item of (order.items || [])) {
            for (const file of (item.filesSnapshot || [])) {
                const cmd = new GetObjectCommand({
                    Bucket: file.bucket,
                    Key: file.key
                });
                // expires in 12 hours
                const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 * 12 });

                files.push({
                    name: `${item.name} (${item.size})`,
                    size: item.size,
                    url
                });
            }
        }
        res.json(files);

    } catch (e) {
        res.status(500).json({ error: 'error' });
    }
}