import mongoose from 'mongoose';
import { jsonPlugin } from './plugin.js';

const schema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
    title: String,
    text: String,
    to: { type: String, default: '' },
    type: { type: String, default: 'info' },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
jsonPlugin(schema);
export const Notification = mongoose.model('Notification', schema);
