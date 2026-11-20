import mongoose from 'mongoose';
import { jsonPlugin } from './plugin.js';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    fee: { type: Number, required: true, min: 0 },
    duration: { type: Number, default: 60 },
    mode: { type: String, default: 'On-site or online' },
    icon: { type: String, default: 'Home' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);
jsonPlugin(schema);
export const Service = mongoose.model('Service', schema);
