const cloudinaryV2 = require('cloudinary').v2;
const CloudinaryStorage = require('multer-storage-cloudinary');


cloudinaryV2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
})

const storage = new CloudinaryStorage({
    cloudinary: { v2: cloudinaryV2 },
    params: {
        folder: 'Terrarium',
        allowed_formats: ['jpeg', 'png', 'jpg', 'webp']
    }
});

module.exports = {
    cloudinaryV2,
    storage
}