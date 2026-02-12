const pp = document.querySelector('#paypal-button');
const subtotal = pp.dataset.subtotal;
const dbOrderId = pp.dataset.dbOrderId;

paypal.Buttons({
    createOrder: async () => {
        const res = await fetch('/checkout/paypal/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dbOrderId })
        });
        if (!res.ok) throw new Error('Create Paypal order failed');

        const { approveUrl } = await res.json();

        window.location.href = approveUrl;

        return 'redirecting';
    }
}).render('#paypal-button')