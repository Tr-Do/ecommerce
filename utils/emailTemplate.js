function buildDownloadEmail({ orderNumber, files }) {
    const rows = files
        .map(f => `
        <li>
        <strong>${f.name}</strong><br>
        <a href="${f.url}">Download</a>
        </li>
    `
        ).join('');
    return `
<h2>Thank you for your purchase</h2>
<p>Order ID: <strong>${orderNumber}</strong></p>
<p>Your download link(s) will expire in 12 hours:</p>
<ul>${row}</ul>
<p>Contact us if you have any question</p>
`;
}

module.epxorts = { buildDownloadEmail }