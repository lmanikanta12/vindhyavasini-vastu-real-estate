import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', index: true },
}, { timestamps: true });
schema.index({ userId: 1, propertyId: 1 }, { unique: true });
export const Shortlist = mongoose.model('Shortlist', schema);
