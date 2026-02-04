const Design = require('../models/design');
const { throwError } = require('../utils/AppError');
const cloudinary = require('../cloudinary');
const { uploadToS3 } = require('../utils/s3Upload');
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
            originalName: file.originalname,
            contentType: file.mimetype,
            size: file.size
        });
    }
    return out;
};

module.exports.index = async (req, res, next) => {
    try {

        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        const pageRaw = Number(req.query.page);
        const currentPage = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;

        const limit = 8;
        const skip = (currentPage - 1) * limit;

        const filter = search ? { name: { $regex: search, $options: 'i' } } : {};

        const [products, total] = await Promise.all([
            Design
                .find(filter)
                .sort({ _id: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Design.countDocuments(filter)
        ])

        const totalPages = Math.max(Math.ceil(total / limit), 1);

        res.render('index', { products, currentPage, totalPages, search });
    } catch (err) {
        next(err);
    }
};

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

    // Arrange image order
    let order = req.body.product?.imageOrder; // after your split() this is an array
    if (typeof order === 'string') order = order.split(',').filter(Boolean);
    if (Array.isArray(order) && order.length) {
        const byFilename = new Map(product.images.map(img => [img.filename, img]));

        const ordered = order
            .map(fn => byFilename.get(fn))
            .filter(Boolean);

        const orderedSet = new Set(order);
        const remaining = product.images.filter(img => !orderedSet.has(img.filename));

        product.images = [...ordered, ...remaining];
    }

    const prefix = `products/${product._id}`;

    const sizesRaw = req.body.product?.size;
    const sizes = Array.isArray(sizesRaw) ? sizesRaw : (sizesRaw ? [sizesRaw] : ['Standard']);

    const hasStandard = sizes.includes('Standard');
    const nonStandardSizes = sizes.filter(s => s !== 'Standard');

    if (sizes.length === 0) throw new Error('Select at least one size');

    if (hasStandard && nonStandardSizes.length > 0) {
        throw new Error('Do not mix standard size with others');
    }

    await product.save();

    if (hasStandard) {
        const standardFiles = await mkS3Files(req.designFilesByField?.designFileStandard, prefix);
        if (!standardFiles.length) throw new Error('Standard variant files are required');

        await Variant.create({
            productId: product._id,
            size: 'Standard',
            price: product.price,
            files: standardFiles
        });

        req.flash('success', 'Add product sucessfully');
        return res.redirect(`/products/${product._id}`);
    }

    for (const size of nonStandardSizes) {
        const fileName = `designFile${size}`;
        const files = await mkS3Files(req.designFilesByField?.[fileName], prefix);

        if (!files.length) throw new Error(`Missing upload files for ${size}`);

        await Variant.create({
            productId: product._id,
            size,
            price: product.price,
            files
        })
    };

    req.flash('success', 'Add product sucessfully');
    res.redirect(`/products/${product._id}`);
};

module.exports.showProduct = async (req, res) => {
    const product = await Design.findById(req.params.id)
        .populate({
            path: 'reviews',
            populate: { path: 'author' }
        });

    const usernames = product.reviews
        .map(review => review.author?.username)
        .filter(Boolean);

    const variants = await Variant.find({ productId: product._id }).lean();

    res.render('products/show', { product, usernames, variants });
};

module.exports.editForm = async (req, res) => {
    const { id } = req.params;
    const product = await Design.findById(req.params.id);
    const variants = await Variant.find({ productId: id }).lean();
    throwError(product);
    res.render('products/edit', { product, variants });
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

    const prefix = `products/${product._id}`;

    const standardFiles = await mkS3Files(req.designFilesByField?.designFileStandard, prefix);
    if (standardFiles.length) {

        let price;
        if (req.body.product && req.body.product.price !== undefined && req.body.product.price !== null) {
            price = req.body.product.price;
        } else price = product.price;

        await Variant.findOneAndUpdate(
            {
                productId: product._id,
                size: 'Standard'
            },
            {
                $set: {
                    productId: product._id,
                    size: 'Standard',
                    price,
                    files: standardFiles,
                }
            },
            { upsert: true, new: true }
        );
    }

    const sizesRaw = req.body.product?.size;
    // if no box is checked, default is Standard
    const sizes = Array.isArray(sizesRaw) ? sizesRaw : (sizesRaw ? [sizesRaw] : ['Standard']);

    const hasStandard = sizes.includes('Standard');
    const nonStandardSizes = sizes.filter(s => s !== 'Standard');

    if (hasStandard && nonStandardSizes.length > 0) throw new Error('Do not mix standard size with others');

    for (const size of sizes) {
        if (size === 'Standard') continue;
        const fieldName = `designFile${size}`;
        const uploaded = await mkS3Files(req.designFilesByField?.[fieldName], prefix);

        if (!uploaded.length) continue;

        let price;
        if (req.body.product && req.body.product.price !== undefined && req.body.product.price !== null) {
            price = req.body.product.price;
        } else price = product.price;

        await Variant.findOneAndUpdate(
            {
                productId: product._id,
                size
            },
            {
                $set: {
                    productId: product._id,
                    size,
                    price,
                    files: uploaded
                }
            },
            { upsert: true, new: true }
        );
    }

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

    // arrange image order
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