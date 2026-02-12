const pp = document.querySelector('#paypal-button');
const subtotal = pp.dataset.subtotal;
const dbOrderId = pp.dataset.dbOrderId;

paypal.Buttons({
    createOrder: async (data, actions) => {
        return actions.order.create({
            purchase_units: [{amount:{value:subtotal}}]
        });    
    },
    onApprove: async (data) => {
        const capture = await actions.order.capture();

        const res = await fetch('/checkout/paypal/finalize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                dbOrderId, 
                paypalOrderId: data.orderID,
            paypalCaptureId: capture?.purchase_units?.[0]?.payment?.capture?.[0]?.id 
        })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Finalize failed');
        }
        window.location.href = `/orders/${dbOrderId}/success`;
    },
    onError: (err) => {
        console.log('Paypal error', err);
    }
}).render('#paypal-button')