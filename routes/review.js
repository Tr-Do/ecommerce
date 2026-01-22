const express = require('express');
const router = express.Router({ mergeParams: true });
const reviews = require('../controllers/reviews');
const { isLoggedin, isAuthor, validateReview } = require('../middleware');

router.post('/', validateReview, reviews.reviewPost)

router.delete('/:reviewId', isLoggedin, isAuthor, reviews.reviewDelete);

module.exports = router;