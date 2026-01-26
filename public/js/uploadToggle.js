const upload = document.getElementById('upload');

document.addEventListener('change', (e) => {
    if (!e.target.matches('input[name="product[size][]"]')) return;

    const checked = document.querySelectorAll('input[name="product[size][]"]:checked').length > 0;

    upload.classList.toggle('d-none', checked);
})