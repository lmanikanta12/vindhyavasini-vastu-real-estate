import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

let client = null;
if (env.razorpay.configured) client = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret });

const need = () => {
  if (!client) throw new ApiError(503, 'Online payment is not set up yet. Please contact the administrator.');
  return client;
};

export const createOrder = ({ amount, receipt, notes }) => need().orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt, notes });
export const fetchPayment = (id) => need().payments.fetch(id);

export function verifyCheckoutSignature(orderId, paymentId, signature) {
  const expected = crypto.createHmac('sha256', env.razorpay.keySecret || '').update(`${orderId}|${paymentId}`).digest('hex');
  return safeEqual(expected, signature);
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret) return false;
  const expected = crypto.createHmac('sha256', env.razorpay.webhookSecret).update(rawBody).digest('hex');
  return safeEqual(expected, signature);
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const METHOD = { upi: 'UPI', card: 'Card', netbanking: 'Net Banking', wallet: 'Wallet', emi: 'EMI', paylater: 'Pay Later' };
export const methodLabel = (m) => METHOD[m] || (m ? String(m) : 'Online');
