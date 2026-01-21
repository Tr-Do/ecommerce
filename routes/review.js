const express = require('express');
const router = express.Router({ mergeParams: true });
const { AppError } = require('../utils/AppError')
const { reviewSchema } = require('../schemas');
const review = require('../controllers/reviews');
const Review = require('../models/review');
const Design = require('../models/design');

const validateReview = (req, res, next) => {
    const { error } = reviewSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(e => e.message).join(',')
        throw new AppError(msg, 400);
    } else next();
}

router.post('/', validateReview, review.reviewPost)

router.delete('/:reviewId', review.reviewDelete);

module.exports = router;