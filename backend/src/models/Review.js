import mongoose from 'mongoose';
import { jsonPlugin } from './plugin.js';

const schema = new mongoose.Schema(
  {
    kind: { type: String, enum: ['consultation', 'visit'], required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, required: true },
    bookingRef: { type: String, default: '' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerName: { type: String, default: '' },
    targetId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
    hidden: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);
schema.index({ kind: 1, bookingId: 1 }, { unique: true });
jsonPlugin(schema);
export const Review = mongoose.model('Review', schema);
