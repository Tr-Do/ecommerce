const Order = require("../models/order");
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { getAccessToken } = require("../services/getAccessToken");

module.exports.stripeRefund = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);

    if (!order) {
      req.flash("error", "Order not found");
      return res.redirect("/admin/orderOverview");
    }

    if (order.payment?.provider !== "stripe") {
      req.flash("error", "This order was not paid with Stripe");
      return res.redirect("/admin/orderOverview");
    }

    if (order.payment?.status !== "paid") {
      req.flash("error", "Only paid order can be refunded");
      return res.redirect("/admin/orderOverview");
    }

    if (!order.payment?.paymentIntentId) {
      req.flash("error", "Missing Stripe payment intent ID");
      return res.redirect("/admin/orderOverview");
    }

    const refund = await stripe.refunds.create({
      payment_intent: order.payment.paymentIntentId,
    });

    order.payment.status = "refund_requested";
    order.payment.refundId = refund.id;
    order.payment.refundStatus = refund.status;
    await order.save();

    req.flash("success", "Refund successfully");
    return res.redirect("/admin/orderOverview");
  } catch (err) {
    next(err);
  }
};
