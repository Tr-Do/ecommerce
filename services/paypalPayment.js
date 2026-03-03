const { getAccessToken } = require("./getAccessToken");

async function captureOrder(orderID) {
  const accessToken = await getAccessToken();

  const res = await fetch(
    `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  const json = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    json,
  };
}

module.exports = { captureOrder };
