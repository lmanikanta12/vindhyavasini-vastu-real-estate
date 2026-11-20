import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  email: { type: String, index: true },
  purpose: { type: String, enum: ['verify', 'reset'] },
  codeHash: String,
  attempts: { type: Number, default: 0 },
  lastSentAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, index: { expires: 0 } },
});
export const Otp = mongoose.model('Otp', schema);
