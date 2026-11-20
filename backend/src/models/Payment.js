import mongoose from 'mongoose';
import { jsonPlugin } from './plugin.js';

const schema = new mongoose.Schema(
  {
    ref: { type: String, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    consultationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultation', default: null, index: true },
    description: { type: String, default: '' },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['Pending', 'Completed'], default: 'Pending', index: true },
    method: { type: String, default: '' },
    date: { type: String, default: '' },
    razorpayOrderId: { type: String, default: '' },
    razorpayPaymentId: { type: String, default: '' },
    gatewayRef: { type: String, default: '' },
    paidAt: { type: Date, default: null },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastReminderAt: { type: Date, default: null },
  },
  { timestamps: true }
);
jsonPlugin(schema, ['lastReminderAt']);
export const Payment = mongoose.model('Payment', schema);
