import { Router } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Notification } from '../models/Notification.js';
import { Shortlist } from '../models/Shortlist.js';
import { Property } from '../models/Property.js';
import { Setting, getSettings } from '../models/Setting.js';
import { requireAuth, requireRole, optionalAuth } from '../middleware/auth.js';
import { outbox, emailMode } from '../services/email.js';
import { env } from '../config/env.js';
import { logActivity } from '../services/activity.js';
import { saveFile, storageMode } from '../services/storage.js';
import { bad, notFound } from '../utils/ApiError.js';
import { findOrFail, num, str } from '../utils/helpers.js';

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads');

export const notifications = Router();
notifications.get('/', requireAuth, async (req, res) => {
  const [items, unread] = await Promise.all([Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(40), Notification.countDocuments({ userId: req.user._id, read: false })]);
  res.json({ items, unread });
});
notifications.post('/read-all', requireAuth, async (req, res) => { await Notification.updateMany({ userId: req.user._id, read: false }, { read: true }); res.json({ ok: true }); });
notifications.patch('/:id/read', requireAuth, async (req, res) => {
  const n = await findOrFail(Notification, req.params.id, 'Notification');
  if (String(n.userId) !== String(req.user._id)) throw notFound('Notification not found.');
  n.read = true;
  await n.save();
  res.json({ notification: n });
});
notifications.delete('/', requireAuth, async (req, res) => { await Notification.deleteMany({ userId: req.user._id }); res.json({ ok: true }); });

export const shortlist = Router();
shortlist.get('/', requireRole('customer'), async (req, res) => res.json({ propertyIds: (await Shortlist.find({ userId: req.user._id })).map((s) => String(s.propertyId)) }));
shortlist.post('/:propertyId', requireRole('customer'), async (req, res) => {
  const p = await findOrFail(Property, req.params.propertyId, 'Property');
  const existing = await Shortlist.findOne({ userId: req.user._id, propertyId: p._id });
  if (existing) { await existing.deleteOne(); return res.json({ shortlisted: false }); }
  await Shortlist.create({ userId: req.user._id, propertyId: p._id });
  res.json({ shortlisted: true });
});

export const settings = Router();
settings.get('/', async (_req, res) => res.json({ settings: await getSettings() }));
settings.patch('/', requireRole('admin'), async (req, res) => {
  const s = await getSettings();
  const b = req.body || {};
  for (const k of ['businessName', 'email', 'phone', 'address', 'hours']) if (b[k] !== undefined) s[k] = str(b[k], 200);
  if (b.emailReminders !== undefined) s.emailReminders = b.emailReminders === true;
  if (b.reminderLeadHours !== undefined) {
    const h = num(b.reminderLeadHours, 24);
    if (h < 1 || h > 168) throw bad('Reminder time must be between 1 and 168 hours.');
    s.reminderLeadHours = h;
  }
  await s.save();
  await logActivity(req.user, { action: 'settings.updated', entityType: 'settings', entityRef: 'Settings', summary: `Settings changed: ${Object.keys(b).join(', ')}`, req });
  res.json({ settings: s });
});

const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf', 'text/plain': 'txt' };
const MAX_BYTES = 8 * 1024 * 1024;

export const uploads = Router();

uploads.post('/', requireAuth, async (req, res) => {
  const { name, dataUrl } = req.body || {};
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m || !TYPES[m[1]]) throw bad('Only JPG, PNG, WEBP, PDF or text files are allowed.');
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length) throw bad('The file is empty.');
  if (buf.length > MAX_BYTES) throw bad('The file is larger than 8 MB.');
  const url = await saveFile(buf, m[1], TYPES[m[1]], UPLOAD_DIR);
  res.status(201).json({ url, name: str(name, 120) || url.split('/').pop(), size: buf.length, type: m[1] });
});

export const system = Router();
system.get('/health', (_req, res) => res.json({ ok: true, time: new Date().toISOString(), email: emailMode(), payments: env.paymentMode, storage: storageMode() }));
if (env.exposeOutbox) {

  system.get('/dev/outbox', (_req, res) => res.json({ emails: outbox }));
  system.delete('/dev/outbox', (_req, res) => { outbox.length = 0; res.json({ ok: true }); });
}
void optionalAuth; void Setting;
