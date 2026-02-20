const Order = require('../models/order');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../s3');
const { sendEmail } = require('../utils/mailgun');
const { buildDownloadEmail } = require('../utils/emailTemplate');
const { GetObjectCommand } = require('@aws-sdk/client-s3');

async function deliverFiles(orderId) {
    const order = await Order.findById(orderId);
    if (!order || order.payment.status !== 'paid') return;
    if (order.payment.emailSentAt || !order.email) return;

    const files = [];
    for (const item of order.items) {
        for (const file of (item.filesSnapshot || [])) {
            const cmd = new GetObjectCommand(
                {
                    Bucket: file.bucket,
                    Key: file.key
                }
            );
            const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 * 12 })
            files.push({ name: `${item.name} (${item.size})`, size: item.size, url });
        }
    }
    const html = buildDownloadEmail({ orderNumber: order.orderNumber, files });
    await sendEmail({ to: order.email, subject: `Your Terrarium Files - ${order.orderNumber}`, html });

    order.payment.emailSentAt = new Date();
    await order.save();
}

module.exports = { deliverFiles }