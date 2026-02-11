const pp = document.querySelector('#paypal-button');
const subTotalNum = Number.parseFloat(pp.dataset.subtotal);

paypal.Buttons({
    createOrder: (data, actions) => {
        return actions.order.create({
            purchase_units: [{
                amount: { value: subTotalNum.toFixed(2) }
            }]
        });
    },
    onApprove: (data, actions) => {
        return actions.order.capture();
    },
    onError: (err) => {
        console.log('Paypal error', err);
    }
}).render('#paypal-button')