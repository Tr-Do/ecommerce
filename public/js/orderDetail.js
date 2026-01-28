const sessionId = document.getElementById('download-root').dataset.sessionId;
const fileStatus = document.getElementById('status');
const downloadList = document.getElementById('downloadList');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function pollPaid(maxSeconds = 60) {
    const deadline = Date.now() + maxSeconds * 1000;
    while (Date.now() < deadline) {
        const result = await fetch(`/downloads/session/${encodeURIComponent(sessionId)}/status`);
        const data = await result.json();
        if (data.paid) return true;
        await sleep(1000);
    }
    return false;
}

async function loadFiles() {
    const result = await fetch(`/downloads/session/${encodeURIComponent(sessionId)}/files`);
    if (!result.ok) throw new Error('Download not available yet');
    return await result.json();
}

function renderLink(files) {
    downloadList.innerHTML = '';

    const counters = {};

    const totals = {};
    for (const file of files) {
        totals[file.name] = (totals[file.name] || 0) + 1;
    }

    for (const file of files) {
        const baseName = file.name;

        counters[baseName] = (counters[baseName] || 0) + 1;

        const displayName = totals[baseName] === 1 ? baseName : `${baseName} - File ${counters[baseName]}`;

        const li = document.createElement('li');
        li.className = 'd-flex justify-content-center align-items-center mt-3 gap-5';

        const productDiv = document.createElement('div');
        productDiv.textContent = displayName;

        const a = document.createElement('a');
        a.className = 'btn btn-success btn-sm';
        a.href = file.url;
        a.textContent = 'Download';

        li.appendChild(productDiv);
        li.append(a);
        downloadList.append(li);
    }
}

(async () => {
    try {
        const paid = await pollPaid(60);
        if (!paid) {
            fileStatus.textContent = 'Payment processing. Please wait ...';
            return;
        }

        fileStatus.textContent = 'Payment confirmed. Generating download links...';

        const files = await loadFiles();
        renderLink(files);

        fileStatus.textContent = 'Your download is ready. The link(s) will expire in 12 hours!';
    } catch (e) {
        fileStatus.textContent = 'Something went wrong. Please refresh the page';
    }
})();