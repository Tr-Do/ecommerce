const { PutObjectCommand } = require('@aws-sdk/client-s3'); // command to upload to S3
const { s3 } = require('../s3');
const { AppError } = require('./AppError');

function sanitizeFileName(str) {
    return String(str || '')
        .trim()
        // exclude a-z A-Z, etc character, g(replace all matches, not just one) with _
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        // get first 30 characters of file name
        .slice(0, 30);
}

// buffer: raw file data
async function uploadToS3({ buffer, contentType, originalName, prefix }) {
    // load bucket name
    const bucket = process.env.S3_BUCKET;

    if (!bucket) throw new AppError('Missing S3 bucket', 404);
    if (!process.env.AWS_REGION) throw new AppError('Missing AWS Region', 404);

    // file name format of S3
    const key = `${prefix}/${Date.now()}-${sanitizeFileName(originalName)}`;

    await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType
    }));
    return { bucket, key };
}

module.exports = { uploadToS3 };