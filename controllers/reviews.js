const Design = require('../models/design');
const Review = require('../models/review');

module.exports.reviewPost = async (req, res) => {
    const product = await Design.findById(req.params.id)
        .populate({ path: 'reviews', populate: { path: 'author' } });

    const review = new Review(req.body.review);
    review.author = req.user._id;
    product.reviews.push(review);

    await review.save();
    await product.save();

    res.redirect(`/products/${product._id}`);
}

module.exports.reviewDelete = async (req, res) => {
    const { id, reviewId } = req.params;

    // Unlinks the review from the design
    await Design.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);

    req.flash('success', 'Review deleted');
    res.redirect(`/products/${id}`);
}