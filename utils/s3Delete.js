const { S3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

// all request go through object s3client -> create object then delete request
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function deleteFromS3({ bucket, key }) {
  if (!bucket || !key) return;

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

module.exports = { deleteFromS3 };
