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

    // validate password match
    const pw1 = document.querySelector('#password');
    const pw2 = document.querySelector('#confirmPassword');
    const feedback1 = document.querySelector('#feedback1');
    const feedback2 = document.querySelector('#feedback2');
    const form = document.querySelector('#form');
    const btn = document.querySelector('#submit-btn');
    if (btn) btn.disabled = true;

    function match() {
        const a = pw1.value;
        const b = pw2.value;

        if (a.length < 6) {
            feedback1.textContent = 'Password must be 6-20 characters';
            feedback1.classList.remove('d-none');
            pw1.setCustomValidity();
            return;
        } else feedback1.classList.add('d-none');

        if (!b) {
            feedback2.textContent = '';
            pw2.setCustomValidity('');
            btn.disabled = true;
            return;
        }

        const passwordMatch = a === b;
        if (passwordMatch) {
            feedback2.textContent = 'Password match \u2705';
            pw2.setCustomValidity('');
            feedback2.classList.remove('d-none');
            btn.disabled = false;
        } else {
            feedback2.textContent = 'Passwords do not match \u274C';
            pw2.setCustomValidity('Passwords do not match \u274C');
            feedback2.classList.remove('d-none');
            btn.disabled = true;
        }
    }

    if (pw1) {
        pw1.addEventListener('input', match);       // rerun the function if password is changed after matched
        pw2.addEventListener('input', match);
        form.addEventListener('submit', (e) => {
            match();
            if (!form.checkValidity()) e.preventDefault();
        })
    };

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

            // update cart count
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
});
