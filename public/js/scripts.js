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

    // increase cart count logic
    const addToCartBtn = document.getElementById('add-to-cart');
    const cartCount = document.getElementById('cart-count');

    if (cartCount) {
        const saved = sessionStorage.getItem('cartCount');
        if (saved !== null) {
            cartCount.textContent = saved;
        }
    }

    if (addToCartBtn && cartCount) {
        addToCartBtn.addEventListener('click', () => {

            const sizeChosen = document.getElementById('size');
            const sizeSent = document.getElementById('selected-size');
            if (sizeChosen) {
                sizeSent.value = sizeChosen.value;
            }
            const num = Number(cartCount.textContent) + 1;
            cartCount.textContent = String(num);
            sessionStorage.setItem('cartCount', String(num));
            const product = {
                id: addToCartBtn.dataset.id,
                name: addToCartBtn.dataset.name,
                price: addToCartBtn.dataset.price,
                image: addToCartBtn.dataset.image,
                qty: 1
            };

            let cart = JSON.parse(sessionStorage.getItem('cart')) || [];
            const currentCart = cart.find(p => p.id === product.id);
            if (currentCart) {
                currentCart.qty += 1;
            } else {
                cart.push(product);
            };
            localStorage.setItem('cart', JSON.stringify(cart));
        })
    }

});
