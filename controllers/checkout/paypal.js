const Order = require("../../models/order");
const { buildCartOrder } = require("../../services/cartOrder.js");
const { deliverFiles } = require("../../services/fileDelivery.js");
const { getAccessToken } = require("../../services/getAccessToken.js");
const { captureOrder } = require("../../services/paypalPayment.js");
const { finalizePaypal } = require("../../services/paypalFinalize.js");

module.exports.createPaypalOrder = async (req, res) => {
  try {
    const { orderItems, amountTotalCents, currency } =
      await buildCartOrder(req);

    const order = await Order.create({
      ip: req.ip,
      user: req.user?._id || null,
      items: orderItems,
      payment: {
        provider: "paypal",
        status: "pending",
        currency,
        amountTotal: amountTotalCents,
      },
      email: null,
    });

    const accessToken = await getAccessToken();
    const totalUSD = (amountTotalCents / 100).toFixed(2);

    const ppRes = await fetch(
      `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          intent: "CAPTURE",
          purchase_units: [
            {
              custom_id: String(order._id),
              amount: { currency_code: "USD", value: totalUSD },
            },
          ],
          application_context: {
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: `${process.env.BASE_URL}/checkout/paypal/return`,
            cancel_url: `${process.env.BASE_URL}/cart`,
          },
        }),
      }
    );

    const ppOrder = await ppRes
      .json()
      .catch(() => ({ error: "Non-JSON response from Paypal" }));

    if (!ppRes.ok) {
      await Order.updateOne(
        { _id: order._id },
        { $set: { "payment.status": "failed", paypalError: ppOrder } }
      );
      return res.status(502).json(ppOrder);
    }

    await Order.updateOne(
      { _id: order._id },
      { $set: { "payment.paypalOrderId": ppOrder.id } }
    );

    const approveLink = ppOrder.links?.find((l) => l.rel === "approve");
    if (!approveLink?.href)
      return res
        .status(502)
        .json({ error: "Paypal approve link missing", ppOrder });

    return res.json({
      orderID: ppOrder.id,
      approveUrl: approveLink.href,
      dbOrderId: String(order._id),
    });
  } catch (e) {
    return res
      .status(e.status || 500)
      .json({ error: e.message || "Server error" });
  }
};

module.exports.paypalReturn = async (req, res) => {
  try {
    const orderID = req.query.token;
    if (!orderID) return res.status(400).send("Missing token");

    const dbOrder = await Order.findOne({
      "payment.paypalOrderId": orderID,
    }).lean();
    if (!dbOrder)
      return res
        .status(404)
        .json({ error: "Order not found for PayPal token", orderID });

    const { ok, json: cap, status } = await captureOrder(orderID);
    if (!ok) return res.status(502).json(cap);

    const final = await finalizePaypal({ orderID, cap });
    if (!final.ok) return res.status(final.status).json(final.body);

    await Order.updateOne(
      { _id: final.dbOrderId, "payment.paypalOrderId": orderID },
      {
        $set: {
          email: final.payerEmail,
          "payment.status": "paid",
          "payment.paidAt": new Date(),
          "payment.paypalCaptureId": final.captureId,
          "payment.amountCharged": final.chargedCents,
        },
      }
    );

    req.session.cart = { items: [] };
    await deliverFiles(final.dbOrderId);

    const order = await Order.findById(final.dbOrderId).lean();
    return res.render("orders/index", { order, sessionId: null });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
};
