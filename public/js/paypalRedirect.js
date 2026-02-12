document.querySelector('#paypal-redirect').addEventListener('click', async () => {
    const res = await fetch('/checkout/paypal/create', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Create Paypal order failed');
    window.location.href = data.approveUrl;
})