import { Payment } from '../models/Payment.js';
import { Enquiry } from '../models/Enquiry.js';
import { Consultation } from '../models/Consultation.js';
import { SiteVisit } from '../models/SiteVisit.js';
import { Property } from '../models/Property.js';
import { Service } from '../models/Service.js';
import { User } from '../models/User.js';
import { isISODate, todayISO } from '../utils/helpers.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const monthKey = (s) => String(s).slice(0, 7);
const monthLabel = (k) => `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;

export function resolveRange(q = {}) {
  const now = new Date();
  let from = isISODate(q.from) ? q.from : iso(new Date(now.getFullYear(), now.getMonth() - 5, 1));
  let to = isISODate(q.to) ? q.to : todayISO();
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

function monthsBetween(from, to) {
  const out = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const end = monthKey(to);
  while (`${y}-${String(m).padStart(2, '0')}` <= end && out.length < 60) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

const count = (rows, key) => rows.reduce((a, r) => { const k = typeof key === 'function' ? key(r) : r[key]; a[k] = (a[k] || 0) + 1; return a; }, {});

export async function buildReport({ from, to }) {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T23:59:59.999`);
  const [payments, enquiries, consultations, visits, properties, services, staff] = await Promise.all([
    Payment.find({ $or: [{ status: 'Completed', paidAt: { $gte: start, $lte: end } }, { status: 'Completed', paidAt: null, date: { $gte: from, $lte: to } }, { status: 'Pending', createdAt: { $gte: start, $lte: end } }] }).limit(20000),
    Enquiry.find({ createdAt: { $gte: start, $lte: end } }).limit(20000),
    Consultation.find({ date: { $gte: from, $lte: to } }).limit(20000),
    SiteVisit.find({ date: { $gte: from, $lte: to } }).limit(20000),
    Property.find({}).limit(20000),
    Service.find({}),
    User.find({ role: { $in: ['agent', 'consultant'] } }),
  ]);

  const consById = new Map();
  const needed = payments.map((p) => p.consultationId).filter(Boolean);
  if (needed.length) (await Consultation.find({ _id: { $in: needed } })).forEach((c) => consById.set(String(c._id), c));
  const svcName = new Map(services.map((s) => [String(s._id), s.name]));
  const serviceOfPayment = (p) => (p.consultationId && svcName.get(String(consById.get(String(p.consultationId))?.serviceId))) || 'Other charges';
  const paidDay = (p) => (p.paidAt ? iso(new Date(p.paidAt)) : p.date);

  const paid = payments.filter((p) => p.status === 'Completed');
  const pendingRows = payments.filter((p) => p.status === 'Pending');

  const days = [...paid.map(paidDay), ...enquiries.map((e) => iso(e.createdAt)), ...consultations.map((c) => c.date), ...visits.map((v) => v.date)].filter(Boolean).sort();
  const firstDay = days.length && days[0] > from ? days[0] : from;
  const months = monthsBetween(firstDay, to).slice(-60);

  const revenueByMonth = months.map((k) => {
    const rows = paid.filter((p) => monthKey(paidDay(p)) === k);
    return { month: k, label: monthLabel(k), count: rows.length, revenue: rows.reduce((a, p) => a + p.amount, 0) };
  });
  const svcRev = {};
  paid.forEach((p) => { const n = serviceOfPayment(p); svcRev[n] ||= { name: n, count: 0, revenue: 0 }; svcRev[n].count += 1; svcRev[n].revenue += p.amount; });
  const revenueByService = Object.values(svcRev).sort((a, b) => b.revenue - a.revenue);

  const consByService = {};
  consultations.forEach((c) => { const n = svcName.get(String(c.serviceId)) || 'Consultation'; consByService[n] = (consByService[n] || 0) + 1; });

  const staffName = new Map(staff.map((u) => [String(u._id), u.name]));
  const agents = staff.filter((u) => u.role === 'agent').map((a) => {
    const mine = enquiries.filter((e) => String(e.assignedTo) === String(a._id));
    return { id: String(a._id), name: a.name, enquiries: mine.length, completed: mine.filter((e) => ['Completed', 'Closed'].includes(e.status)).length, visitsDone: visits.filter((v) => String(v.agentId) === String(a._id) && v.status === 'Completed').length };
  });
  const consultants = staff.filter((u) => u.role === 'consultant').map((c) => {
    const mine = consultations.filter((x) => String(x.consultantId) === String(c._id));
    const revenue = paid.filter((p) => String(consById.get(String(p.consultationId))?.consultantId) === String(c._id)).reduce((a, p) => a + p.amount, 0);
    return { id: String(c._id), name: c.name, booked: mine.filter((x) => x.status !== 'Cancelled').length, completed: mine.filter((x) => x.status === 'Completed').length, revenue };
  });

  return {
    range: { from, to },
    totals: {
      revenue: paid.reduce((a, p) => a + p.amount, 0),
      payments: paid.length,
      pending: pendingRows.reduce((a, p) => a + p.amount, 0),
      enquiries: enquiries.length,
      consultations: consultations.length,
      visits: visits.length,
    },
    revenueByMonth,
    revenueByService,
    enquiries: {
      byStatus: count(enquiries, 'status'),
      byMonth: months.map((k) => ({ month: k, label: monthLabel(k), count: enquiries.filter((e) => monthKey(e.createdAt.toISOString()) === k).length })),
    },
    consultations: {
      byStatus: count(consultations, 'status'),
      byService: Object.entries(consByService).map(([name, n]) => ({ name, count: n })).sort((a, b) => b.count - a.count),
      byMonth: months.map((k) => ({ month: k, label: monthLabel(k), count: consultations.filter((c) => monthKey(c.date) === k).length })),
    },
    visits: { byStatus: count(visits, 'status'), byMonth: months.map((k) => ({ month: k, label: monthLabel(k), count: visits.filter((v) => monthKey(v.date) === k).length })) },
    listings: { total: properties.length, byCategory: count(properties, 'category'), byStatus: count(properties, 'status'), byCity: count(properties, (p) => p.city || 'Unknown') },
    agents,
    consultants,

    rows: { payments, enquiries, consultations, visits, consById, svcName, staffName },
  };
}

export const publicReport = ({ rows, ...rest }) => { void rows; return rest; };
