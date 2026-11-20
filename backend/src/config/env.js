import 'dotenv/config';
import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';
const e = process.env;

if (isProd && (!e.JWT_SECRET || e.JWT_SECRET.startsWith('change-this'))) {
  console.error('FATAL: set a strong JWT_SECRET in .env before running in production.');
  process.exit(1);
}

const smtpConfigured = Boolean(e.SMTP_HOST && e.SMTP_USER && e.SMTP_PASS);
const rzpConfigured = Boolean(e.RAZORPAY_KEY_ID && e.RAZORPAY_KEY_SECRET);
const paymentMode = (e.PAYMENT_MODE || (rzpConfigured ? 'razorpay' : 'demo')).toLowerCase();

export const env = {
  nodeEnv: e.NODE_ENV || 'development',
  isProd,
  port: Number(e.PORT) || 5000,
  clientUrl: (e.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, ''),
  mongoUri: e.MONGODB_URI || 'mongodb://127.0.0.1:27017/vastu_estates',

  jwtSecret: e.JWT_SECRET && !e.JWT_SECRET.startsWith('change-this') ? e.JWT_SECRET : crypto.randomBytes(32).toString('hex'),
  jwtExpiresIn: e.JWT_EXPIRES_IN || '7d',
  smtp: {
    configured: smtpConfigured,
    host: e.SMTP_HOST,
    port: Number(e.SMTP_PORT) || 465,
    secure: String(e.SMTP_SECURE ?? 'true').toLowerCase() === 'true',
    user: e.SMTP_USER,
    pass: e.SMTP_PASS,
    from: e.MAIL_FROM || (e.SMTP_USER ? `Vindhyavasini Vastu and Real Estate <${e.SMTP_USER}>` : 'Vindhyavasini Vastu and Real Estate <no-reply@vastuestates.local>'),
  },
  razorpay: { configured: rzpConfigured, keyId: e.RAZORPAY_KEY_ID, keySecret: e.RAZORPAY_KEY_SECRET, webhookSecret: e.RAZORPAY_WEBHOOK_SECRET },
  paymentMode,
  cloudinary: {
    configured: Boolean(e.CLOUDINARY_CLOUD_NAME && e.CLOUDINARY_API_KEY && e.CLOUDINARY_API_SECRET),
    cloudName: e.CLOUDINARY_CLOUD_NAME,
    apiKey: e.CLOUDINARY_API_KEY,
    apiSecret: e.CLOUDINARY_API_SECRET,
    folder: e.CLOUDINARY_FOLDER || 'vastu-estates',
    apiBase: e.CLOUDINARY_API_BASE || 'https://api.cloudinary.com',
  },

  exposeOutbox: !isProd && !smtpConfigured,
  admin: {
    name: e.ADMIN_NAME || 'Site Administrator',
    email: e.ADMIN_EMAIL || 'admin@example.com',
    password: e.ADMIN_PASSWORD || 'Admin@12345',
    phone: e.ADMIN_PHONE || '',
  },
};
