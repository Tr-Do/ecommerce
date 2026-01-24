const Review = require('./models/review');
const { productSchema, reviewSchema, userSchema } = require('./schemas.js');
const { AppError } = require('./utils/AppError');
const User = require('./models/user.js');

// Busboy of multer parses request stream once, file splitting is needed
module.exports.splitFiles = (req, res, next) => {
    const imageFiles = req.files?.image || [];
    const designFiles = req.files?.designFile || [];
    req.imageFiles = imageFiles;
    req.designFiles = designFiles;

    next();
};

module.exports.validateProduct = (req, res, next) => {
    const { error } = productSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',');
        throw new AppError(msg, 400);
    } else next();
};

module.exports.validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',');
        throw new AppError(msg, 400);
    } else next();
};

module.exports.validateUser = (req, res, next) => {
    const { error } = userSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',');
        throw new AppError(msg, 400);
    } else next();
};

module.exports.requireGuest = (req, res, next) => {
    if (req.isAuthenticated()) {
        req.flash('error', 'You already logged in');
        return res.redirect(req.session.returnTo || req.headers.referer || '/');
    }

    next();
};

module.exports.requireLogin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl;

        req.flash('error', 'You must log in first');
        return res.redirect('/login');
    }

    next();
};

module.exports.isAuthorOrAdmin = async (req, res, next) => {
    const { id, reviewId } = req.params;

    const review = await Review.findById(reviewId);
    if (!review) {
        req.flash('error', 'Review not found');
        return res.redirect(`/products/${id}`);
    }

    if ((review.author && review.author.equals(req.user._id)) || req.user.role === 'admin') return next();

    req.flash('error', 'Unauthorized');
    return res.redirect(`/products/${id}`)
};

module.exports.isAdmin = (req, res, next) => {
    if (req.isAuthenticated()) return res.status(401).send('Unauthenticated');

    if (req.user.role !== 'admin') return res.status(403).send('Forbidden');

    next();
};

module.exports.previousPage = (req, res, next) => {
    const rt = req.query.returnTo;
    if (rt) req.session.returnTo = rt;

    next();
};