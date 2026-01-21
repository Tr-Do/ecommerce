const Design = require('../models/design');
const Review = require('../models/review');

module.exports.reviewPost = async (req, res) => {
    const product = await Design.findById(req.params.id);
    const review = new Review(req.body.review);
    product.reviews.push(review);
    await review.save();
    await product.save();
    res.redirect(`/products/${product._id}`);
}

module.exports.reviewDelete = async (req, res) => {
    const { id, reviewId } = req.params;
    await Design.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findOneAndDelete(reviewId);
    res.redirect(`/products/${id}`);
}

module.exports.reviewPost = async (req, res) => {
    const product = await Design.findById(req.params.id);
    const review = new Review(req.body.review);
    product.reviews.push(review);
    await review.save();
    await product.save();
    res.redirect(`/products/${product._id}`);
}
