const Order = require("../models/order");
const { deliverFiles } = require("../services/fileDelivery.js");
const { buildCartOrder } = require("../services/cartOrder.js");
const crypto = require("crypto");
const {
  verifyCoinbaseSignature,
} = require("../services/verifyCoinbaseSignature.js");
const { timingSafeEqualHex } = require("../services/timingSafeEqualHex.js");

module.exports.createCoinbaseCharge = async (req, res) => {
  try {
    if (!process.env.COINBASE_COMMERCE_API_KEY) {
      return res.status(500).json({ err: "Missing COINBASE API KEY" });
    }
    const { orderItems, amountTotalCents, currency } =
      await buildCartOrder(req);

    // currency for db
    const localCurrency = (currency || "usd").toLowerCase();
    // currency for coinbase
    const currencyUpper = localCurrency.toUpperCase();

    const order = await Order.create({
      ip: req.ip,
      user: req.user?._id || null,
      items: orderItems,
      payment: {
        provider: "coinbase",
        status: "pending",
        currency: localCurrency,
        amountTotal: amountTotalCents,
        coinbaseChargeId: null,
      },
      email: null,
    });

    const body = {
      name: "Digital design order",
      description: `Order ${order._id}`,
      pricing_type: "fixed_price",
      local_price: {
        amount: (amountTotalCents / 100).toFixed(2),
        currency: currencyUpper,
      },
      metadata: {
        dbOrderId: String(order._id),
      },
      redirect_url: `${process.env.BASE_URL}/orders/${order._id}`,
      cancel_url: `${process.env.BASE_URL}/cart`,
    };
    const resp = await fetch("https://api.commerce.coinbase.com/charges", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CC-Api-Key": process.env.COINBASE_COMMERCE_API_KEY,
        "X-CC-Version": "2018-03-22",
      },
      body: JSON.stringify(body),
    });
    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            "payment.status": "failed",
            coinbaseError: json,
          },
        }
      );
      return res.status(502).json({
        error: "Coinbase charge create failed",
        details: json,
      });
    }
    const charge = json?.data;
    if (!charge?.hosted_url || !charge?.id) {
      return res.status(502).json({
        error: "Coinbase reponse missing hosted url/id",
        details: json,
      });
    }
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          "payment.coinbaseChargeId": charge.id,
        },
      }
    );
    return res.json({
      orderId: String(order._id),
      hostedUrl: charge.hosted_url,
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Server error" });
  }
};

module.exports.coinbaseWebhook = async (req, res) => {
  try {
    const signature = req.header("X-CC-Webhook-Signature");
    const secret = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;

    const rawBody = req.rawBody || req.body;

    if (!verifyCoinbaseSignature(rawBody, signature, secret)) {
      return res.status(400).send("Invalid signature");
    }
    const payload = JSON.parse(rawBody.toString("utf8"));
    const eventType = payload?.event?.type;

    if (eventType !== "charge:confirmed") return res.json({ received: true });

    const data = payload?.event?.data;
    const coinbaseChargeId = data?.id;
    const dbOrderId = data?.metadata?.dbOrderId;

    if (!coinbaseChargeId || !dbOrderId) {
      return res
        .status(400)
        .json({ error: "Missing coinbase chargeid/dborderid" });
    }
    const order = await Order.findOne({
      _id: dbOrderId,
      "payment.provider": "coinbase",
      "payment.coinbaseChargeId": coinbaseChargeId,
    });
    if (!order) return res.status(400).json({ error: "Order not found" });
    if (order.payment.status === "paid") return res.json({ received: true });

    order.payment.status = "paid";
    order.payment.paidAt = new Date();
    await order.save();

    await deliverFiles(order._id);
    return res.json({ received: true });
  } catch (err) {
    return res
      .status(500)
      .json({ received: false, error: err.message || "Webhook error" });
  }
};
