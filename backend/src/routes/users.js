import { Router } from 'express';
import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { Property } from '../models/Property.js';
import { Enquiry } from '../models/Enquiry.js';
import { SiteVisit } from '../models/SiteVisit.js';
import { Consultation } from '../models/Consultation.js';
import { Shortlist } from '../models/Shortlist.js';
import { Notification } from '../models/Notification.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { mail } from '../services/notify.js';
import { logActivity } from '../services/activity.js';
import { pageParams } from '../utils/paginate.js';
import { hashPw } from '../utils/password.js';
import { bad, conflict, forbidden } from '../utils/ApiError.js';
import { escapeRegex, findOrFail, isEmail, normEmail, num, requireFields, str, strList, todayISO } from '../utils/helpers.js';

const r = Router();
const ROLES = ['customer', 'agent', 'consultant', 'admin'];

const cleanAvailability = (a = {}) => ({
  days: (Array.isArray(a.days) ? a.days : []).map(Number).filter((d) => d >= 0 && d <= 6),
  slots: (Array.isArray(a.slots) ? a.slots : []).map(String).filter((t) => /^\d{2}:\d{2}$/.test(t)).sort(),
  blocked: (Array.isArray(a.blocked) ? a.blocked : []).map(String).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
});

export function applyProfile(user, body, { admin }) {
  if (body.name !== undefined) {
    if (!str(body.name)) throw bad('Name cannot be empty.');
    user.name = str(body.name, 80);
  }
  if (body.phone !== undefined) user.phone = str(body.phone, 20);
  if (body.city !== undefined) user.city = str(body.city, 60);
  if (body.address !== undefined) user.address = str(body.address, 200);
  if (body.prefs && typeof body.prefs === 'object') user.prefs = { email: body.prefs.email !== false };
  const staff = ['agent', 'consultant'].includes(user.role);
  if (staff) {
    if (body.bio !== undefined) user.bio = str(body.bio, 600);
    if (body.experience !== undefined) user.experience = Math.max(0, num(body.experience));
    if (body.areas !== undefined) user.areas = strList(body.areas);
    if (body.languages !== undefined) user.languages = strList(body.languages);
  }
  if (user.role === 'agent') {
    if (body.availability !== undefined) user.availability = cleanAvailability(body.availability);
    if (body.workingDays !== undefined) user.workingDays = (Array.isArray(body.workingDays) ? body.workingDays : []).map(Number).filter((d) => d >= 0 && d <= 6);
    if (body.workHours !== undefined) user.workHours = str(body.workHours, 40);
  }
  if (user.role === 'consultant') {
    if (body.specialization !== undefined) user.specialization = str(body.specialization, 80);
    if (body.availability !== undefined) user.availability = cleanAvailability(body.availability);
  }
  if (admin) {
    if (body.status !== undefined) {
      if (!['Active', 'Inactive'].includes(body.status)) throw bad('Invalid status.');
      user.status = body.status;
    }
  }
}

r.get('/', requireRole('admin'), async (req, res) => {
  const q = {};
  if (req.query.role && ROLES.includes(req.query.role)) q.role = req.query.role;
  if (req.query.q) {
    const rx = new RegExp(escapeRegex(String(req.query.q)), 'i');
    q.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  if (['Active', 'Inactive'].includes(req.query.status)) q.status = req.query.status;
  if (req.query.staff === 'true') q.role = { $in: ['agent', 'consultant'] };
  const p = pageParams(req.query, { sortable: ['createdAt', 'name', 'email', 'role', 'status'], defaultLimit: 15 });
  const [items, total] = await Promise.all([User.find(q).sort(p.sort).skip(p.skip).limit(p.limit), User.countDocuments(q)]);
  res.json({ items, total, page: p.page, limit: p.limit, pages: Math.max(1, Math.ceil(total / p.limit)) });
});

r.post('/', requireRole('admin'), async (req, res) => {
  const b = req.body || {};
  requireFields(b, { name: 'Name', email: 'Email' });
  if (!isEmail(b.email)) throw bad('Enter a valid email address.');
  const role = ROLES.includes(b.role) ? b.role : 'customer';
  const email = normEmail(b.email);
  if (await User.exists({ email })) throw conflict('This email is already registered.');
  const temp = b.password && String(b.password).length >= 8 ? String(b.password) : `Ve${crypto.randomBytes(4).toString('hex')}9`;
  const user = new User({ name: str(b.name, 80), email, phone: str(b.phone, 20), passwordHash: await hashPw(temp), role, status: b.status === 'Inactive' ? 'Inactive' : 'Active', emailVerified: true, joined: todayISO() });
  if (role === 'consultant') {
    user.specialization = 'General Vastu';
    user.availability = { days: [1, 2, 3, 4, 5], slots: ['10:00', '14:00'], blocked: [] };
  }
  if (role === 'agent') { user.workingDays = [1, 2, 3, 4, 5]; user.availability = { days: [1, 2, 3, 4, 5, 6], slots: ['09:30', '11:00', '12:30', '15:00', '16:30'], blocked: [] }; }
  applyProfile(user, b, { admin: true });
  await user.save();
  void mail(user.email, 'accountCreated', { name: user.name, role: user.role, email: user.email, password: temp });
  await logActivity(req.user, { action: 'user.created', entityType: 'user', entity: user, entityRef: user.email, summary: `${user.role} account created for ${user.name}`, req });
  res.status(201).json({ user, tempPassword: b.password ? undefined : temp });
});

r.patch('/:id', requireAuth, async (req, res) => {
  const user = await findOrFail(User, req.params.id, 'User');
  const isSelf = String(user._id) === String(req.user._id);
  const isAdmin = req.user.role === 'admin';
  if (!isSelf && !isAdmin) throw forbidden();
  const b = req.body || {};
  if (isAdmin) {
    if (b.email !== undefined && normEmail(b.email) !== user.email) {
      if (!isEmail(b.email)) throw bad('Enter a valid email address.');
      if (await User.exists({ email: normEmail(b.email), _id: { $ne: user._id } })) throw conflict('This email is already registered.');
      user.email = normEmail(b.email);
    }
    if (b.role !== undefined && b.role !== user.role) {
      if (!ROLES.includes(b.role)) throw bad('Invalid role.');
      if (isSelf) throw bad('You cannot change your own role.');
      user.role = b.role;
    }
    if (isSelf && b.status === 'Inactive') throw bad('You cannot deactivate your own account.');
  }
  const wasStatus = user.status;
  const wasRole = user.role;
  applyProfile(user, b, { admin: isAdmin });
  await user.save();
  const bits = [];
  if (wasStatus !== user.status) bits.push(`status ${wasStatus} -> ${user.status}`);
  if (wasRole !== user.role) bits.push(`role ${wasRole} -> ${user.role}`);
  if (b.availability !== undefined) bits.push('availability');
  await logActivity(req.user, { action: wasStatus !== user.status ? 'user.status_changed' : b.availability !== undefined ? 'user.availability_changed' : 'user.updated', entityType: 'user', entity: user, entityRef: user.email, summary: `${user.name}: ${bits.join(', ') || 'profile updated'}${isSelf ? '' : ' (by admin)'}`, req });
  res.json({ user });
});

r.delete('/:id', requireRole('admin'), async (req, res) => {
  const user = await findOrFail(User, req.params.id, 'User');
  if (String(user._id) === String(req.user._id)) throw bad('You cannot delete your own account.');
  if (user.role === 'admin' && (await User.countDocuments({ role: 'admin' })) <= 1) throw bad('At least one administrator must remain.');
  if (user.role === 'consultant' && (await Consultation.exists({ consultantId: user._id, status: { $in: ['Requested', 'Confirmed'] } }))) {
    throw conflict('This consultant has open consultations. Reassign or cancel them first, or deactivate the account instead.');
  }
  if (user.role === 'agent' && (await SiteVisit.exists({ agentId: user._id, status: { $in: ['Requested', 'Scheduled'] } }))) {
    throw conflict('This agent has open site visits. Reassign them first, or deactivate the account instead.');
  }

  await Property.updateMany({ agentId: user._id }, { agentId: req.user._id });
  await Enquiry.updateMany({ assignedTo: user._id }, { assignedTo: req.user._id });
  await SiteVisit.updateMany({ agentId: user._id }, { agentId: req.user._id });
  await Shortlist.deleteMany({ userId: user._id });
  await Notification.deleteMany({ userId: user._id });
  await logActivity(req.user, { action: 'user.deleted', entityType: 'user', entity: user, entityRef: user.email, summary: `${user.role} account ${user.name} deleted`, req });
  await user.deleteOne();
  res.json({ ok: true });
});

export default r;
