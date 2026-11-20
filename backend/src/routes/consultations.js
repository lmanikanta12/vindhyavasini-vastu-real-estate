import { Router } from 'express';
import { Consultation } from '../models/Consultation.js';
import { Service } from '../models/Service.js';
import { Property } from '../models/Property.js';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { nextRef } from '../models/Counter.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { mail, notify, notifyAdmins } from '../services/notify.js';
import { logActivity } from '../services/activity.js';
import { vastuReportPdf } from '../services/pdf.js';
import { getSettings } from '../models/Setting.js';
import { buildRefs, pageParams, paged, rx, userIdsLike } from '../utils/paginate.js';
import { assertConsultantFree, takenSlots } from '../services/slots.js';
import { serviceName, userName } from '../services/lookup.js';
import { bad, conflict, forbidden } from '../utils/ApiError.js';
import { findOrFail, fmtDateLong, fmtTime12, idOrNull, inr, isISODate, requireFields, str, todayISO } from '../utils/helpers.js';

const r = Router();
const STATUSES = ['Requested', 'Confirmed', 'Completed', 'Cancelled'];
const okUrl = (u) => typeof u === 'string' && (u.startsWith('/uploads/') || /^https?:\/\//i.test(u));

export const consultScope = (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'customer') return { customerId: user._id };
  if (user.role === 'consultant') return { consultantId: user._id };
  return { _id: null };
};

r.get('/taken', async (req, res) => {
  if (!idOrNull(req.query.consultantId) || !isISODate(req.query.date)) throw bad('consultantId and date are required.');
  res.json({ taken: await takenSlots(req.query.consultantId, req.query.date) });
});

const row = async (c, kind) => {
  const service = await serviceName(c.serviceId);
  return { ref: c.ref, status: c.status, service, date: fmtDateLong(c.date), time: fmtTime12(c.time), fee: inr(c.fee), kind };
};

r.post('/', requireRole('customer'), async (req, res) => {
  const b = req.body || {};
  requireFields(b, { serviceId: 'Service', consultantId: 'Consultant', date: 'Date', time: 'Time', address: 'Property address' });
  const service = idOrNull(b.serviceId) && (await Service.findById(b.serviceId));
  if (!service || !service.active) throw bad('This service is not available.');
  const consultant = idOrNull(b.consultantId) && (await User.findById(b.consultantId));
  if (!consultant || consultant.role !== 'consultant' || consultant.status !== 'Active') throw bad('Choose an available consultant.');
  await assertConsultantFree(consultant, b.date, b.time);

  let propertyId = null;
  if (idOrNull(b.propertyId) && (await Property.exists({ _id: b.propertyId }))) propertyId = b.propertyId;
  const floorPlans = (Array.isArray(b.floorPlans) ? b.floorPlans : []).filter((f) => okUrl(f?.url)).slice(0, 3).map((f) => ({ name: str(f.name, 120), url: f.url }));

  const c = await Consultation.create({
    ref: await nextRef('consultation'),
    customerId: req.user._id,
    consultantId: consultant._id,
    serviceId: service._id,
    propertyId,
    propertyType: str(b.propertyType, 40),
    direction: str(b.direction, 20),
    address: str(b.address, 250),
    concerns: str(b.concerns, 1500),
    floorPlans,
    date: b.date,
    time: b.time,
    status: 'Requested',
    fee: service.fee,
  });
  const payment = await Payment.create({ ref: await nextRef('payment'), customerId: req.user._id, consultationId: c._id, description: `${service.name} (${c.ref})`, amount: service.fee, status: 'Pending', date: todayISO() });

  void mail(req.user.email, 'consultationUpdate', { name: req.user.name, ...(await row(c, 'customer')), status: 'Requested', consultant: consultant.name, extra: `Please complete the payment of ${inr(service.fee)} from My payments to speed up confirmation.` });
  await notify(req.user, { title: 'Consultation requested', text: `${service.name} on ${fmtDateLong(c.date)}, ${fmtTime12(c.time)}.`, to: '/customer/appointments', type: 'consultation' });
  await notify(consultant, { title: 'New consultation request', text: `${req.user.name} requested ${service.name} on ${fmtDateLong(c.date)}, ${fmtTime12(c.time)}.`, to: '/consultant/requests', type: 'consultation' }, {
    email: { template: 'consultationUpdate', data: { ...(await row(c, 'consultant')), customer: req.user.name, kind: 'consultant' } },
    critical: true,
  });
  await notifyAdmins({ title: 'New consultation booked', text: `${req.user.name} booked ${service.name} with ${consultant.name} (${c.ref}).`, to: '/admin/appointments', type: 'consultation' });
  await logActivity(req.user, { action: 'consultation.created', entityType: 'consultation', entity: c, summary: `${service.name} booked with ${consultant.name} for ${c.date} ${c.time}`, req });
  res.status(201).json({ consultation: c, payment });
});

r.get('/', requireAuth, async (req, res) => {
  const scope = consultScope(req.user);
  if (req.query.page === undefined) return res.json({ items: await Consultation.find(scope).sort({ date: 1, time: 1 }).limit(500) });
  const g = req.query;
  const q = { ...scope };
  if (STATUSES.includes(g.status)) q.status = g.status;
  if (idOrNull(g.consultantId) && req.user.role === 'admin') q.consultantId = g.consultantId;
  if (g.from || g.to) q.date = { ...(g.from && { $gte: String(g.from) }), ...(g.to && { $lte: String(g.to) }) };
  if (g.q) {
    const [people, svcs] = await Promise.all([userIdsLike(g.q), Service.find({ name: rx(g.q) }, '_id')]);
    q.$and = [{ $or: [{ ref: rx(g.q) }, { address: rx(g.q) }, ...(people.length ? [{ customerId: { $in: people } }, { consultantId: { $in: people } }] : []), ...(svcs.length ? [{ serviceId: { $in: svcs.map((x) => x._id) } }] : [])] }];
  }
  const params = pageParams(g, { sortable: ['date', 'createdAt', 'fee', 'status', 'ref'], defaultSort: 'date', defaultDir: -1, defaultLimit: 15 });
  const out = await paged(Consultation, q, params);
  res.json({ items: out.items, total: out.total, page: out.page, pages: out.pages, limit: out.limit, refs: await buildRefs(out.rows, { users: ['customerId', 'consultantId'], properties: ['propertyId'], services: ['serviceId'], payments: true }) });
});

r.get('/:id/report.pdf', requireAuth, async (req, res) => {
  const c = await findOrFail(Consultation, req.params.id, 'Consultation');
  const u = req.user;
  const isCustomer = u.role === 'customer' && String(c.customerId) === String(u._id);
  const isConsultant = u.role === 'consultant' && String(c.consultantId) === String(u._id);
  if (!isCustomer && !isConsultant && u.role !== 'admin') throw forbidden();
  if (c.status === 'Cancelled') throw conflict('This consultation was cancelled.');
  if (isCustomer && c.status !== 'Completed') throw conflict('Your report is available once the consultation is completed.');
  if (!isCustomer && !c.assessmentNotes && !c.recommendations) throw conflict('Add assessment notes or recommendations first, then generate the report.');
  const [customer, consultant, property, business] = await Promise.all([User.findById(c.customerId), User.findById(c.consultantId), c.propertyId ? Property.findById(c.propertyId) : null, getSettings()]);
  const buf = await vastuReportPdf({ consultation: c, customer, consultant, serviceName: await serviceName(c.serviceId), property, business });
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="vastu-report-${c.ref}.pdf"` }).send(buf);
});

const TRANSITIONS = { Requested: ['Confirmed', 'Cancelled'], Confirmed: ['Completed', 'Cancelled'], Completed: [], Cancelled: [] };

r.patch('/:id', requireAuth, async (req, res) => {
  const c = await findOrFail(Consultation, req.params.id, 'Consultation');
  const u = req.user;
  const isCustomer = u.role === 'customer' && String(c.customerId) === String(u._id);
  const isConsultant = u.role === 'consultant' && String(c.consultantId) === String(u._id);
  const isAdmin = u.role === 'admin';
  if (!isCustomer && !isConsultant && !isAdmin) throw forbidden();
  const b = req.body || {};
  const closed = ['Completed', 'Cancelled'].includes(c.status);
  const prev = { status: c.status };
  let rescheduled = false;
  let reassigned = false;

  if (b.consultantId !== undefined && b.consultantId !== String(c.consultantId)) {
    if (!isAdmin) throw forbidden('Only the administrator can assign consultants.');
    if (closed) throw conflict(`This consultation is already ${c.status.toLowerCase()}.`);
    const nc = idOrNull(b.consultantId) && (await User.findById(b.consultantId));
    if (!nc || nc.role !== 'consultant' || nc.status !== 'Active') throw bad('Choose an active consultant.');
    await assertConsultantFree(nc, c.date, c.time, { ignoreId: c._id });
    c.consultantId = nc._id;
    c.status = 'Requested';
    reassigned = true;
  }

  if ((b.date !== undefined && b.date !== c.date) || (b.time !== undefined && b.time !== c.time)) {
    if (closed) throw conflict(`This consultation is already ${c.status.toLowerCase()}.`);
    const consultant = await User.findById(c.consultantId);
    await assertConsultantFree(consultant, b.date ?? c.date, b.time ?? c.time, { ignoreId: c._id });
    c.date = b.date ?? c.date;
    c.time = b.time ?? c.time;
    c.status = isCustomer || isAdmin ? 'Requested' : 'Confirmed';
    c.reminderSent = false;
    rescheduled = true;
  }

  if (b.status !== undefined && b.status !== c.status && !reassigned && !rescheduled) {
    if (!STATUSES.includes(b.status)) throw bad('Invalid status.');
    if (isCustomer && b.status !== 'Cancelled') throw forbidden('You can only cancel your booking.');
    if (!TRANSITIONS[c.status]?.includes(b.status)) throw conflict(`A ${c.status.toLowerCase()} consultation cannot become ${b.status.toLowerCase()}.`);
    c.status = b.status;
  }

  const notesGiven = ['assessmentNotes', 'recommendations', 'followUp'].some((k) => b[k] !== undefined);
  if (notesGiven) {
    if (isCustomer) throw forbidden();
    if (!['Confirmed', 'Completed'].includes(c.status) && !(b.status === 'Completed')) throw conflict('Notes can be added once the consultation is confirmed.');
    if (b.assessmentNotes !== undefined) c.assessmentNotes = str(b.assessmentNotes, 4000);
    if (b.recommendations !== undefined) c.recommendations = str(b.recommendations, 4000);
    if (b.followUp !== undefined) c.followUp = { status: str(b.followUp?.status, 30) || 'None', note: str(b.followUp?.note, 600) };
  }
  await c.save();

  const customer = await User.findById(c.customerId);
  const consultant = await User.findById(c.consultantId);
  const base = await row(c, 'customer');
  const link = '/customer/appointments';

  if (reassigned) {
    await notify(consultant, { title: 'Consultation assigned to you', text: `${customer?.name} - ${base.service}, ${base.date} ${base.time} (${c.ref}).`, to: '/consultant/requests', type: 'consultation' }, { email: { template: 'consultationUpdate', data: { ...(await row(c, 'consultant')), customer: customer?.name, kind: 'consultant' } }, critical: true });
    if (customer) await notify(customer, { title: 'Consultant changed', text: `${consultant.name} will take your consultation ${c.ref}.`, to: link, type: 'consultation' }, { email: { template: 'consultationUpdate', data: { ...base, name: customer.name, consultant: consultant.name, status: 'Requested', extra: 'A new consultant was assigned to your booking.' } } });
  } else if (rescheduled) {
    const other = isCustomer ? consultant : customer;
    if (other) await notify(other, { title: 'Consultation rescheduled', text: `${c.ref} moved to ${base.date}, ${base.time}.`, to: isCustomer ? '/consultant/requests' : link, type: 'consultation' }, {
      email: { template: 'consultationUpdate', data: isCustomer ? { ...(await row(c, 'consultant')), customer: customer?.name, kind: 'consultant', status: 'Rescheduled' } : { ...base, consultant: consultant?.name, status: c.status === 'Confirmed' ? 'Rescheduled and confirmed' : 'Rescheduled' } },
    });
  } else if (prev.status !== c.status) {
    if (c.status === 'Confirmed' && customer) {
      await notify(customer, { title: 'Consultation confirmed', text: `${base.service} on ${base.date}, ${base.time} with ${consultant?.name}.`, to: link, type: 'consultation' }, { email: { template: 'consultationUpdate', data: { ...base, consultant: consultant?.name } } });
    }
    if (c.status === 'Completed' && customer) {
      await notify(customer, { title: 'Recommendations ready', text: `Your ${base.service} (${c.ref}) is complete. Read your recommendations.`, to: link, type: 'consultation' }, { email: { template: 'recommendations', data: { ref: c.ref, service: base.service, consultant: consultant?.name } } });
    }
    if (c.status === 'Cancelled') {
      const pay = await Payment.findOne({ consultationId: c._id });
      let extra = '';
      if (pay?.status === 'Pending') { await pay.deleteOne(); extra = 'The pending fee was cancelled.'; }
      if (pay?.status === 'Completed') {
        extra = 'You paid for this booking. The office will contact you about the refund.';
        await notifyAdmins({ title: 'Refund may be needed', text: `${c.ref} was cancelled after payment ${pay.ref} (${inr(pay.amount)}).`, to: '/admin/payments', type: 'payment' });
      }
      const by = isCustomer ? 'customer' : 'staff';
      if (!isCustomer && customer) await notify(customer, { title: 'Consultation cancelled', text: `${c.ref} was cancelled. ${extra}`, to: link, type: 'consultation' }, { email: { template: 'consultationUpdate', data: { ...base, consultant: consultant?.name, extra } }, critical: true });
      if (isCustomer && consultant) await notify(consultant, { title: 'Consultation cancelled', text: `${customer?.name} cancelled ${c.ref}.`, to: '/consultant/requests', type: 'consultation' }, { email: { template: 'consultationUpdate', data: { ...(await row(c, 'consultant')), customer: customer?.name, kind: 'consultant' } } });
      if (isCustomer && customer) void mail(customer.email, 'consultationUpdate', { ...base, name: customer.name, consultant: consultant?.name, extra });
      void by;
    }
  } else if (notesGiven && c.status === 'Completed' && customer && b.recommendations !== undefined && !b.status) {
    await notify(customer, { title: 'Recommendations updated', text: `${c.ref} notes were updated.`, to: link, type: 'consultation' });
  }
  if (reassigned) await logActivity(u, { action: 'consultation.assigned', entityType: 'consultation', entity: c, summary: `${c.ref} assigned to ${consultant?.name}`, req });
  if (rescheduled) await logActivity(u, { action: 'consultation.rescheduled', entityType: 'consultation', entity: c, summary: `${c.ref} moved to ${c.date} ${c.time}`, req });
  if (prev.status !== c.status && !reassigned && !rescheduled) await logActivity(u, { action: 'consultation.status_changed', entityType: 'consultation', entity: c, summary: `${c.ref} changed from ${prev.status} to ${c.status}`, req });
  if (notesGiven) await logActivity(u, { action: 'consultation.notes_saved', entityType: 'consultation', entity: c, summary: `Assessment notes / recommendations saved for ${c.ref}`, req });
  res.json({ consultation: c });
});

export default r;
