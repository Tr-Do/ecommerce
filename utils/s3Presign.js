const { GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3 } = require('../s3');

async function presignDownload({ bucket, key, expiresInSeconds = 60 * 60 * 12 }) {
    const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
    return await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
}

module.exports = { presignDownload };