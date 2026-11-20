import { Router } from 'express';
import { Enquiry } from '../models/Enquiry.js';
import { Property } from '../models/Property.js';
import { User } from '../models/User.js';
import { nextRef } from '../models/Counter.js';
import { optionalAuth, requireAuth, requireRole } from '../middleware/auth.js';
import { rateLimitPublicForms } from '../middleware/security.js';
import { mail, notify, notifyAdmins } from '../services/notify.js';
import { userName } from '../services/lookup.js';
import { logActivity } from '../services/activity.js';
import { buildRefs, pageParams, paged, rx, userIdsLike } from '../utils/paginate.js';
import { bad, forbidden } from '../utils/ApiError.js';
import { findOrFail, idOrNull, isEmail, normEmail, requireFields, str } from '../utils/helpers.js';

const r = Router();
const STATUSES = ['New', 'Contacted', 'Scheduled', 'Completed', 'Closed'];

export async function enquiryScope(user) {
  if (user.role === 'admin') return {};
  if (user.role === 'customer') return { customerId: user._id };
  if (user.role === 'agent') {
    const mine = await Property.find({ agentId: user._id }, '_id');
    return { $or: [{ assignedTo: user._id }, { propertyId: { $in: mine.map((p) => p._id) } }] };
  }
  return { _id: null };
}

const canManage = async (user, e) => {
  if (user.role === 'admin') return true;
  if (user.role !== 'agent') return false;
  if (String(e.assignedTo) === String(user._id)) return true;
  const p = e.propertyId && (await Property.findById(e.propertyId, 'agentId'));
  return !!p && String(p.agentId) === String(user._id);
};

r.post('/', optionalAuth, rateLimitPublicForms, async (req, res) => {
  const b = req.body || {};
  const c = b.contact || {};
  requireFields(c, { name: 'Name', email: 'Email', phone: 'Phone number' });
  if (!isEmail(c.email)) throw bad('Enter a valid email address.');
  if (String(c.phone).replace(/\D/g, '').length < 10) throw bad('Enter a valid phone number.');
  requireFields(b, { message: 'Message' });

  const property = idOrNull(b.propertyId) ? await Property.findById(b.propertyId) : null;
  if (b.propertyId && (!property || !property.published)) throw bad('This property is no longer available.');
  const agent = property?.agentId ? await User.findById(property.agentId) : null;
  const customerId = req.user?.role === 'customer' ? req.user._id : null;

  const e = await Enquiry.create({
    ref: await nextRef('enquiry'),
    propertyId: property?._id || null,
    customerId,
    contact: { name: str(c.name, 80), email: normEmail(c.email), phone: str(c.phone, 20) },
    message: str(b.message, 1500),
    requirements: str(b.requirements, 1500),
    status: 'New',
    assignedTo: agent && agent.status === 'Active' ? agent._id : null,
  });

  void mail(e.contact.email, 'enquiryCustomer', { name: e.contact.name, ref: e.ref, property: property?.title, agent: agent?.name });
  if (customerId) await notify(customerId, { title: 'Enquiry sent', text: `${e.ref} about ${property?.title || 'your question'} was sent.`, to: '/customer/enquiries', type: 'enquiry' });
  if (e.assignedTo) {
    await notify(agent, { title: 'New enquiry assigned', text: `${e.contact.name} about ${property?.title || 'a general question'}.`, to: '/agent/enquiries', type: 'enquiry' }, {
      email: { template: 'enquiryAgent', data: { agentName: agent.name, ref: e.ref, property: property?.title, customer: e.contact.name, phone: e.contact.phone, email: e.contact.email, message: e.message } },
      critical: true,
    });
  } else {
    await notifyAdmins({ title: 'Unassigned enquiry', text: `${e.contact.name} sent a ${property ? 'property' : 'general'} enquiry (${e.ref}). Please assign an agent.`, to: '/admin/enquiries', type: 'enquiry' });
  }
  await logActivity(req.user || null, { action: 'enquiry.created', entityType: 'enquiry', entity: e, summary: `Enquiry from ${e.contact?.name}${req.user ? '' : ' (guest)'}`, req });
  res.status(201).json({ enquiry: e });
});

r.get('/', requireAuth, async (req, res) => {
  const q = await enquiryScope(req.user);
  if (req.query.status && STATUSES.includes(req.query.status)) q.status = req.query.status;
  if (req.query.page === undefined) {
    const items = await Enquiry.find(q).sort({ createdAt: -1 }).limit(500);
    return res.json({ items: req.user.role === 'customer' ? items.map(customerView) : items });
  }
  const g = req.query;
  if (idOrNull(g.assignedTo) && req.user.role === 'admin') q.assignedTo = g.assignedTo;
  if (g.q) {
    const [people, props] = await Promise.all([userIdsLike(g.q), Property.find({ title: rx(g.q) }, '_id').limit(60)]);
    q.$and = [...(q.$and || []), { $or: [{ ref: rx(g.q) }, { 'contact.name': rx(g.q) }, { 'contact.email': rx(g.q) }, { 'contact.phone': rx(g.q) }, ...(people.length ? [{ assignedTo: { $in: people } }] : []), ...(props.length ? [{ propertyId: { $in: props.map((x) => x._id) } }] : [])] }];
  }
  const params = pageParams(g, { sortable: ['createdAt', 'status', 'ref'], defaultLimit: 15 });
  const out = await paged(Enquiry, q, params);
  const items = req.user.role === 'customer' ? out.items.map(customerView) : out.items;
  res.json({ items, total: out.total, page: out.page, pages: out.pages, limit: out.limit, refs: await buildRefs(out.rows, { users: ['customerId', 'assignedTo'], properties: ['propertyId'] }) });
});

export const customerView = (e) => { const o = e.toJSON(); o.notes = (o.notes || []).filter((n) => !n.private); return o; };

r.patch('/:id', requireRole('agent', 'admin'), async (req, res) => {
  const e = await findOrFail(Enquiry, req.params.id, 'Enquiry');
  if (!(await canManage(req.user, e))) throw forbidden();
  const b = req.body || {};
  const prop = e.propertyId ? await Property.findById(e.propertyId, 'title') : null;
  const wasStatus = e.status;
  const wasAgent = String(e.assignedTo || '');

  if (b.assignedTo !== undefined) {
    if (req.user.role !== 'admin') throw forbidden('Only the administrator can assign enquiries.');
    if (b.assignedTo) {
      const a = idOrNull(b.assignedTo) && (await User.findById(b.assignedTo));
      if (!a || a.role !== 'agent' || a.status !== 'Active') throw bad('Choose an active agent.');
      if (String(e.assignedTo) !== String(a._id)) {
        e.assignedTo = a._id;
        e.notes.push({ text: `Assigned to ${a.name}.`, by: req.user.name, byId: req.user._id });
        await notify(a, { title: 'Enquiry assigned to you', text: `${e.contact.name} about ${prop?.title || 'a general question'} (${e.ref}).`, to: '/agent/enquiries', type: 'enquiry' }, {
          email: { template: 'enquiryAgent', data: { agentName: a.name, ref: e.ref, property: prop?.title, customer: e.contact.name, phone: e.contact.phone, email: e.contact.email, message: e.message } },
          critical: true,
        });
        if (e.customerId) await notify(e.customerId, { title: 'Agent assigned', text: `${a.name} will handle your enquiry ${e.ref}.`, to: '/customer/enquiries', type: 'enquiry' });
      }
    } else e.assignedTo = null;
  }

  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) throw bad('Invalid status.');
    if (b.status !== e.status) {
      e.status = b.status;
      const agentName = await userName(e.assignedTo);
      if (e.customerId) {
        await notify(e.customerId, { title: `Enquiry ${b.status.toLowerCase()}`, text: `${e.ref} is now ${b.status}.`, to: '/customer/enquiries', type: 'enquiry' }, { email: { template: 'enquiryUpdate', data: { ref: e.ref, property: prop?.title, status: b.status, agent: agentName } } });
      } else if (e.contact?.email) {
        void mail(e.contact.email, 'enquiryUpdate', { name: e.contact.name, ref: e.ref, property: prop?.title, status: b.status, agent: agentName });
      }
    }
  }
  await e.save();
  if (wasStatus !== e.status) await logActivity(req.user, { action: 'enquiry.status_changed', entityType: 'enquiry', entity: e, summary: `${e.ref} changed from ${wasStatus} to ${e.status}`, req });
  if (wasAgent !== String(e.assignedTo || '')) await logActivity(req.user, { action: 'enquiry.assigned', entityType: 'enquiry', entity: e, summary: `${e.ref} assigned to ${(await userName(e.assignedTo)) || 'nobody'}`, req });
  res.json({ enquiry: e });
});

r.post('/:id/notes', requireRole('agent', 'admin'), async (req, res) => {
  const e = await findOrFail(Enquiry, req.params.id, 'Enquiry');
  if (!(await canManage(req.user, e))) throw forbidden();
  const text = str(req.body?.text, 1000);
  if (!text) throw bad('Write a note first.');
  e.notes.push({ text, by: req.user.name, byId: req.user._id, private: req.body?.private === true });
  await e.save();
  res.status(201).json({ enquiry: e });
});

export default r;
