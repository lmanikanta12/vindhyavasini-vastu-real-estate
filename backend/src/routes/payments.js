import { Router } from 'express';
import { Payment } from '../models/Payment.js';
import { Consultation } from '../models/Consultation.js';
import { User } from '../models/User.js';
import { nextRef } from '../models/Counter.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { env } from '../config/env.js';
import { completePayment, findPaymentByOrder } from '../services/paymentFlow.js';
import { createOrder, fetchPayment, methodLabel, verifyCheckoutSignature, verifyWebhookSignature } from '../services/razorpay.js';
import { notify } from '../services/notify.js';
import { logActivity } from '../services/activity.js';
import { receiptPdf } from '../services/pdf.js';
import { getSettings } from '../models/Setting.js';
import { Service } from '../models/Service.js';
import { buildRefs, pageParams, paged, rx, userIdsLike } from '../utils/paginate.js';
import { bad, conflict, forbidden } from '../utils/ApiError.js';
import { findOrFail, idOrNull, inr, num, str, todayISO } from '../utils/helpers.js';

const r = Router();

export const paymentScope = async (user) => {
  if (user.role === 'admin') return {};
  if (user.role === 'customer') return { customerId: user._id };
  if (user.role === 'consultant') {
    const mine = await Consultation.find({ consultantId: user._id }, '_id');
    return { consultationId: { $in: mine.map((c) => c._id) } };
  }
  return { _id: null };
};

r.get('/', requireAuth, async (req, res) => {
  const scope = await paymentScope(req.user);
  if (req.query.page === undefined) return res.json({ items: await Payment.find(scope).sort({ createdAt: -1 }).limit(500) });

  const g = req.query;
  const q = { ...scope };
  if (['Pending', 'Completed'].includes(g.status)) q.status = g.status;
  if (g.from || g.to) q.date = { ...(g.from && { $gte: String(g.from) }), ...(g.to && { $lte: String(g.to) }) };
  if (g.q) {
    const ids = req.user.role === 'customer' ? [] : await userIdsLike(g.q, 'customer');
    q.$and = [...(q.$and || []), { $or: [{ ref: rx(g.q) }, { description: rx(g.q) }, { method: rx(g.q) }, ...(ids.length ? [{ customerId: { $in: ids } }] : [])] }];
  }
  const params = pageParams(g, { sortable: ['createdAt', 'amount', 'status', 'date', 'ref'], defaultLimit: 15 });
  const out = await paged(Payment, q, params);
  res.json({ items: out.items, total: out.total, page: out.page, pages: out.pages, limit: out.limit, refs: await buildRefs(out.rows, { users: ['customerId'] }) });
});

r.get('/:id/receipt.pdf', requireAuth, async (req, res) => {
  const p = await findOrFail(Payment, req.params.id, 'Payment');
  const own = req.user.role === 'customer' && String(p.customerId) === String(req.user._id);
  if (!own && req.user.role !== 'admin') throw forbidden();
  if (p.status !== 'Completed') throw conflict('A receipt is available once the payment is completed.');
  const [customer, consultation, business] = await Promise.all([User.findById(p.customerId), p.consultationId ? Consultation.findById(p.consultationId) : null, getSettings()]);
  const service = consultation?.serviceId ? await Service.findById(consultation.serviceId, 'name') : null;
  const buf = await receiptPdf({ payment: p, customer, consultation, serviceName: service?.name, business });
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${p.ref}.pdf"` }).send(buf);
});

r.get('/config', (_req, res) => res.json({ mode: env.paymentMode, keyId: env.paymentMode === 'razorpay' ? env.razorpay.keyId : null }));

async function ownPendingPayment(req) {
  const p = await findOrFail(Payment, req.params.id, 'Payment');
  if (req.user.role !== 'customer' || String(p.customerId) !== String(req.user._id)) throw forbidden();
  if (p.status === 'Completed') throw conflict('This payment is already completed.');
  return p;
}

r.post('/:id/razorpay/order', requireRole('customer'), async (req, res) => {
  if (env.paymentMode !== 'razorpay') throw bad('Razorpay is not enabled.');
  const p = await ownPendingPayment(req);
  const order = await createOrder({ amount: p.amount, receipt: p.ref, notes: { paymentId: String(p._id), ref: p.ref } });
  p.razorpayOrderId = order.id;
  await p.save();
  res.json({ keyId: env.razorpay.keyId, orderId: order.id, amount: order.amount, currency: order.currency, name: 'Vindhyavasini Vastu and Real Estate', description: p.description, prefill: { name: req.user.name, email: req.user.email, contact: req.user.phone } });
});

r.post('/:id/razorpay/verify', requireRole('customer'), async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
  const p = await ownPendingPayment(req);
  if (!orderId || !paymentId || !signature) throw bad('Payment details are missing.');
  if (p.razorpayOrderId !== orderId) throw bad('This payment does not match the order.');
  if (!verifyCheckoutSignature(orderId, paymentId, signature)) throw bad('Payment could not be verified. If money was deducted, it will be refunded automatically.');
  let method = 'Online';
  try { method = methodLabel((await fetchPayment(paymentId)).method); } catch {}
  const { payment } = await completePayment(p, { method, razorpayPaymentId: paymentId, actor: req.user });
  res.json({ payment });
});

r.post('/:id/demo-pay', requireRole('customer'), async (req, res) => {
  if (env.paymentMode !== 'demo') throw forbidden('Demo payments are turned off.');
  const p = await ownPendingPayment(req);
  const method = ['UPI', 'Card', 'Net Banking'].includes(req.body?.method) ? req.body.method : 'UPI';
  const { payment } = await completePayment(p, { method, gatewayRef: `DEMO-${Date.now()}`, actor: req.user });
  res.json({ payment });
});

export async function razorpayWebhook(req, res) {
  const raw = req.body;
  if (!verifyWebhookSignature(raw, req.headers['x-razorpay-signature'])) return res.status(400).json({ message: 'Invalid signature.' });
  let event;
  try { event = JSON.parse(raw.toString('utf8')); } catch { return res.status(400).json({ message: 'Invalid JSON.' }); }
  if (['payment.captured', 'order.paid'].includes(event.event)) {
    const entity = event.payload?.payment?.entity;
    const p = entity?.order_id && (await findPaymentByOrder(entity.order_id));
    if (p && p.status !== 'Completed') await completePayment(p, { method: methodLabel(entity.method), razorpayPaymentId: entity.id });
  }
  res.json({ ok: true });
}

r.post('/', requireRole('admin'), async (req, res) => {
  const b = req.body || {};
  const customer = idOrNull(b.customerId) && (await User.findById(b.customerId));
  if (!customer || customer.role !== 'customer') throw bad('Choose a customer.');
  if (!(num(b.amount) > 0)) throw bad('Enter a valid amount.');
  let cons = null;
  if (idOrNull(b.consultationId)) {
    cons = await Consultation.findById(b.consultationId);
    if (!cons || String(cons.customerId) !== String(customer._id)) throw bad('That consultation does not belong to this customer.');
  }
  const done = b.status === 'Completed';
  const p = await Payment.create({ ref: await nextRef('payment'), customerId: customer._id, consultationId: cons?._id || null, description: str(b.description, 200) || 'Service charge', amount: num(b.amount), status: 'Pending', date: todayISO(), recordedBy: req.user._id });
  await logActivity(req.user, { action: 'payment.created', entityType: 'payment', entity: p, summary: `${inr(p.amount)} charge added for ${customer.name}: ${p.description}`, req });
  if (done) await completePayment(p, { method: str(b.method, 30) || 'Cash', recordedBy: req.user._id, actor: req.user });
  else await notify(customer, { title: 'Payment pending', text: `${inr(p.amount)} is pending for ${p.description}.`, to: '/customer/payments', type: 'payment' }, { email: { template: 'paymentPending', data: { receipt: p.ref, description: p.description, amount: inr(p.amount) } } });
  res.status(201).json({ payment: await Payment.findById(p._id) });
});

r.patch('/:id', requireRole('admin'), async (req, res) => {
  const p = await findOrFail(Payment, req.params.id, 'Payment');
  const b = req.body || {};
  if (b.description !== undefined) p.description = str(b.description, 200);
  if (b.amount !== undefined) {
    if (p.status === 'Completed') throw conflict('A completed payment amount cannot be changed.');
    if (!(num(b.amount) > 0)) throw bad('Enter a valid amount.');
    p.amount = num(b.amount);
  }
  if (b.status !== undefined && b.status !== p.status) {
    if (b.status === 'Completed') {
      await completePayment(p, { method: str(b.method, 30) || p.method || 'Cash', recordedBy: req.user._id, actor: req.user });
      return res.json({ payment: await Payment.findById(p._id) });
    }
    if (b.status === 'Pending') { p.status = 'Pending'; p.method = ''; p.paidAt = null; p.razorpayPaymentId = ''; }
    else throw bad('Invalid status.');
  } else if (b.method !== undefined && p.status === 'Completed') p.method = str(b.method, 30);
  await p.save();
  await logActivity(req.user, { action: 'payment.updated', entityType: 'payment', entity: p, summary: `${p.ref} edited (status ${p.status})`, req });
  res.json({ payment: p });
});

export default r;
