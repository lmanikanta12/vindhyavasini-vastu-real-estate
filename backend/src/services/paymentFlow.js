import { Payment } from '../models/Payment.js';
import { Consultation } from '../models/Consultation.js';
import { Service } from '../models/Service.js';
import { User } from '../models/User.js';
import { notify, notifyAdmins } from './notify.js';
import { logActivity } from './activity.js';
import { fmtDateLong, inr, todayISO } from '../utils/helpers.js';

export async function completePayment(payment, { method, razorpayPaymentId, gatewayRef, recordedBy, actor = null } = {}) {
  if (payment.status === 'Completed') return { payment, already: true };
  payment.status = 'Completed';
  payment.method = method || payment.method || 'Online';
  payment.date = todayISO();
  payment.paidAt = new Date();
  if (razorpayPaymentId) payment.razorpayPaymentId = razorpayPaymentId;
  if (gatewayRef) payment.gatewayRef = gatewayRef;
  if (recordedBy) payment.recordedBy = recordedBy;
  await payment.save();

  const customer = await User.findById(payment.customerId);
  await logActivity(actor || customer, { action: 'payment.completed', entityType: 'payment', entity: payment, summary: `${inr(payment.amount)} paid via ${payment.method} for ${payment.description}`, });
  const cons = payment.consultationId ? await Consultation.findById(payment.consultationId) : null;
  if (customer) {
    await notify(
      customer,
      { title: 'Payment received', text: `${inr(payment.amount)} paid for ${payment.description}. Receipt ${payment.ref}.`, to: '/customer/payments', type: 'payment' },
      { email: { template: 'paymentReceipt', data: { receipt: payment.ref, description: payment.description, amount: inr(payment.amount), method: payment.method, date: fmtDateLong(payment.date) } }, critical: true }
    );
  }
  if (cons?.consultantId) {
    const svc = await Service.findById(cons.serviceId);
    await notify(cons.consultantId, { title: 'Consultation fee paid', text: `${customer?.name || 'Customer'} paid for ${svc?.name || 'a consultation'} (${cons.ref}).`, to: '/consultant/requests', type: 'payment' });
  }
  await notifyAdmins({ title: 'Payment received', text: `${inr(payment.amount)} from ${customer?.name || 'a customer'} (${payment.ref}).`, to: '/admin/payments', type: 'payment' });
  return { payment, already: false };
}

export const findPaymentByOrder = (orderId) => Payment.findOne({ razorpayOrderId: orderId });
