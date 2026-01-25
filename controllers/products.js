const Design = require('../models/design');
const { throwError } = require('../utils/AppError');
const cloudinary = require('../cloudinary');
const { uploadToS3 } = require('../utils/s3Upload');
const User = require('../models/user');

module.exports.index = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = 8;
    const skip = (page - 1) * limit;
    const products = await Design.find({})
        .lean()
        .skip(skip)
        .limit(limit);
    const totalProducts = await Design.countDocuments();
    const totalPages = Math.ceil(totalProducts / limit);

    res.render('index', { products, currentPage: page, totalPages });
}

module.exports.renderNewForm = (req, res) => {
    res.render('products/new');
}

module.exports.createProduct = async (req, res) => {
    const product = new Design(req.body.product);

    // upload images to cloudinary
    const imageUploads = req.imageFiles || [];
    const cloudinaryImages = [];

    for (const file of imageUploads) {
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                { folder: 'product' },
                (error, result) => (error ? reject(error) : resolve(result))
            );
            stream.end(file.buffer);
        });
        cloudinaryImages.push(result);
    }
    product.images = cloudinaryImages.map(f => ({
        url: f.secure_url || f.url,
        filename: f.public_id
    }));

    // upload design fies to s3
    const designUploads = req.designFiles || [];
    for (const file of designUploads) {
        const { bucket, key } = await uploadToS3({
            buffer: file.buffer,
            contentType: file.mimetype,
            originalName: file.originalname,
            prefix: `products/${product.id}`
        });

        product.downloadFiles.push({
            bucket,
            key,
            originalName: file.originalname,
            contentType: file.mimetype,
            size: file.size
        });
    }

    await product.save();
    req.flash('success', 'Add product sucessfully');
    res.redirect(`/products/${product._id}`);
};

module.exports.showProduct = async (req, res) => {
    const product = await Design.findById(req.params.id)
        .populate({ path: 'reviews', populate: { path: 'author' } });
    const usernames = product.reviews
        .map(review => review.author?.username)
        .filter(Boolean);
    throwError(product);
    res.render('products/show', { product, usernames });
};

module.exports.editForm = async (req, res) => {
    const product = await Design.findById(req.params.id);
    throwError(product);
    res.render('products/edit', { product });
};

module.exports.updateProduct = async (req, res) => {
    const { id } = req.params;

    const product = await Design.findByIdAndUpdate(
        id,
        { ...req.body.product },
        { new: true, runValidators: true }
    );

    if (!product) {
        req.flash('error', 'Product not found');
        return res.redirect('/products');
    };

    // preupload images for display before submitting the form
    const preUploaded = req.body.preUploadedImages;
    let imagesArray = [];

    if (preUploaded) {
        if (Array.isArray(preUploaded)) {
            imagesArray = preUploaded;
        } else imagesArray.push(preUploaded);
    };

    for (const s of imagesArray) {
        const parsedImages = JSON.parse(s);
        product.images.push(parsedImages);
    };

    const imgs = (req.cloudinaryImages || []).map(f => {
        const url = f.secureurl || f.url;
        const filename = f.public_id;
        if (!url) throw new Error('No url found');
        return { url, filename };
    });

    product.images.push(...imgs);

    await product.save();

    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
        }
        await product.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
    }

    req.flash('success', 'Update product sucessfully');
    res.redirect(`/products/${product._id}`);
};

module.exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    const product = await Design.findByIdAndDelete(id);

    throwError(product);

    req.flash('success', 'Delete product sucessfully');
    res.redirect('/products');
};