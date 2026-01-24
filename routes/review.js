const express = require('express');
const router = express.Router({ mergeParams: true });
const reviews = require('../controllers/reviews');
const { isLoggedin, isAuthorOrAdmin, validateReview } = require('../middleware');

router.post('/', isLoggedin, validateReview, reviews.reviewPost)

router.delete('/:reviewId', isLoggedin, isAuthorOrAdmin, reviews.reviewDelete);

module.exports = router;