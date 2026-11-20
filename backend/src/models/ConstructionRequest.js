import mongoose from 'mongoose';
import { jsonPlugin } from './plugin.js';

export const CONSTRUCTION_TYPES = ['New house construction', 'Apartment or villa construction', 'Commercial building', 'Renovation and repairs', 'Interior work'];
export const CONSTRUCTION_STATUSES = ['New', 'Site visit', 'Quoted', 'In progress', 'Completed', 'Closed'];

const note = new mongoose.Schema({ text: String, by: String, byId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, at: { type: Date, default: Date.now } });
note.set('toJSON', { transform: (_d, r) => { r.id = String(r._id); delete r._id; delete r.byId; return r; } });

const schema = new mongoose.Schema(
  {
    ref: { type: String, unique: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    contact: { name: String, email: String, phone: String },
    type: { type: String, enum: CONSTRUCTION_TYPES, required: true },
    location: { type: String, default: '' },
    plotSize: { type: String, default: '' },
    budget: { type: String, default: '' },
    message: { type: String, default: '' },
    status: { type: String, enum: CONSTRUCTION_STATUSES, default: 'New', index: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    quote: { type: Number, default: null },
    notes: { type: [note], default: [] },
  },
  { timestamps: true }
);
jsonPlugin(schema);
export const ConstructionRequest = mongoose.model('ConstructionRequest', schema);
