import mongoose from 'mongoose';
import { jsonPlugin } from './plugin.js';

const schema = new mongoose.Schema(
  {
    ref: { type: String, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    consultantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null },
    propertyType: { type: String, default: '' },
    direction: { type: String, default: '' },
    address: { type: String, default: '' },
    concerns: { type: String, default: '' },
    floorPlans: { type: [new mongoose.Schema({ name: String, url: String }, { _id: false })], default: [] },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ['Requested', 'Confirmed', 'Completed', 'Cancelled'], default: 'Requested', index: true },
    assessmentNotes: { type: String, default: '' },
    recommendations: { type: String, default: '' },
    followUp: { type: mongoose.Schema.Types.Mixed, default: undefined },
    fee: { type: Number, default: 0 },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);
schema.index({ consultantId: 1, date: 1, time: 1 });
jsonPlugin(schema, ['reminderSent']);
export const Consultation = mongoose.model('Consultation', schema);
