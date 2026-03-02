const Order = require("../models/order");
const { deliverFiles } = require("../services/fileDelivery.js");
const { buildCartOrder } = require("../services/cartOrder.js");
const crypto = require("crypto");
const { getAccessToken } = require("../services/getAccessToken.js");
const {
  verifyCoinbaseSignature,
} = require("../services/verifyCoinbaseSignature.js");
const { timingSafeEqualHex } = require("../services/timingSafeEqualHex.js");

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
              amount: {
                currency_code: "USD",
                value: totalUSD,
              },
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
    let ppOrder;
    try {
      ppOrder = await ppRes.json();
    } catch {
      ppOrder = { error: "Non-JSON response from Paypal" };
    }

    if (!ppRes.ok) {
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            "payment.status": "failed",
            paypalError: ppOrder,
          },
        }
      );
      return res.status(502).json(ppOrder);
    }
    await Order.updateOne(
      { _id: order._id },
      { $set: { "payment.paypalOrderId": ppOrder.id } }
    );
    const approveLink = ppOrder.links?.find((link) => link.rel === "approve");
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

    const accessToken = await getAccessToken();

    const capRes = await fetch(
      `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    const cap = await capRes.json().catch(() => ({}));
    if (!capRes.ok) return res.status(502).json(cap);

    const pu = cap.purchase_units?.[0];
    const capture = pu?.payments?.captures?.[0];
    const dbOrderId = pu?.custom_id || capture?.custom_id || null;
    const captureId = capture?.id;
    const payerEmail = cap.payer?.email_address || null;

    if (!dbOrderId)
      return res.status(400).json({ error: "Missing custom id", cap });
    if (!captureId || capture?.status !== "COMPLETED")
      return res.status(400).json({ error: "Capture not complete", cap });

    const dbOrder = await Order.findOne({
      _id: dbOrderId,
      "payment.paypalOrderId": orderID,
    });
    if (!dbOrder) return res.status(400).json({ error: "Order not found" });

    const valueStr = capture?.amount?.value ?? pu?.amount?.value ?? null;
    const chargedCents = valueStr ? Math.round(Number(valueStr) * 100) : null;

    if (chargedCents !== dbOrder.payment.amountTotal)
      return res.status(400).json({
        error: "Paid amount mismatch",
        chargedCents,
        expect: dbOrder.payment.amountTotal,
      });
    else if (chargedCents === null)
      return res.status(400).json({ error: "Paid amount missing", cap });

    await Order.updateOne(
      {
        _id: dbOrderId,
        "payment.paypalOrderId": orderID,
      },
      {
        $set: {
          email: payerEmail,
          "payment.status": "paid",
          "payment.paidAt": new Date(),
          "payment.paypalCaptureId": captureId,
          "payment.amountCharged": chargedCents,
        },
      }
    );
    req.session.cart = { items: [] };

    await deliverFiles(dbOrderId);

    const order = await Order.findById(dbOrderId).lean();
    return res.render("orders/index", { order, sessionId: null });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
};

module.exports.capturePaypalOrder = async (req, res) => {
  try {
    const { orderID } = req.body;
    if (!orderID) return res.status(400).json({ error: "Missing order ID" });

    const accessToken = await getAccessToken();

    const capRes = await fetch(
      `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    const cap = await capRes.json();
    if (!capRes.ok) return res.status(502).json(cap);

    const pu = cap.purchase_units?.[0];
    const dbOrderId = pu?.custom_id;
    const captureId = pu?.payments?.captures?.[0]?.id;
    const payerEmail = cap.payer?.email_address || null;
    const chargedCents = Math.round(Number(pu.amount.value) * 100);

    if (!dbOrderId)
      return res.status(400).json({ error: "Missing order ID", cap });

    if (!captureId || capture?.status !== "COMPLETED")
      return res.status(400).json({ error: "Capture not completed", cap });

    const dbOrder = await Order.findOne({
      _id: dbOrderId,
      "payment.paypalOrderId": orderID,
    });
    if (!dbOrder) return res.status(400).json({ error: "Order not found" });

    if (dbOrder.payment.status === "paid") return res.json({ ok: true });

    const currencyCode = pu?.amount?.currency_code;
    if (!pu?.amount.value || !currencyCode)
      return res.status(400).json({ error: "Missing purchase amount", cap });
    if (currencyCode.toLowerCase() !== dbOrder.payment.currency)
      return res.status(400).json({
        error: "Currency mismatch",
        currencyCode,
        expected: dbOrder.payment.currency,
      });
    if (!captureId)
      return res.status(400).json({ error: "Missing captureId", cap });

    if (chargedCents !== dbOrder.payment.amountTotal)
      return res.status(400).json({
        error: "Amount mismatch",
        chargedCents,
        expected: dbOrder.payment.amountTotal,
      });

    const capture = pu?.payments?.captures?.[0];
    const captureStatus = capture?.status;
    if (captureStatus !== "COMPLETED") {
      return res.status(400).json({ error: "Not Completed", cap });
    }
    const result = await Order.updateOne(
      {
        _id: dbOrderId,
        "payment.paypalOrderId": orderID,
      },
      {
        $set: {
          email: payerEmail,
          "payment.status": "paid",
          "payment.paidAt": new Date(),
          "payment.paypalCaptureId": captureId,
          "payment.amountCharged": chargedCents,
        },
      }
    );

    if (result.matchedCount !== 1)
      return res.status(400).json({ error: "Order does not match", dbOrderId });

    await deliverFiles(dbOrderId);
    return res.json(cap);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Server error" });
  }
};

module.exports.paypalFinalize = async (req, res) => {
  const { dbOrderId, paypalOrderId, paypalCaptureId } = req.body;

  if (!dbOrderId || !paypalOrderId)
    return res.status(400).json({ error: "Missing order id" });

  const result = await Order.updateOne(
    {
      _id: dbOrderId,
      "payment.provider": "paypal",
    },
    {
      $set: {
        "payment.status": "paid",
        "payment.paidAt": new Date(),
        "payment.paypalOrderId": paypalOrderId,
        "payment.paypalCaptureId": paypalCaptureId || null,
      },
    }
  );
  if (result.matchedCount !== 1)
    return res.status(400).json({ error: "Order not found", dbOrderId });

  req.session.cart = { items: [] };
  return res.json({ ok: true });
};

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
