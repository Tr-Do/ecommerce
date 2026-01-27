const Design = require('../models/design');
const { throwError } = require('../utils/AppError');
const cloudinary = require('../cloudinary');
const { uploadToS3 } = require('../utils/s3Upload');
const User = require('../models/user');
const Variant = require('../models/variant');

const mkS3Files = async (files, prefix) => {
    const out = [];
    for (const file of (files || [])) {
        const { bucket, key } = await uploadToS3({
            buffer: file.buffer,
            contentType: file.mimetype,
            originalName: file.originalname,
            prefix
        });

        out.push({
            bucket,
            key,
            originalName: file.original.name,
            contentType: file.mimetype,
            size: file.size
        });
    }
    return out;
};

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
    if (!product) throwError(product);

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

    const prefix = `products/${product._id}`;
    const standardFiles = await mkS3Files(req.designFileByField.designFileStandard, prefix);
    await Variant.create({
        productId: product._id,
        size: 'Standard',
        price: product.price,
        files: standardFiles
    });

    const sizes = Array.isArray(req.body.product?.size) ? req.body.product.size : [];
    for (const size of sizes) {
        const fieldName = `designFile${size}`;
        const files = await mkS3Files(req.designFilesByField[fieldName], prefix);

        await Variant.create({
            productId: product._id,
            size: size,
            price: product.price,
            files
        });
    }

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

    if (req.body.product?.imageOrder && typeof req.body.product.imageOrder === "string") {
        req.body.product.imageOrder = req.body.product.imageOrder
            .split(",")
            .filter(Boolean);
    }

    const product = await Design.findByIdAndUpdate(
        id,
        { ...req.body.product },
        { new: true, runValidators: true }
    );

    if (!product) {
        req.flash('error', 'Product not found');
        return res.redirect('/products');
    };

    // image upload logic
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
    const imgs = cloudinaryImages.map(f => {
        const url = f.secure_url || f.url;
        const filename = f.public_id;
        if (!url) throw new Error('No url found');
        return { url, filename };
    });
    product.images.push(...imgs);

    // delete images in deleteImage array
    let deleteImages = [];
    if (req.body.deleteImages) {
        if (Array.isArray(req.body.deleteImages)) {
            deleteImages = req.body.deleteImages;
        } else {
            deleteImages = [req.body.deleteImages];
        }
    }
    for (const filename of deleteImages) {
        await cloudinary.uploader.destroy(filename);
    }

    // loop through product[image] array because it hasn't been saved
    const keptImages = [];
    for (let i = 0; i < product.images.length; i++) {
        const img = product.images[i];
        if (!deleteImages.includes(img.filename)) keptImages.push(img);
    }

    product.images = keptImages;
    const order = req.body.product?.imageOrder; // after your split() this is an array
    if (Array.isArray(order) && order.length) {
        const byFilename = new Map(product.images.map(img => [img.filename, img]));

        const ordered = order
            .map(fn => byFilename.get(fn))
            .filter(Boolean);

        // Append any remaining images not listed in order (e.g., newly uploaded ones)
        const orderedSet = new Set(order);
        const remaining = product.images.filter(img => !orderedSet.has(img.filename));

        product.images = [...ordered, ...remaining];
    }

    await product.save();

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