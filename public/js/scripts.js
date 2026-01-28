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

    // copy button on About page
    const copyBtn = document.querySelector('.bi-copy');
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            navigator.clipboard.writeText('terrarium@primewaytrading.net');
        })
    }
});
