const sub = document.getElementById('subtotal');
const removeBtn = document.querySelectorAll('.removeProduct');
if (cartCount && sub && removeBtn.length) {
    removeBtn.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();     // Stops default action

            const row = e.currentTarget.closest('tr');     // Choose the closest tr tag
            if (!row) return;

            // set default price is 5 if not found
            const price = Number(e.currentTarget.dataset.price) || 5;
            const variantId = e.currentTarget.dataset.variantId;
            const productId = e.currentTarget.dataset.productId;
            if (!productId) return;

            // send data to server without reloading page
            const res = await fetch('/cart/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // use stringify to preserve data, String({productId}) destroys data, String for display, JSON.stringify for transport
                body: JSON.stringify({ productId, variantId })
            })

            if (!res.ok) return;        // true if HTTP from 200-299

            const data = await res.json();

            row.remove();

            cartCount.textContent = String(data.cartCount);
            sub.textContent = `$${data.subtotal}`;
        })
    })
}