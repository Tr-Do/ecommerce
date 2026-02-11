paypal.Buttons({
    createOrder: async () => {
        const res = await fetch('/checkout/paypal/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Paypal create failed');

        return data.orderID;        // paypal order id
    },
    onApprove: async (data) => {
        const res = await fetch('/checkout/paypal/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID })
        });
        const cap = await res.json();
        if (!res.ok) throw new Error(cap?.error || 'Paypal capture failed');

        window.location.href = '/checkout/success?paypal=1';
    },
    onError: (err) => {
        console.log('Paypal error', err);
    }
}).render('#paypal-button')