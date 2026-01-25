const delImg = document.querySelectorAll('.delImg');
const addImg = document.getElementById('addImg');
const picker = document.getElementById('imagePicker');
const imgTile = document.getElementById('imgTile');
const orderInput = document.getElementById('imageOrder');

addImg.addEventListener('click', () => picker.click());

function syncOrder() {
    const filenames = [];
    const tiles = imgTile.querySelectorAll('.smdiv');

    for (const el of tiles) {
        if (el === addImg) continue;
        if (el.classList.contains('d-none')) continue;        // hidden = deleted existing image
        if (el.dataset.existing === '1' && el.dataset.filename) {
            filenames.push(el.dataset.filename);
        }
    }
    orderInput.value = filenames.join(",");
}

picker.addEventListener('change', async () => {
    const files = [...picker.files];
    if (!files.length) return;

    files.forEach(file => {
        const clientId = crypto.randomUUID();       // name newly uploaded images

        const tile = document.createElement('div')
        tile.setAttribute('draggable', 'true');
        tile.className = 'smdiv mt-2 mb-3 ms-2 border position-relative';
        tile.dataset.existing = '0';
        tile.dataset.clientId = clientId;

        const url = URL.createObjectURL(file);

        tile.innerHTML = `
        <i class="bi bi-x-circle position-absolute top-0 end-0 m-1 delImg"></i>
        <img src="${url}" class="w-100 h-100" alt="">
        `;

        imgTile.insertBefore(tile, addImg);     // insert before '+' tile
    });

    syncOrder();
});

imgTile.addEventListener('click', (e) => {
    const x = e.target.closest('.delImg');
    if (!x) return;

    const tile = x.closest('.smdiv');
    // if there's no image or click on add img button
    if (!tile || tile === addImg) return;

    if (tile.dataset.existing === '1') {
        const filename = tile.dataset.filename;

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'deleteImages[]';
        input.value = filename;
        imgTile.closest('form').appendChild(input);

        tile.classList.add('d-none');
    } else {
        tile.remove();
    }
    syncOrder();
})

syncOrder();



// drag image logic
Sortable.create(imgTile, {
    animation: 150,
    draggable: '.smdiv:not(#addImg)',
    onEnd: () => {
        syncOrder(); // same function you already wrote
    },
});
