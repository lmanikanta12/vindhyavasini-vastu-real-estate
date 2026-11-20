import mongoose from 'mongoose';
import { bad, notFound } from './ApiError.js';

export const pick = (obj = {}, keys = []) => {
  const out = {};
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k];
  return out;
};

export const isEmail = (s) => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
export const normEmail = (s) => String(s || '').trim().toLowerCase();
export const str = (v, max = 2000) => (v === undefined || v === null ? '' : String(v).trim().slice(0, max));
export const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
export const strList = (v, maxItems = 40) => (Array.isArray(v) ? v.map((x) => str(x, 120)).filter(Boolean).slice(0, maxItems) : []);

export const isValidId = (id) => mongoose.isValidObjectId(id);
export const idOrNull = (v) => (v && isValidId(v) ? String(v) : null);

export function requireFields(body, fields) {
  for (const [key, label] of Object.entries(fields)) {
    const v = body[key];
    if (v === undefined || v === null || String(v).trim() === '') throw bad(`${label} is required.`);
  }
}

export async function findOrFail(Model, id, label = 'Record') {
  if (!isValidId(id)) throw notFound(`${label} not found.`);
  const doc = await Model.findById(id);
  if (!doc) throw notFound(`${label} not found.`);
  return doc;
}

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const isPastSlot = (date, time) => {
  if (!date) return false;
  const when = new Date(`${date}T${time || '00:00'}:00`);
  return when.getTime() < Date.now();
};

export const isISODate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
export const isTime = (s) => /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s || ''));

export function fmtDateLong(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}
export function fmtTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}
export const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
