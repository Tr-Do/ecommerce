const FormData = require('form-data');

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_FROM = process.env.MAILGUN_FROM;
const MAILGUN_BASE = process.env.MAILGUN_BASE;

async function sendEmail({ to, subject, html }) {
    const form = new FormData();
    form.append('from', MAILGUN_FROM);
    form.append('to', to);
    form.append('subject', subject);
    form.append('html', html);

    const body = form.getBuffer();

    const headers = {
        ...form.getHeaders(), // critical: sets Content-Type with boundary
        Authorization:
            'Basic ' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64'),
    };

    const res = await fetch(`${MAILGUN_BASE}/v3/${MAILGUN_DOMAIN}/messages`, {
        method: 'POST',
        headers,
        body
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`Mailgun error: ${text}`);

    return text;
}

module.exports = { sendEmail };
