const Order = require("../models/order");

function badRequest(res, error, extra = {}) {
  return res.status(400).json({ error, ...extra });
}

async function finalizePaypal({ orderID, cap }) {
  const pu = cap.purchase_units?.[0];
  const capture = pu?.payments?.captures?.[0];

  const captureId = capture?.id;
  if (!captureId || capture?.status !== "COMPLETED")
    return {
      ok: false,
      status: 400,
      body: {
        error: "Capture not completed",
        cap,
      },
    };
  const dbOrder = await Order.findOne({ "payment.paypalOrderId": orderID });
  if (!dbOrder)
    return {
      ok: false,
      status: 404,
      body: {
        error: "Order not found",
        orderID,
      },
    };
  const dbOrderId = String(dbOrder._id);
  const valueStr = capture?.amount?.value ?? pu?.amount?.value ?? null;
  const chargedCents = valueStr ? Math.round(Number(valueStr) * 100) : null;
  if (chargedCents === null)
    return {
      ok: false,
      status: 400,
      body: {
        error: "Paid amount missing",
        cap,
      },
    };
  if (chargedCents !== dbOrder.payment.amountTotal)
    return {
      ok: false,
      status: 400,
      body: {
        error: "Paid amount mismatch",
        chargedCents,
        expect: dbOrder.payment.amountTotal,
      },
    };
  return {
    ok: true,
    dbOrderId,
    captureId,
    payerEmail: cap.payer?.email_address || null,
    chargedCents,
  };
}

module.exports = { finalizePaypal };
