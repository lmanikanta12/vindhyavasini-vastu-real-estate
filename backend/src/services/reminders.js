import cron from 'node-cron';
import { Consultation } from '../models/Consultation.js';
import { SiteVisit } from '../models/SiteVisit.js';
import { Payment } from '../models/Payment.js';
import { User } from '../models/User.js';
import { Property } from '../models/Property.js';
import { getSettings } from '../models/Setting.js';
import { notify } from './notify.js';
import { mail } from './notify.js';
import { serviceName } from './lookup.js';
import { fmtDateLong, fmtTime12, inr, todayISO } from '../utils/helpers.js';

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

async function remind(user, settings, { title, text, to, template, data }) {
  if (!user || user.status !== 'Active') return;
  const wantsEmail = settings.emailReminders && user.prefs?.email !== false;
  await notify(user, { title, text, to, type: 'reminder' });
  if (wantsEmail) void mail(user.email, template, { name: user.name, ...data });
}

export async function sendDueReminders(now = new Date()) {
  const settings = await getSettings();
  const horizon = new Date(now.getTime() + settings.reminderLeadHours * 3600 * 1000);
  const days = [isoDate(now), isoDate(horizon)];
  const dueTime = (d, t) => { const w = new Date(`${d}T${t}:00`); return w > now && w <= horizon; };
  let sent = 0;

  const consults = await Consultation.find({ status: 'Confirmed', reminderSent: { $ne: true }, date: { $gte: days[0], $lte: days[1] } });
  for (const c of consults.filter((x) => dueTime(x.date, x.time))) {
    const [cust, cons, svc] = await Promise.all([User.findById(c.customerId), User.findById(c.consultantId), serviceName(c.serviceId)]);
    const when = `${fmtDateLong(c.date)}, ${fmtTime12(c.time)}`;
    await remind(cust, settings, { title: 'Vastu consultation reminder', text: `${svc} on ${when}.`, to: '/customer/appointments', template: 'reminder', data: { what: svc, ref: c.ref, date: fmtDateLong(c.date), time: fmtTime12(c.time), who: cons?.name, whoLabel: 'Consultant' } });
    await remind(cons, settings, { title: 'Consultation reminder', text: `${cust?.name} - ${svc} on ${when}.`, to: '/consultant/schedule', template: 'reminder', data: { what: svc, ref: c.ref, date: fmtDateLong(c.date), time: fmtTime12(c.time), who: cust?.name, whoLabel: 'Customer' } });
    c.reminderSent = true;
    await c.save();
    sent += 1;
  }

  const visits = await SiteVisit.find({ status: 'Scheduled', reminderSent: { $ne: true }, date: { $gte: days[0], $lte: days[1] } });
  for (const v of visits.filter((x) => dueTime(x.date, x.time))) {
    const [cust, agent, prop] = await Promise.all([User.findById(v.customerId), User.findById(v.agentId), Property.findById(v.propertyId, 'title')]);
    const when = `${fmtDateLong(v.date)}, ${fmtTime12(v.time)}`;
    const what = `Site visit: ${prop?.title || 'property'}`;
    await remind(cust, settings, { title: 'Site visit reminder', text: `${prop?.title} on ${when}.`, to: '/customer/appointments', template: 'reminder', data: { what, ref: v.ref, date: fmtDateLong(v.date), time: fmtTime12(v.time), who: agent?.name, whoLabel: 'Agent' } });
    await remind(agent, settings, { title: 'Site visit reminder', text: `${prop?.title} on ${when}.`, to: '/agent/visits', template: 'reminder', data: { what, ref: v.ref, date: fmtDateLong(v.date), time: fmtTime12(v.time), who: cust?.name || 'Customer', whoLabel: 'Customer' } });
    v.reminderSent = true;
    await v.save();
    sent += 1;
  }
  return sent;
}

export async function sendPaymentNudges(now = new Date()) {
  const settings = await getSettings();
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 48 * 3600 * 1000);
  const due = await Payment.find({ status: 'Pending', createdAt: { $lt: dayAgo }, $or: [{ lastReminderAt: null }, { lastReminderAt: { $lt: twoDaysAgo } }] });
  for (const p of due) {
    const cust = await User.findById(p.customerId);
    await remind(cust, settings, { title: 'Payment pending', text: `${inr(p.amount)} for ${p.description} is still unpaid.`, to: '/customer/payments', template: 'paymentPending', data: { receipt: p.ref, description: p.description, amount: inr(p.amount) } });
    p.lastReminderAt = now;
    await p.save();
  }
  return due.length;
}

export function startReminders() {

  cron.schedule('*/10 * * * *', () => sendDueReminders().catch((e) => console.error('[reminders]', e.message)));
  cron.schedule('0 10 * * *', () => sendPaymentNudges().catch((e) => console.error('[payment nudges]', e.message)));
  console.log('Reminder scheduler started.');
}
void todayISO;
