document.addEventListener("DOMContentLoaded", () => {
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

    const copyBtn = document.querySelector('.bi-copy');
    copyBtn.addEventListener('click', (e) => {
        navigator.clipboard.writeText('terrarium@primewaytrading.net');
    })

    const sub = document.getElementById('subtotal');
    const removeBtn = document.querySelectorAll('.removeProduct');
    removeBtn.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const row = e.target.closest('tr');
            if (!row) return;
            const price = Number(e.target.dataset.price);
            row.remove()
            let num = Number(cartCount.textContent) || 0;
            if (num > 0) num -= 1;
            cartCount.textContent = String(num);
            sessionStorage.setItem('cartCount', String(num));
            let subtotal = Number(sub.textContent.replace('$', '')) || 0;
            subtotal = Math.max(0, subtotal - price);
            sub.textContent = `$${subtotal}`;
        })
    })

});
