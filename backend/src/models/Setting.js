import mongoose from 'mongoose';
import { jsonPlugin } from './plugin.js';

export const SETTING_DEFAULTS = {
  businessName: 'Vindhyavasini Vastu and Real Estate',
  email: 'hello@vastuestates.in',
  phone: '+91 80 4000 1234',
  address: '2nd Floor, Harmony Towers, MG Road, Bengaluru 560001',
  hours: 'Mon - Sat, 9:30 AM to 6:30 PM',
  emailReminders: true,
  reminderLeadHours: 24,
};

const schema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  businessName: { type: String, default: SETTING_DEFAULTS.businessName },
  email: { type: String, default: SETTING_DEFAULTS.email },
  phone: { type: String, default: SETTING_DEFAULTS.phone },
  address: { type: String, default: SETTING_DEFAULTS.address },
  hours: { type: String, default: SETTING_DEFAULTS.hours },
  emailReminders: { type: Boolean, default: true },
  reminderLeadHours: { type: Number, default: 24 },
});
jsonPlugin(schema, ['key', 'id']);
export const Setting = mongoose.model('Setting', schema);
export async function getSettings() {
  let s = await Setting.findOne({ key: 'main' });
  if (!s) s = await Setting.create({ key: 'main' });
  return s;
}
