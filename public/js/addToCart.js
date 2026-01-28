document.addEventListener("DOMContentLoaded", () => {
    const addToCartForm = document.getElementById('addToCartForm');
    const cartCount = document.getElementById('cartCount');

    if (addToCartForm) {
        addToCartForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(addToCartForm);
            const productId = formData.get('productId');
            const variantId = formData.get('variantId');

            const res = await fetch('/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, variantId })
            });

            // show error on duplicate
            if (res.status === 409) {
                const cartHelp = document.getElementById('cartHelp');
                if (cartHelp) cartHelp.classList.remove('d-none');
            }

            if (!res.ok) return;

            // update cart count
            const data = await res.json();
            if (cartCount) cartCount.textContent = String(data.cartCount);
        })
    }
})