import { Router } from 'express';
import ExcelJS from 'exceljs';
import { requireRole } from '../middleware/auth.js';
import { getSettings } from '../models/Setting.js';
import { User } from '../models/User.js';
import { Property } from '../models/Property.js';
import { Enquiry } from '../models/Enquiry.js';
import { SiteVisit } from '../models/SiteVisit.js';
import { Consultation } from '../models/Consultation.js';
import { Payment } from '../models/Payment.js';
import { buildReport, publicReport, resolveRange } from '../services/reports.js';
import { reportPdf } from '../services/pdf.js';

const r = Router();
r.use(requireRole('admin'));

r.get('/overview', async (_req, res) => {
  const OPEN_ENQ = { $nin: ['Completed', 'Closed'] };
  const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0, 0, 0, 0);
  const count = (M, q) => M.countDocuments(q);
  const [users, customers, listings, enqAll, openLeads, unassigned, visitsAll, visitsOpen, consAll, consOpen, payAgg, recent, staff] = await Promise.all([
    count(User, {}), count(User, { role: 'customer' }), count(Property, {}), count(Enquiry, {}), count(Enquiry, { status: OPEN_ENQ }), count(Enquiry, { status: OPEN_ENQ, assignedTo: null }),
    count(SiteVisit, {}), count(SiteVisit, { status: { $in: ['Requested', 'Scheduled'] } }), count(Consultation, {}), count(Consultation, { status: { $in: ['Requested', 'Confirmed'] } }),
    Payment.find({ status: { $in: ['Completed', 'Pending'] } }, 'amount status').limit(50000), Enquiry.find({ createdAt: { $gte: since } }, 'createdAt'),
    User.find({ role: { $in: ['agent', 'consultant'] }, status: 'Active' }, 'name role'),
  ]);
  const statusCounts = async (M, field, values) => Object.fromEntries(await Promise.all(values.map(async (v) => [v, await M.countDocuments({ [field]: v })])));
  const [propertyStatus, enquiryStatus, workload] = await Promise.all([
    statusCounts(Property, 'status', ['Available', 'Reserved', 'Sold', 'Rented']),
    statusCounts(Enquiry, 'status', ['New', 'Contacted', 'Scheduled', 'Completed', 'Closed']),
    Promise.all(staff.map(async (u) => ({
      id: String(u._id), name: u.name, role: u.role,
      open: u.role === 'agent' ? await count(Enquiry, { assignedTo: u._id, status: OPEN_ENQ }) : await count(Consultation, { consultantId: u._id, status: { $in: ['Requested', 'Confirmed'] } }),
      appts: u.role === 'agent' ? await count(SiteVisit, { agentId: u._id, status: { $in: ['Requested', 'Scheduled'] } }) : await count(Consultation, { consultantId: u._id, status: 'Confirmed' }),
    }))),
  ]);
  const months = Array.from({ length: 6 }, (_, i) => { const d = new Date(since); d.setMonth(since.getMonth() + i); return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-IN', { month: 'short' }), value: 0 }; });
  recent.forEach((e) => { const m = months.find((x) => x.key === `${e.createdAt.getFullYear()}-${e.createdAt.getMonth()}`); if (m) m.value += 1; });
  res.json({
    overview: {
      users, customers, listings, availableListings: propertyStatus.Available, enquiries: enqAll, openLeads, unassigned, visits: visitsAll, visitsOpen, consultations: consAll, consultationsOpen: consOpen,
      revenue: payAgg.filter((p) => p.status === 'Completed').reduce((a, p) => a + p.amount, 0), pending: payAgg.filter((p) => p.status === 'Pending').reduce((a, p) => a + p.amount, 0),
      propertyStatus, enquiryStatus, enquiriesByMonth: months.map(({ label, value }) => ({ label, value })), staff: workload,
    },
  });
});

r.get('/summary', async (req, res) => res.json({ report: publicReport(await buildReport(resolveRange(req.query))) }));

r.get('/export.pdf', async (req, res) => {
  const range = resolveRange(req.query);
  const [report, settings] = await Promise.all([buildReport(range), getSettings()]);
  const buf = await reportPdf({ report: publicReport(report), business: settings });
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="report-${range.from}-to-${range.to}.pdf"` }).send(buf);
});

const sheet = (wb, name, columns, rows) => {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = columns.map(([header, key, width]) => ({ header, key, width: width || 18 }));
  rows.forEach((x) => ws.addRow(x));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7A3418' } };
  return ws;
};

r.get('/export.xlsx', async (req, res) => {
  const range = resolveRange(req.query);
  const rep = await buildReport(range);
  const { rows } = rep;
  const [users, props] = await Promise.all([User.find({}, 'name email'), Property.find({}, 'title ref')]);
  const uName = new Map(users.map((u) => [String(u._id), u.name]));
  const pTitle = new Map(props.map((p) => [String(p._id), p.title]));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Vindhyavasini Vastu and Real Estate';
  wb.created = new Date();

  const sum = sheet(wb, 'Summary', [['Measure', 'k', 34], ['Value', 'v', 22]], [
    { k: 'Period from', v: range.from }, { k: 'Period to', v: range.to },
    { k: 'Revenue (paid payments)', v: rep.totals.revenue }, { k: 'Paid payments', v: rep.totals.payments },
    { k: 'Pending fees', v: rep.totals.pending }, { k: 'Enquiries received', v: rep.totals.enquiries },
    { k: 'Consultations in period', v: rep.totals.consultations }, { k: 'Site visits in period', v: rep.totals.visits },
    { k: 'Total listings (now)', v: rep.listings.total },
  ]);
  sum.getColumn('v').numFmt = '#,##0';
  const m = sheet(wb, 'Revenue by month', [['Month', 'label', 16], ['Payments', 'count', 12], ['Revenue (INR)', 'revenue', 18]], rep.revenueByMonth);
  m.getColumn('revenue').numFmt = '#,##0.00';
  const s = sheet(wb, 'Revenue by service', [['Service', 'name', 36], ['Payments', 'count', 12], ['Revenue (INR)', 'revenue', 18]], rep.revenueByService);
  s.getColumn('revenue').numFmt = '#,##0.00';
  sheet(wb, 'Enquiries summary', [['Status', 's', 20], ['Count', 'n', 12]], Object.entries(rep.enquiries.byStatus).map(([s2, n]) => ({ s: s2, n })));
  sheet(wb, 'Appointments summary', [['Type', 't', 22], ['Status', 's', 18], ['Count', 'n', 12]], [
    ...Object.entries(rep.consultations.byStatus).map(([s2, n]) => ({ t: 'Consultation', s: s2, n })),
    ...Object.entries(rep.visits.byStatus).map(([s2, n]) => ({ t: 'Site visit', s: s2, n })),
  ]);
  sheet(wb, 'Agents', [['Agent', 'name', 28], ['Enquiries', 'enquiries', 12], ['Completed', 'completed', 12], ['Visits done', 'visitsDone', 12]], rep.agents);
  const c = sheet(wb, 'Consultants', [['Consultant', 'name', 28], ['Booked', 'booked', 12], ['Completed', 'completed', 12], ['Revenue (INR)', 'revenue', 16]], rep.consultants);
  c.getColumn('revenue').numFmt = '#,##0.00';

  const p = sheet(wb, 'Payments', [['Receipt', 'ref', 16], ['Customer', 'cust', 24], ['Description', 'desc', 36], ['Amount (INR)', 'amount', 14], ['Status', 'status', 12], ['Method', 'method', 14], ['Date', 'date', 14], ['Transaction ref', 'tx', 26]],
    rows.payments.map((x) => ({ ref: x.ref, cust: uName.get(String(x.customerId)) || '', desc: x.description, amount: x.amount, status: x.status, method: x.method, date: x.paidAt ? x.paidAt.toISOString().slice(0, 10) : x.date, tx: x.razorpayPaymentId || x.gatewayRef || '' })));
  p.getColumn('amount').numFmt = '#,##0.00';
  sheet(wb, 'Enquiries', [['Ref', 'ref', 14], ['Name', 'name', 22], ['Email', 'email', 28], ['Phone', 'phone', 16], ['Property', 'prop', 30], ['Status', 'status', 12], ['Assigned to', 'agent', 22], ['Received', 'at', 14]],
    rows.enquiries.map((x) => ({ ref: x.ref, name: x.contact?.name, email: x.contact?.email, phone: x.contact?.phone, prop: pTitle.get(String(x.propertyId)) || 'General', status: x.status, agent: uName.get(String(x.assignedTo)) || '', at: x.createdAt.toISOString().slice(0, 10) })));
  sheet(wb, 'Consultations', [['Ref', 'ref', 14], ['Service', 'svc', 30], ['Customer', 'cust', 22], ['Consultant', 'cons', 22], ['Date', 'date', 12], ['Time', 'time', 8], ['Status', 'status', 12], ['Fee (INR)', 'fee', 12]],
    rows.consultations.map((x) => ({ ref: x.ref, svc: rows.svcName.get(String(x.serviceId)) || '', cust: uName.get(String(x.customerId)) || '', cons: uName.get(String(x.consultantId)) || '', date: x.date, time: x.time, status: x.status, fee: x.fee })));
  sheet(wb, 'Site visits', [['Ref', 'ref', 14], ['Property', 'prop', 32], ['Customer', 'cust', 22], ['Agent', 'agent', 22], ['Date', 'date', 12], ['Time', 'time', 8], ['Status', 'status', 12]],
    rows.visits.map((x) => ({ ref: x.ref, prop: pTitle.get(String(x.propertyId)) || '', cust: uName.get(String(x.customerId)) || '', agent: uName.get(String(x.agentId)) || '', date: x.date, time: x.time, status: x.status })));

  res.set({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="report-${range.from}-to-${range.to}.xlsx"` });
  await wb.xlsx.write(res);
  res.end();
});

export default r;
