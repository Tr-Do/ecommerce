document.addEventListener("DOMContentLoaded", () => {

    const cartCount = document.getElementById('cartCount');

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
    const eyes = document.querySelectorAll('.eyeIcon');
    const password = document.querySelectorAll('.password');
    eyes.forEach(eye => {
        eye.addEventListener('click', () => {
            const input = eye.closest('.input-group').querySelector('.password');
            const icon = eye.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.replace('bi-eye-slash-fill', 'bi-eye-fill')
            } else {
                input.type = 'password';
                icon.classList.replace('bi-eye-fill', 'bi-eye-slash-fill');
            }
        })
    })

    // add to cart logic
    const addToCartForm = document.getElementById('addToCartForm');
    if (addToCartForm) {
        addToCartForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(addToCartForm);
            const productId = formData.get('productId');
            const size = formData.get('size');

            const res = await fetch('/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productId, size })
            });

            // show error on duplicate
            if (res.status === 409) {
                const cartHelp = document.getElementById('cartHelp');
                if (cartHelp) cartHelp.classList.remove('d-none');
            }

            if (!res.ok) return;

            // update cart ocunt
            const data = await res.json();
            if (cartCount) cartCount.textContent = String(data.cartCount);
        })
    }


    // copy button on About page
    const copyBtn = document.querySelector('.bi-copy');
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            navigator.clipboard.writeText('terrarium@primewaytrading.net');
        })
    }

    // remove item from cart
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
                const size = e.currentTarget.dataset.size;
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
