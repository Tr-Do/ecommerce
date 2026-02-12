const Order = require('../models/order');
const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../s3');

module.exports.status = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const order = await Order.findOne({ 'payment.stripeSessionId': sessionId });
        if (!order) return res.status(404).json({ paid: false });

        const paid = order.payment?.status === 'paid';
        res.json({ paid });

    } catch (e) {
        res.status(500).json({ paid: false })
    }
};

module.exports.getFiles = async (req, res, next) => {
    try {
        const { sessionId } = req.params;

        const order = await Order.findOne({ 'payment.stripeSessionId': sessionId }).lean();
        if (!order || order.payment?.status !== 'paid') return res.status(403).json({ error: 'Not paid' });

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

module.exports.statusByOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).lean();
        if (!order) return res.status(404).json({ paid: false });

        const paid = order.payment?.status === 'paid';
        return res.json({ paid });
    }
    catch (e) {
        return res.status(500).json({ paid: false });
    }
}

module.exports.getFilesByOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).lean();
        if (!order || order.payment?.status !== 'paid')
            return res.status(403).json({ error: 'Not paid' });

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