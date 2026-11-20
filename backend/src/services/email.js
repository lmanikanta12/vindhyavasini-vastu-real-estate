import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Sending options, in this order:
// 1) Brevo (web request, works on free hosting where SMTP ports are blocked)
// 2) Normal SMTP (e.g. Gmail on your own computer)
// 3) Console (emails are printed in the terminal)
const brevo = {
  apiKey: process.env.BREVO_API_KEY,
  senderEmail: process.env.BREVO_SENDER_EMAIL,
  senderName: process.env.BREVO_SENDER_NAME || 'Vindhyavasini Vastu and Real Estate',
};
brevo.configured = Boolean(brevo.apiKey && brevo.senderEmail);

let transporter = null;
if (!brevo.configured && env.smtp.configured) {
  transporter = nodemailer.createTransport({ host: env.smtp.host, port: env.smtp.port, secure: env.smtp.secure, auth: { user: env.smtp.user, pass: env.smtp.pass } });
}

export const outbox = [];

async function sendWithBrevo({ to, subject, html, text }) {
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': brevo.apiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: brevo.senderName, email: brevo.senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html || `<pre style="font-family:inherit">${String(text || '').replace(/</g, '&lt;')}</pre>`,
      ...(text ? { textContent: text } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

export async function sendEmail({ to, subject, html, text }) {
  if (!to) return { ok: false, skipped: 'no recipient' };
  if (brevo.configured) {
    try {
      await sendWithBrevo({ to, subject, html, text });
      return { ok: true, mode: 'brevo' };
    } catch (err) {
      console.error('[email] failed:', err.message);
      return { ok: false, error: err.message };
    }
  }
  if (!transporter) {
    outbox.unshift({ to, subject, text, html, at: new Date().toISOString() });
    outbox.length = Math.min(outbox.length, 50);
    console.log(`\n[email:console] To: ${to}\n               Subject: ${subject}\n${String(text || '').split('\n').map((l) => `               ${l}`).join('\n')}\n`);
    return { ok: true, mode: 'console' };
  }
  try {
    await transporter.sendMail({ from: env.smtp.from, to, subject, html, text });
    return { ok: true, mode: 'smtp' };
  } catch (err) {
    console.error('[email] failed:', err.message);
    return { ok: false, error: err.message };
  }
}

export const emailMode = () => (brevo.configured ? 'brevo' : transporter ? 'smtp' : 'console');