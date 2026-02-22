
async function getAccessToken() {
    const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    const res = await fetch(`${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: 'grant_type=client_credentials'
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Paypal token error: ${res.status} ${text}`);
    }
    const data = await res.json();
    return data.access_token;
}

async function createPaypalOrder({ dbOrderId, amountTotalCents }) {
    const accessToken = await getAccessToken();
    const totalUSD = (amountTotalCents / 100).toFixed(2);

    const res = await fetch(`${process.env.PAYPAL_BASE_URL}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [{
                custom_id: String(dbOrderId),
                amount: {
                    currency_code: 'USD',
                    value: totalUSD
                }
            }],
            application_context: {
                shipping_preference: 'NO_SHIPPING',
                user_action: 'PAY_NOW',
                return_url: `${process.env.BASE_URL}/checkout/paypal/return`,
                cancel_url: `${process.env.BASE_URL}/cart`
            }
        })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error('Paypal create order failed');

    const approveLink = json.links?.find(link => link.rel === 'approve')?.href;
    if (!approveLink) throw new Error('Paypal approve link missing');

    return {
        paypalOrderId: json.id,
        approveUrl: approveLink
    };
}

async function capturePaypalOrder(orderID) {
    const accessToken = await getAccessToken();

    const res = await fetch(
        `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${orderID}/capture`,
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        }
    );
    const cap = await res.json();
    if (!res.ok) throw new Error('Paypal capture failed');

    return cap;
}

module.exports = { createPaypalOrder, capturePaypalOrder }