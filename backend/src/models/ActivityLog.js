import mongoose from 'mongoose';
import { jsonPlugin } from './plugin.js';

const schema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    actorName: { type: String, default: 'System' },
    actorRole: { type: String, default: 'system' },
    action: { type: String, required: true, index: true },
    entityType: { type: String, default: '', index: true },
    entityId: { type: String, default: '' },
    entityRef: { type: String, default: '' },
    summary: { type: String, default: '' },
    ip: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
schema.index({ createdAt: -1 });
jsonPlugin(schema);
export const ActivityLog = mongoose.model('ActivityLog', schema);
