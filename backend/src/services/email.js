import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;
if (env.smtp.configured) {
  transporter = nodemailer.createTransport({ host: env.smtp.host, port: env.smtp.port, secure: env.smtp.secure, auth: { user: env.smtp.user, pass: env.smtp.pass } });
}

export const outbox = [];

export async function sendEmail({ to, subject, html, text }) {
  if (!to) return { ok: false, skipped: 'no recipient' };
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

export const emailMode = () => (transporter ? 'smtp' : 'console');
