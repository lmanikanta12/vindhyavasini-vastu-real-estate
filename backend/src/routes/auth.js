import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Otp } from '../models/Otp.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { authLimiter, otpLimiter } from '../middleware/security.js';
import { issueOtp, checkOtp } from '../services/otp.js';
import { mail, notifyAdmins } from '../services/notify.js';
import { ApiError, bad, forbidden, unauthorized } from '../utils/ApiError.js';
import { isEmail, normEmail, requireFields, str, todayISO } from '../utils/helpers.js';
import { applyProfile } from './users.js';
import { logActivity } from '../services/activity.js';

export const LEGAL_VERSION = '2026-10';
import { hashPw, validatePassword } from '../utils/password.js';

const r = Router();

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

r.post('/register', authLimiter, async (req, res) => {
  const { name, email, phone, password } = req.body || {};
  if (req.body?.acceptTerms !== true) throw bad('Please accept the Terms & Conditions and the Privacy Policy to create an account.');
  requireFields(req.body || {}, { name: 'Name', email: 'Email', phone: 'Phone number', password: 'Password' });
  if (!isEmail(email)) throw bad('Enter a valid email address.');
  if (String(phone).replace(/\D/g, '').length < 10) throw bad('Enter a valid phone number.');
  validatePassword(password);
  const mailId = normEmail(email);

  let user = await User.findOne({ email: mailId });
  if (user && (user.emailVerified || user.role !== 'customer')) throw new ApiError(409, 'An account with this email already exists. Please log in.');
  const passwordHash = await hashPw(password);
  if (user) {

    Object.assign(user, { name: str(name, 80), phone: str(phone, 20), passwordHash, consent: { acceptedAt: new Date(), version: LEGAL_VERSION } });
    await user.save();
  } else {
    user = await User.create({ name: str(name, 80), email: mailId, phone: str(phone, 20), passwordHash, role: 'customer', joined: todayISO(), emailVerified: false, prefs: { email: true }, consent: { acceptedAt: new Date(), version: LEGAL_VERSION } });
  }
  const info = await issueOtp({ email: mailId, purpose: 'verify', name: user.name });
  await logActivity(user, { action: 'auth.register', entityType: 'user', entity: user, entityRef: user.email, summary: `${user.name} registered and accepted the Terms, Privacy Policy and Disclaimer`, req });
  res.status(201).json({ ok: true, email: mailId, message: 'We sent a 6-digit code to your email.', ...info });
});

r.post('/verify-email', otpLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const user = await User.findOne({ email });
  if (!user) throw bad('No sign-up found for this email.');
  if (!user.emailVerified) {
    await checkOtp({ email, purpose: 'verify', code: req.body?.otp });
    user.emailVerified = true;
    await user.save();
    await logActivity(user, { action: 'auth.email_verified', entityType: 'user', entity: user, entityRef: user.email, summary: 'Email address verified', req });
    void mail(user.email, 'welcome', { name: user.name, role: user.role });
    void notifyAdmins({ title: 'New customer registered', text: `${user.name} (${user.email}) joined.`, to: '/admin/users', type: 'user' });
  }
  res.json({ token: signToken(user), user });
});

r.post('/resend-otp', otpLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const purpose = req.body?.purpose === 'reset' ? 'reset' : 'verify';
  const user = await User.findOne({ email });

  if (user && user.status === 'Active' && (purpose === 'reset' || !user.emailVerified)) {
    const info = await issueOtp({ email, purpose, name: user.name });
    return res.json({ ok: true, message: 'A new code has been sent.', ...info });
  }
  res.json({ ok: true, message: 'If this email is registered, a new code has been sent.' });
});

r.post('/login', authLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const password = String(req.body?.password || '');
  if (!email || !password) throw bad('Enter your email and password.');
  const user = await User.findOne({ email });
  const generic = unauthorized('Incorrect email or password.');
  if (!user) throw generic;
  if (user.lockUntil && user.lockUntil > new Date()) {
    const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new ApiError(423, `Too many wrong attempts. Try again in ${mins} minute${mins > 1 ? 's' : ''} or reset your password.`, { code: 'LOCKED' });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    user.loginAttempts += 1;
    await logActivity(user, { action: 'auth.login_failed', entityType: 'user', entity: user, entityRef: user.email, summary: `Wrong password (attempt ${user.loginAttempts >= MAX_FAILS ? MAX_FAILS : user.loginAttempts})`, req });
    if (user.loginAttempts >= MAX_FAILS) {
      user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      user.loginAttempts = 0;
    }
    await user.save();
    throw generic;
  }
  if (user.status !== 'Active') throw forbidden('This account is inactive. Please contact the administrator.');
  if (!user.emailVerified) {
    try { await issueOtp({ email, purpose: 'verify', name: user.name }); } catch {}
    throw new ApiError(403, 'Please verify your email. We sent you a code.', { code: 'EMAIL_NOT_VERIFIED', email });
  }
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();
  await logActivity(user, { action: 'auth.login', entityType: 'user', entity: user, entityRef: user.email, summary: `${user.name} logged in as ${user.role}`, req });
  res.json({ token: signToken(user), user });
});

r.post('/forgot-password', otpLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  if (!isEmail(email)) throw bad('Enter a valid email address.');
  const user = await User.findOne({ email });
  let info = {};
  if (user && user.status === 'Active') info = await issueOtp({ email, purpose: 'reset', name: user.name });
  res.json({ ok: true, message: 'If this email is registered, we have sent a 6-digit code.', ...info });
});

r.post('/verify-reset-otp', otpLimiter, async (req, res) => {
  const email = normEmail(req.body?.email);
  const user = await User.findOne({ email });
  if (!user || user.status !== 'Active') throw bad('This code is not valid. Please request a new one.');
  await checkOtp({ email, purpose: 'reset', code: req.body?.otp });

  const resetToken = jwt.sign({ id: String(user._id), purpose: 'reset', pv: user.passwordHash.slice(-10) }, env.jwtSecret, { expiresIn: '10m' });
  res.json({ ok: true, resetToken });
});

r.post('/reset-password', authLimiter, async (req, res) => {
  let payload;
  try { payload = jwt.verify(String(req.body?.resetToken || ''), env.jwtSecret); } catch { throw bad('This reset link has expired. Please start again.', { code: 'RESET_EXPIRED' }); }
  if (payload.purpose !== 'reset') throw bad('Invalid reset request.');
  validatePassword(req.body?.password);
  const user = await User.findById(payload.id);
  if (!user || user.passwordHash.slice(-10) !== payload.pv) throw bad('This reset link has expired. Please start again.', { code: 'RESET_EXPIRED' });
  user.passwordHash = await hashPw(req.body.password);
  user.loginAttempts = 0;
  user.lockUntil = null;
  user.emailVerified = true;
  await user.save();
  await Otp.deleteMany({ email: user.email });
  await logActivity(user, { action: 'auth.password_reset', entityType: 'user', entity: user, entityRef: user.email, summary: 'Password reset with email OTP', req });
  void mail(user.email, 'passwordChanged', { name: user.name });
  res.json({ ok: true, message: 'Password updated. You can log in now.' });
});

r.post('/change-password', requireAuth, authLimiter, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!(await bcrypt.compare(String(currentPassword || ''), req.user.passwordHash))) throw bad('Current password is incorrect.');
  validatePassword(newPassword);
  if (currentPassword === newPassword) throw bad('Choose a password different from the current one.');
  req.user.passwordHash = await hashPw(newPassword);
  await req.user.save();
  await logActivity(req.user, { action: 'auth.password_changed', entityType: 'user', entity: req.user, entityRef: req.user.email, summary: 'Password changed', req });
  void mail(req.user.email, 'passwordChanged', { name: req.user.name });
  res.json({ ok: true, message: 'Password updated.' });
});

r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

r.patch('/me', requireAuth, async (req, res) => {
  applyProfile(req.user, req.body || {}, { admin: false });
  await req.user.save();
  res.json({ user: req.user });
});

export default r;
