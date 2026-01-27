const upload = document.getElementById('upload');

document.addEventListener('change', (e) => {
    if (!e.target.matches('input[name="product[size][]"]')) return;

    const checked = document.querySelectorAll('input[name="product[size][]"]:checked').length > 0;

    upload.classList.toggle('d-none', checked);
})

document.querySelectorAll('.size-check').forEach(f => {
    f.addEventListener('change', () => {
        const target = document.getElementById(f.dataset.target);

        if (!target) return;

        target.classList.toggle('d-none', !f.checked);
    })
});

document.getElementById('standard').addEventListener('change', (e) => {
    if (!e) return;

    const list = document.getElementById('file');
    if (!list) return;
    list.innerHTML = '';

    Array.from(e.target.files).forEach(file => {
        const li = document.createElement('li');
        li.textContent = file.name;
        list.appendChild(li);
    })
})

document.querySelectorAll('.fileUpload').forEach(input => {
    input.addEventListener('change', () => {
        const size = input.dataset.size;
        if (!size) return;

        const list = document.getElementById(`file-${size}`);
        if (!list) return;
        list.innerHTML = '';

        Array.from(input.files).forEach(file => {
            const li = document.createElement('li');
            li.textContent = file.name;
            list.appendChild(li);
        });
    });
});