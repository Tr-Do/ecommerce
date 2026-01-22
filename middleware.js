const Review = require('./models/review');
const { productSchema, reviewSchema } = require('./schemas.js');
const { AppError } = require('./utils/AppError')

module.exports.isLoggedin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;
        req.flash('error', 'You must log in first');
        return res.redirect('/login');
    }

    next();
};

module.exports.isAuthor = async (req, res, next) => {
    const { id, reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
        req.flash('error', 'Review not found');
        return res.redirect(`/products/${id}`);
    }

    if (review.author && review.author.equals(req.user._id)) return next();

    req.flash('error', 'Unauthorized');
    return res.redirect(`/products/${id}`)
};

module.exports.validateProduct = (req, res, next) => {
    const { error } = productSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',')
        throw new AppError(msg, 400);
    } else next();
};

// Busboy of multer parses request stream once, file splitting is needed
module.exports.splitFiles = (req, res, next) => {
    const imageFiles = req.files?.image || [];
    const designFiles = req.files?.designFile || [];
    req.imageFiles = imageFiles;
    req.designFiles = designFiles;

    next();
};

module.exports.validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',')
        throw new AppError(msg, 400);
    } else next();
};