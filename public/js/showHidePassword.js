document.addEventListener("DOMContentLoaded", () => {
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
})