import mongoose from 'mongoose';
import { jsonPlugin } from './plugin.js';

const schema = new mongoose.Schema(
  {
    ref: { type: String, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: ['Residential', 'Commercial', 'Rental', 'Plot'], required: true },
    type: { type: String, default: '' },
    city: { type: String, default: '' },
    location: { type: String, default: '' },
    address: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    listingType: { type: String, enum: ['sale', 'rent'], default: 'sale' },
    area: { type: Number, default: 0 },
    bedrooms: { type: Number, default: 0 },
    bathrooms: { type: Number, default: 0 },
    floor: { type: String, default: '-' },
    facing: { type: String, default: 'East' },
    ageYears: { type: Number, default: 0 },
    furnishing: { type: String, default: '-' },
    amenities: { type: [String], default: [] },
    description: { type: String, default: '' },
    vastuNotes: { type: String, default: '' },
    status: { type: String, enum: ['Available', 'Reserved', 'Sold', 'Rented'], default: 'Available', index: true },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: true, index: true },
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    images: { type: [String], default: [] },
    documents: { type: [new mongoose.Schema({ name: String, url: String }, { _id: false })], default: [] },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    art: { type: Number, default: 0 },
  },
  { timestamps: true }
);
schema.index({ title: 'text', location: 'text', city: 'text', address: 'text' });
jsonPlugin(schema);
export const Property = mongoose.model('Property', schema);
