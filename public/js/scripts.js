document.addEventListener("DOMContentLoaded", () => {
    const links = document.querySelectorAll(".pagination a");

    links.forEach(link => {
        link.addEventListener("click", () => {
            sessionStorage.setItem("scrollY", window.scrollY);
        });
    });

    const savedScroll = sessionStorage.getItem("scrollY");
    if (savedScroll !== null) {
        window.scrollTo(0, parseInt(savedScroll, 12));
        sessionStorage.removeItem("scrollY");
    }
});

const addToCartBtn = document.getElementById('add-to-cart');
const cartCount = document.getElementById('cart-count');

if (cartCount) {
    const saved = localStorage.getItem('cartCount');
    if (saved !== null) {
        cartCount.textContent = saved;
    }
}

if (addToCartBtn && cartCount) {
    addToCartBtn.addEventListener('click', () => {
        const num = Number(cartCount.textContent) + 1;
        cartCount.textContent = String(num);
        localStorage.setItem('cartCount', String(num));
    })
}