const formData = require('form-data');
const fetch = require('node-fetch');

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;
const MAILGUN_FROM = process.env.MAILGUN_FROM;
const MAILGUN_BASE = process.env.MAILGUN_BASE || 'https://api.mailgun.net';

if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN || !MAILGUN_FROM) throw new Error('Missing Mailgun values');

async function sendEmail({ to, subject, html }) {
    const form = new formData();
    form.append('from', MAILGUN_FROM);
    form.append('to', to);
    form.append('subject', subject);
    form.append('html', html);

    const res = await fetch(
        `${MAILGUN_BASE}/v3/${MAILGUN_DOMAIN}/messages`,
        {
            method: 'POST',
            headers: {
                Authorization:
                    'Basic' + Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64'),
            },
            body: form,
        }
    );
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Maingun error: ${text}`);
    }
}

module.exports = { sendEmail };