const upload = document.getElementById('upload');
const sizeChecks = document.querySelectorAll('.size-check');

document.addEventListener('change', (e) => {
    if (!e.target.matches('input[name="product[size][]"]')) return;

    const checked = document.querySelectorAll('input[name="product[size][]"]:checked').length > 0;

    if (upload) upload.classList.toggle('d-none', checked);
});

sizeChecks.forEach(e => {
    e.addEventListener('change', () => {
        const target = document.getElementById(e.dataset.target);
        if (!target) return;
        target.classList.toggle('d-none', !e.checked);
    });
});

const standardInput = document.getElementById('standard');
if (standardInput) {
    standardInput.addEventListener('change', (e) => {
        const list = document.getElementById('file-standard');
        if (!list) return;
        list.innerHTML = '';

        Array.from(e.target.files).forEach(file => {
            const li = document.createElement('li');
            li.textContent = file.name;
            list.appendChild(li);
        });
    });
};

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

(() => {
    const checked = document.querySelectorAll('input[name="product[size][]"]:checked').length > 0;
    if (upload) upload.classList.toggle('d-none', checked);
})
    ();