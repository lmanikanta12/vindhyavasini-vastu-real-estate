import mongoose from 'mongoose';
import { jsonPlugin } from './plugin.js';

const schema = new mongoose.Schema(
  {
    ref: { type: String, unique: true, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    enquiryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Enquiry', default: null },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['Requested', 'Scheduled', 'Completed', 'Cancelled'], default: 'Requested', index: true },
    note: { type: String, default: '' },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);
jsonPlugin(schema, ['reminderSent']);
export const SiteVisit = mongoose.model('SiteVisit', schema);
