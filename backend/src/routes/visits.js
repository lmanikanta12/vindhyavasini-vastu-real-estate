import { Router } from 'express';
import { SiteVisit } from '../models/SiteVisit.js';
import { Property } from '../models/Property.js';
import { Enquiry } from '../models/Enquiry.js';
import { User } from '../models/User.js';
import { nextRef } from '../models/Counter.js';
import { requireAuth } from '../middleware/auth.js';
import { mail, notify } from '../services/notify.js';
import { agentAvailability, agentScheduleProblem, assertAgentFree, takenVisitSlots } from '../services/slots.js';
import { propTitle, userName } from '../services/lookup.js';
import { logActivity } from '../services/activity.js';
import { buildRefs, pageParams, paged, rx, userIdsLike } from '../utils/paginate.js';
import { bad, conflict, forbidden } from '../utils/ApiError.js';
import { fmtDateLong, fmtTime12, findOrFail, idOrNull, isISODate, isPastSlot, isTime, str } from '../utils/helpers.js';

const r = Router();
const STATUSES = ['Requested', 'Scheduled', 'Completed', 'Cancelled'];

export const visitScope = (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'customer') return { customerId: user._id };
  if (user.role === 'agent') return { agentId: user._id };
  return { _id: null };
};

async function tell(v, to, status, kind) {
  const title = await propTitle(v.propertyId);
  const property = await Property.findById(v.propertyId, 'address city');
  const data = { ref: v.ref, status, property: title, date: fmtDateLong(v.date), time: fmtTime12(v.time), address: property ? `${property.address}, ${property.city}` : '', kind };
  return { data, to };
}

r.get('/availability', async (req, res) => {
  const { propertyId, agentId, date } = req.query;
  if (!isISODate(date)) throw bad('Choose a date.');
  let id = idOrNull(agentId);
  if (!id && idOrNull(propertyId)) id = (await Property.findById(propertyId, 'agentId'))?.agentId;
  const agent = id && (await User.findById(id, 'name role availability'));
  if (!agent) throw bad('This property has no agent yet.');
  const av = agentAvailability(agent);
  const dayProblem = agent.role === 'agent' ? agentScheduleProblem(agent, date, '') : '';
  const taken = await takenVisitSlots(agent._id, date);
  const slots = dayProblem ? [] : av.slots.filter((t) => !taken.includes(t) && !isPastSlot(date, t));
  res.json({ slots, taken, reason: dayProblem, agent: agent.name });
});

r.post('/', requireAuth, async (req, res) => {
  const b = req.body || {};
  if (!['customer', 'agent', 'admin'].includes(req.user.role)) throw forbidden();
  const property = idOrNull(b.propertyId) && (await Property.findById(b.propertyId));
  if (!property) throw bad('Choose a property.');
  const isCustomer = req.user.role === 'customer';
  if (isCustomer && !property.published) throw bad('This property is no longer available.');

  let agentId = property.agentId;
  if (!isCustomer) {
    agentId = idOrNull(b.agentId) || (req.user.role === 'agent' ? req.user._id : property.agentId);
    const a = await User.findById(agentId);
    if (!a || !['agent', 'admin'].includes(a.role)) throw bad('Choose a valid agent.');
    if (req.user.role === 'agent' && String(a._id) !== String(req.user._id)) throw forbidden('You can only schedule your own visits.');
  }
  if (!agentId) throw bad('This property has no agent yet. Please send an enquiry instead.');

  const enquiry = !isCustomer && idOrNull(b.enquiryId) ? await Enquiry.findById(b.enquiryId) : null;
  let customerId = isCustomer ? req.user._id : idOrNull(b.customerId) || enquiry?.customerId || null;
  if (!isISODate(b.date) || !isTime(b.time)) throw bad('Choose a date and time.');
  await assertAgentFree(agentId, b.date, b.time);

  const v = await SiteVisit.create({
    ref: await nextRef('visit'),
    propertyId: property._id,
    customerId,
    enquiryId: enquiry?._id || null,
    agentId,
    date: b.date,
    time: b.time,
    status: isCustomer ? 'Requested' : 'Scheduled',
    note: str(b.note, 500),
  });

  if (enquiry) {
    enquiry.status = 'Scheduled';
    enquiry.notes.push({ text: `Site visit ${v.ref} scheduled for ${fmtDateLong(v.date)} at ${fmtTime12(v.time)}.`, by: req.user.name, byId: req.user._id });
    await enquiry.save();
  }

  const title = property.title;
  if (isCustomer) {
    const cust = req.user;
    void mail(cust.email, 'visitUpdate', { name: cust.name, ref: v.ref, status: 'Requested', property: title, date: fmtDateLong(v.date), time: fmtTime12(v.time), address: `${property.address}, ${property.city}`, agent: await userName(agentId) });
    await notify(cust, { title: 'Site visit requested', text: `${title} on ${fmtDateLong(v.date)}, ${fmtTime12(v.time)}.`, to: '/customer/appointments', type: 'visit' });
    await notify(agentId, { title: 'Site visit to confirm', text: `${cust.name} requested ${title} on ${fmtDateLong(v.date)}, ${fmtTime12(v.time)}.`, to: '/agent/visits', type: 'visit' }, {
      email: { template: 'visitUpdate', data: { ref: v.ref, status: 'Requested', property: title, date: fmtDateLong(v.date), time: fmtTime12(v.time), agent: cust.name, kind: 'agent' } },
      critical: true,
    });
  } else {
    const t = await tell(v, null, 'Scheduled', 'customer');
    if (customerId) await notify(customerId, { title: 'Site visit scheduled', text: `${title} on ${fmtDateLong(v.date)}, ${fmtTime12(v.time)}.`, to: '/customer/appointments', type: 'visit' }, { email: { template: 'visitUpdate', data: { ...t.data, agent: await userName(agentId) } } });
    else if (enquiry?.contact?.email) void mail(enquiry.contact.email, 'visitUpdate', { ...t.data, name: enquiry.contact.name, agent: await userName(agentId) });
  }
  await logActivity(req.user, { action: 'visit.created', entityType: 'visit', entity: v, summary: `Site visit ${v.ref} ${v.status.toLowerCase()} for ${v.date} ${v.time}`, req });
  res.status(201).json({ visit: v });
});

r.get('/', requireAuth, async (req, res) => {
  const scope = visitScope(req.user);
  if (req.query.page === undefined) return res.json({ items: await SiteVisit.find(scope).sort({ date: 1, time: 1 }).limit(500) });
  const g = req.query;
  const q = { ...scope };
  if (STATUSES.includes(g.status)) q.status = g.status;
  if (g.from || g.to) q.date = { ...(g.from && { $gte: String(g.from) }), ...(g.to && { $lte: String(g.to) }) };
  if (g.q) {
    const [people, props] = await Promise.all([userIdsLike(g.q), Property.find({ title: rx(g.q) }, '_id').limit(60)]);
    q.$and = [{ $or: [{ ref: rx(g.q) }, ...(people.length ? [{ customerId: { $in: people } }, { agentId: { $in: people } }] : []), ...(props.length ? [{ propertyId: { $in: props.map((x) => x._id) } }] : [])] }];
  }
  const params = pageParams(g, { sortable: ['date', 'createdAt', 'status', 'ref'], defaultSort: 'date', defaultDir: -1, defaultLimit: 15 });
  const out = await paged(SiteVisit, q, params);
  res.json({ items: out.items, total: out.total, page: out.page, pages: out.pages, limit: out.limit, refs: await buildRefs(out.rows, { users: ['customerId', 'agentId'], properties: ['propertyId'] }) });
});

r.patch('/:id', requireAuth, async (req, res) => {
  const v = await findOrFail(SiteVisit, req.params.id, 'Site visit');
  const u = req.user;
  const isCustomer = u.role === 'customer' && String(v.customerId) === String(u._id);
  const isAgent = u.role === 'agent' && String(v.agentId) === String(u._id);
  const isAdmin = u.role === 'admin';
  if (!isCustomer && !isAgent && !isAdmin) throw forbidden();
  if (['Completed', 'Cancelled'].includes(v.status) && !isAdmin) throw conflict(`This visit is already ${v.status.toLowerCase()}.`);

  const b = req.body || {};
  const title = await propTitle(v.propertyId);
  const prev = { status: v.status, date: v.date, time: v.time };

  if (b.agentId !== undefined && b.agentId !== String(v.agentId)) {
    if (!isAdmin && !isAgent) throw forbidden();
    const a = idOrNull(b.agentId) && (await User.findById(b.agentId));
    if (!a || a.role !== 'agent' || a.status !== 'Active') throw bad('Choose an active agent.');
    v.agentId = a._id;
    await notify(a, { title: 'Site visit assigned to you', text: `${title} on ${fmtDateLong(v.date)}, ${fmtTime12(v.time)} (${v.ref}).`, to: '/agent/visits', type: 'visit' });
  }

  const moved = (b.date !== undefined && b.date !== v.date) || (b.time !== undefined && b.time !== v.time);
  if (moved) {
    const date = b.date ?? v.date;
    const time = b.time ?? v.time;
    await assertAgentFree(v.agentId, date, time, { ignoreId: v._id });
    v.date = date;
    v.time = time;
    v.reminderSent = false;

    v.status = isCustomer ? 'Requested' : 'Scheduled';
  }

  if (b.status !== undefined && b.status !== v.status) {
    if (!STATUSES.includes(b.status)) throw bad('Invalid status.');
    if (isCustomer && b.status !== 'Cancelled') throw forbidden('You can only cancel your visit.');
    v.status = b.status;
  }
  if (b.note !== undefined && !isCustomer) v.note = str(b.note, 500);
  await v.save();

  const statusChanged = prev.status !== v.status;
  if (moved || statusChanged) {
    const label = moved && v.status !== 'Cancelled' ? (isCustomer ? 'Reschedule requested' : 'Rescheduled') : v.status;
    const nice = { date: fmtDateLong(v.date), time: fmtTime12(v.time) };
    if (isCustomer) {
      await notify(v.agentId, { title: `Site visit ${label.toLowerCase()}`, text: `${req.user.name}: ${title}, ${nice.date} ${nice.time} (${v.ref}).`, to: '/agent/visits', type: 'visit' }, {
        email: { template: 'visitUpdate', data: { ref: v.ref, status: label, property: title, ...nice, agent: req.user.name, kind: 'agent' } }, critical: true,
      });
    } else if (v.customerId) {
      const prop = await Property.findById(v.propertyId, 'address city');
      await notify(v.customerId, { title: `Site visit ${label.toLowerCase()}`, text: `${title}, ${nice.date} ${nice.time} (${v.ref}).`, to: '/customer/appointments', type: 'visit' }, {
        email: { template: 'visitUpdate', data: { ref: v.ref, status: label, property: title, ...nice, address: prop ? `${prop.address}, ${prop.city}` : '', agent: await userName(v.agentId) } },
      });
    }

    if (v.enquiryId && v.status === 'Completed') {
      const e = await Enquiry.findById(v.enquiryId);
      if (e && e.status === 'Scheduled') { e.status = 'Completed'; e.notes.push({ text: `Site visit ${v.ref} completed.`, by: req.user.name, byId: req.user._id }); await e.save(); }
    }
  }
  if (prev.status !== v.status) await logActivity(req.user, { action: 'visit.status_changed', entityType: 'visit', entity: v, summary: `${v.ref} changed from ${prev.status} to ${v.status}`, req });
  if (moved) await logActivity(req.user, { action: 'visit.rescheduled', entityType: 'visit', entity: v, summary: `${v.ref} moved from ${prev.date} ${prev.time} to ${v.date} ${v.time}`, req });
  res.json({ visit: v });
});

export default r;
