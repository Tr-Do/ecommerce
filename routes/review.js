const express = require('express');
const router = express.Router({ mergeParams: true });
const reviews = require('../controllers/reviews');
const { requireLogin, isAuthorOrAdmin, validateReview } = require('../middleware');

router.post('/', requireLogin, validateReview, reviews.reviewPost)

router.delete('/:reviewId', requireLogin, isAuthorOrAdmin, reviews.reviewDelete);

module.exports = router;