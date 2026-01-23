document.addEventListener("DOMContentLoaded", () => {

    // pagination
    const links = document.querySelectorAll(".pagination a");
    links.forEach(link => {
        link.addEventListener("click", () => {
            sessionStorage.setItem("scrollY", window.scrollY);
        });
    });
    const savedScroll = sessionStorage.getItem("scrollY");
    if (savedScroll !== null) {
        window.scrollTo(0, parseInt(savedScroll, 10));
        sessionStorage.removeItem("scrollY");
    }

    // hide/show password
    const eye = document.getElementById('eyeIcon');
    const password = document.getElementById('password');
    if (eye) {
        eye.addEventListener('click', () => {
            if (password.type === 'password') {
                password.type = 'text';
                eye.classList.remove('bi-eye-slash-fill');
                eye.classList.add('bi-eye-fill');
            } else {
                password.type = 'password';
                eye.classList.remove('bi-eye-fill');
                eye.classList.add('bi-eye-slash-fill');
            }
        })
    }

    // copy button on About page
    const copyBtn = document.querySelector('.bi-copy');
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            navigator.clipboard.writeText('terrarium@primewaytrading.net');
        })
    }

    // cart count logic
    const cartCount = document.getElementById('cartCount');
    const sub = document.getElementById('subtotal');
    const removeBtn = document.querySelectorAll('.removeProduct');
    if (cartCount && sub && removeBtn.length) {
        removeBtn.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();     // Stops default action

                const row = e.currentTarget.closest('tr');     // Choose the closest tr tag
                if (!row) return;

                const price = Number(e.currentTarget.dataset.price) || 0;
                const productId = e.currentTarget.dataset.productId;
                if (!productId) return;


                // send data to server without reloading page
                const res = await fetch('/cart/remove', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    // use stringify to preserve data, String({productId}) destroys data, String for display, JSON.stringify for transport
                    body: JSON.stringify({ productId, size })
                })
                if (!res.ok) return;        // true if HTTP from 200-299

                const data = await res.json();

                row.remove();

                cartCount.textContent = String(data.cartCount);
                sub.textContent = `$${data.subtotal}`;
            })
        })
    }
});
