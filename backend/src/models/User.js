import mongoose from 'mongoose';
import { jsonPlugin } from './plugin.js';

const availability = new mongoose.Schema(
  { days: { type: [Number], default: [1, 2, 3, 4, 5, 6] }, slots: { type: [String], default: ['10:00', '11:30', '14:00', '15:30', '17:00'] }, blocked: { type: [String], default: [] } },
  { _id: false }
);

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'agent', 'consultant', 'admin'], default: 'customer', index: true },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    emailVerified: { type: Boolean, default: false },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
    joined: { type: String, default: '' },
    prefs: { email: { type: Boolean, default: true } },

    bio: { type: String, default: '' },
    areas: { type: [String], default: undefined },
    experience: { type: Number, default: 0 },
    languages: { type: [String], default: undefined },
    workingDays: { type: [Number], default: undefined },
    workHours: { type: String, default: '' },
    specialization: { type: String, default: '' },
    availability: { type: availability, default: undefined },

    consent: { type: new mongoose.Schema({ acceptedAt: Date, version: String }, { _id: false }), default: undefined },

    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
    lastLoginAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);
jsonPlugin(schema, ['passwordHash', 'loginAttempts', 'lockUntil']);
export const User = mongoose.model('User', schema);
