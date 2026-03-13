const addImg = document.getElementById("addImg");
const picker = document.getElementById("imagePicker");
const imgTile = document.getElementById("imgTile");
const orderInput = document.getElementById("imageOrder");

let selectedFiles = [];

addImg.addEventListener("click", () => picker.click());

function fileKey(file) {
  return `${file.name}__${file.size}__${file.lastModified}`;
}

function syncImageInput() {
  const dt = new DataTransfer();

  for (const file of selectedFiles) {
    dt.items.add(file);
  }
  picker.files = dt.files;
}

function syncOrder() {
  const order = [];
  const tiles = imgTile.querySelectorAll(".smdiv");

  for (const el of tiles) {
    if (el === addImg) continue;
    if (el.classList.contains("d-none")) continue; // hidden = deleted existing image

    if (el.dataset.existing === "1" && el.dataset.filename) {
      order.push(el.dataset.filename);
    } else if (el.dataset.existing === "0" && el.dataset.fileKey) {
      order.push(el.dataset.fileKey);
    }
  }
  orderInput.value = order.join(",");
}

function buildTile(file) {
  const tile = document.createElement("div");
  const key = fileKey(file);
  const url = URL.createObjectURL(file);

  tile.className = "smdiv mt-2 mb-3 ms-2 border position-relative";
  tile.setAttribute("draggable", "true");
  tile.dataset.existing = "0";
  tile.dataset.fileKey = key;

  let mediaHtml = "";

  if (file.type.startsWith("video/")) {
    mediaHtml = `
        <video class="w-100 h-100" muted playsinline>
        <source src="${url}" type="${file.type}">
        </video>
        `;
  } else {
    mediaHtml = `<img src="${url}" class="w-100 h-100" alt="">`;
  }
  tile.innerHTML = `
    <i class="bi bi-x-circle position-absolute top-0 end-0 m-1 delImg"></i>
    ${mediaHtml}
    `;
  imgTile.insertBefore(tile, addImg);
}

function addNewFiles(files) {
  const added = [];

  for (const file of files) {
    const exist = selectedFiles.some((f) => fileKey(f) === fileKey(file));
    if (!exist) {
      selectedFiles.push(file);
      added.push(file);
    }
  }
  syncImageInput();

  for (const file of added) {
    buildTile(file);
  }
  syncOrder();
}

function removeNewFile(key) {
  selectedFiles = selectedFiles.filter((file) => fileKey(file) !== key);
  syncImageInput();
}

function reorderFiles() {
  const newTiles = [
    ...imgTile.querySelectorAll('.smdiv[data-existing="0"]:not(.d-none)'),
  ];

  const reorder = [];

  for (const tile of newTiles) {
    const key = tile.dataset.fileKey;
    const match = selectedFiles.find((file) => fileKey(file) === key);
    if (match) reorder.push(match);
  }
  selectedFiles = reorder;
  syncImageInput();
}

picker.addEventListener("change", () => {
  addNewFiles(Array.from(picker.files));
});

imgTile.addEventListener("click", (e) => {
  const x = e.target.closest(".delImg");
  if (!x) return;

  const tile = x.closest(".smdiv");
  if (!tile || tile === addImg) return;

  if (tile.dataset.existing === "1") {
    const filename = tile.dataset.filename;

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "deleteImages[]";
    input.value = filename;
    imgTile.closest("form").appendChild(input);

    tile.classList.add("d-none");
  } else {
    removeNewFile(tile.dataset.fileKey);
    tile.remove();
  }
  syncOrder();
});

syncOrder();

// drag image logic
Sortable.create(imgTile, {
  animation: 150,
  draggable: ".smdiv:not(#addImg)",
  onEnd: () => {
    reorderFiles();
    syncOrder();
  },
});
