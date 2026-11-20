import crypto from 'node:crypto';
import { Otp } from '../models/Otp.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { mail } from './notify.js';

const TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_SECONDS = 60;

const hash = (email, purpose, code) => crypto.createHmac('sha256', env.jwtSecret).update(`${email}|${purpose}|${code}`).digest('hex');

export async function issueOtp({ email, purpose, name }) {
  const existing = await Otp.findOne({ email, purpose });
  if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_SECONDS * 1000) {
    const wait = Math.ceil((RESEND_SECONDS * 1000 - (Date.now() - existing.lastSentAt.getTime())) / 1000);
    throw new ApiError(429, `Please wait ${wait} seconds before asking for another code.`, { retryAfter: wait });
  }
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await Otp.findOneAndUpdate(
    { email, purpose },
    { codeHash: hash(email, purpose, code), attempts: 0, lastSentAt: new Date(), expiresAt: new Date(Date.now() + TTL_MIN * 60 * 1000) },
    { upsert: true }
  );
  void mail(email, purpose === 'verify' ? 'otpVerify' : 'otpReset', { name, code });
  return { expiresInMinutes: TTL_MIN, resendAfterSeconds: RESEND_SECONDS };
}

export async function checkOtp({ email, purpose, code }) {
  const rec = await Otp.findOne({ email, purpose });
  if (!rec || rec.expiresAt < new Date()) throw new ApiError(400, 'This code has expired. Please request a new one.', { code: 'OTP_EXPIRED' });
  if (rec.attempts >= MAX_ATTEMPTS) {
    await rec.deleteOne();
    throw new ApiError(429, 'Too many wrong attempts. Please request a new code.', { code: 'OTP_LOCKED' });
  }
  const ok = hash(email, purpose, String(code || '').trim()) === rec.codeHash;
  if (!ok) {
    rec.attempts += 1;
    await rec.save();
    const left = MAX_ATTEMPTS - rec.attempts;
    throw new ApiError(400, left > 0 ? `Incorrect code. ${left} ${left === 1 ? 'try' : 'tries'} left.` : 'Too many wrong attempts. Please request a new code.', { code: 'OTP_WRONG' });
  }
  await rec.deleteOne();
  return true;
}
