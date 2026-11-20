import mongoose from 'mongoose';
import { jsonPlugin } from './plugin.js';

const note = new mongoose.Schema({ text: String, by: String, private: { type: Boolean, default: false }, byId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } });
note.set('toJSON', { transform: (_d, r) => { r.id = String(r._id); delete r._id; delete r.byId; return r; } });

const schema = new mongoose.Schema(
  {
    ref: { type: String, unique: true, index: true },
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', default: null, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    contact: { name: String, email: String, phone: String },
    message: { type: String, default: '' },
    requirements: { type: String, default: '' },
    status: { type: String, enum: ['New', 'Contacted', 'Scheduled', 'Completed', 'Closed'], default: 'New', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    notes: { type: [note], default: [] },
  },
  { timestamps: true }
);
jsonPlugin(schema);
export const Enquiry = mongoose.model('Enquiry', schema);
