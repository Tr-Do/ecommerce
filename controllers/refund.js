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

module.exports.paypalRefund = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId);

    if (!order) {
      req.flash("error", "Order not found");
      return res.redirect("/admin/orderOverview");
    }
    if (order.payment?.provider !== "paypal") {
      req.flash("error", "This order was not paid with Paypal");
      return res.redirect("/admin/orderOverview");
    }

    if (order.payment?.status !== "paid") {
      req.flash("error", "Only paid order can be refunded");
      return res.redirect("/admin/orderOverview");
    }

    if (!order.payment?.paypalCaptureId) {
      req.flash("error", "Missing Paypal capture ID");
      return res.redirect("/admin/orderOverview");
    }

    const accessToken = await getAccessToken();

    const response = await fetch(
      `${process.env.PAYPAL_BASE_URL}/v2/payments/captures/${order.payment.paypalCaptureId}/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
          "Paypal-Request-Id": `refund-${order._id}-${Date.now()}`,
        },
        body: JSON.stringify({}),
      },
    );
    const data = await response.json();

    if (!response.ok) throw new Error(data?.message || "Paypal refund failed");

    order.payment.status = "refund_requested";
    order.payment.refundId = data.id;
    order.payment.refundStatus = data.status;
    await order.save();

    req.flash("success", "Refund successfully");
    return res.redirect("/admin/orderOverview");
  } catch (err) {
    next(err);
  }
};
