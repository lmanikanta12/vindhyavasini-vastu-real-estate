import { Router } from 'express';
import { ConstructionRequest, CONSTRUCTION_STATUSES, CONSTRUCTION_TYPES } from '../models/ConstructionRequest.js';
import { User } from '../models/User.js';
import { nextRef } from '../models/Counter.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { rateLimitPublicForms } from '../middleware/security.js';
import { mail, notify, notifyAdmins } from '../services/notify.js';
import { userName } from '../services/lookup.js';
import { logActivity } from '../services/activity.js';
import { bad } from '../utils/ApiError.js';
import { findOrFail, idOrNull, isEmail, normEmail, requireFields, str } from '../utils/helpers.js';

const r = Router();

r.post('/', optionalAuth, rateLimitPublicForms, async (req, res) => {
  const b = req.body || {};
  const c = b.contact || {};
  requireFields(c, { name: 'Name', email: 'Email', phone: 'Phone number' });
  if (!isEmail(c.email)) throw bad('Enter a valid email address.');
  if (String(c.phone).replace(/\D/g, '').length < 10) throw bad('Enter a valid phone number.');
  if (!CONSTRUCTION_TYPES.includes(b.type)) throw bad('Choose a project type.');
  requireFields(b, { location: 'Location' });

  const doc = await ConstructionRequest.create({
    ref: await nextRef('construction'),
    customerId: req.user?.role === 'customer' ? req.user._id : null,
    contact: { name: str(c.name, 80), email: normEmail(c.email), phone: str(c.phone, 20) },
    type: b.type,
    location: str(b.location, 200),
    plotSize: str(b.plotSize, 80),
    budget: str(b.budget, 80),
    message: str(b.message, 1500),
  });

  void mail(doc.contact.email, 'constructionCustomer', { name: doc.contact.name, ref: doc.ref, type: doc.type, location: doc.location });
  if (doc.customerId) await notify(doc.customerId, { title: 'Construction request sent', text: `${doc.ref} (${doc.type}) was received.`, to: '/customer/construction', type: 'construction' });
  await notifyAdmins({ title: 'New construction request', text: `${doc.contact.name} asked about ${doc.type.toLowerCase()} in ${doc.location} (${doc.ref}).`, to: '/admin/construction', type: 'construction' });
  await logActivity(req.user || null, { action: 'construction.created', entityType: 'construction', entity: doc, summary: `Construction request from ${doc.contact.name}${req.user ? '' : ' (guest)'}`, req });
  res.status(201).json({ request: doc });
});

r.get('/', requireAuth, requireRole('customer', 'admin'), async (req, res) => {
  const q = req.user.role === 'admin' ? {} : { customerId: req.user._id };
  const items = await ConstructionRequest.find(q).sort({ createdAt: -1 }).limit(300);
  res.json({ items });
});

r.patch('/:id', requireRole('admin'), async (req, res) => {
  const doc = await findOrFail(ConstructionRequest, req.params.id, 'Construction request');
  const b = req.body || {};
  const was = { status: doc.status, agent: String(doc.assignedTo || ''), quote: doc.quote };

  if (b.assignedTo !== undefined) {
    if (b.assignedTo) {
      const a = idOrNull(b.assignedTo) && (await User.findById(b.assignedTo));
      if (!a || a.role !== 'agent' || a.status !== 'Active') throw bad('Choose an active agent.');
      doc.assignedTo = a._id;
    } else doc.assignedTo = null;
  }
  if (b.quote !== undefined) {
    if (b.quote === null || b.quote === '') doc.quote = null;
    else {
      const n = Number(b.quote);
      if (!Number.isFinite(n) || n < 0 || n > 1e10) throw bad('Enter a valid quote amount.');
      doc.quote = Math.round(n);
    }
  }
  if (b.status !== undefined) {
    if (!CONSTRUCTION_STATUSES.includes(b.status)) throw bad('Invalid status.');
    doc.status = b.status;
  }
  await doc.save();

  if (was.status !== doc.status || was.quote !== doc.quote) {
    const data = { name: doc.contact.name, ref: doc.ref, type: doc.type, status: doc.status, quote: doc.quote };
    if (doc.customerId) await notify(doc.customerId, { title: `Construction ${doc.status.toLowerCase()}`, text: `${doc.ref} is now ${doc.status}.`, to: '/customer/construction', type: 'construction' }, { email: { template: 'constructionUpdate', data } });
    else void mail(doc.contact.email, 'constructionUpdate', data);
  }
  if (was.status !== doc.status) await logActivity(req.user, { action: 'construction.status_changed', entityType: 'construction', entity: doc, summary: `${doc.ref} changed from ${was.status} to ${doc.status}`, req });
  if (was.agent !== String(doc.assignedTo || '') && doc.assignedTo) {
    await notify(doc.assignedTo, { title: 'Construction request assigned', text: `${doc.contact.name}: ${doc.type} in ${doc.location} (${doc.ref}). Phone ${doc.contact.phone}.`, to: '/agent', type: 'construction' });
    await logActivity(req.user, { action: 'construction.assigned', entityType: 'construction', entity: doc, summary: `${doc.ref} assigned to ${(await userName(doc.assignedTo)) || 'nobody'}`, req });
  }
  if (was.quote !== doc.quote) await logActivity(req.user, { action: 'construction.quoted', entityType: 'construction', entity: doc, summary: `${doc.ref} quote set to ${doc.quote ?? 'none'}`, req });
  res.json({ request: doc });
});

r.post('/:id/notes', requireRole('admin'), async (req, res) => {
  const doc = await findOrFail(ConstructionRequest, req.params.id, 'Construction request');
  const text = str(req.body?.text, 1000);
  if (!text) throw bad('Write a note first.');
  doc.notes.push({ text, by: req.user.name, byId: req.user._id });
  await doc.save();
  res.status(201).json({ request: doc });
});

export default r;
