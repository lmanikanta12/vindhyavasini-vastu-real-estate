import fs from 'node:fs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Service } from '../models/Service.js';
import { getSettings } from '../models/Setting.js';
import { hashPw, validatePassword } from '../utils/password.js';
import { todayISO } from '../utils/helpers.js';

const services = JSON.parse(fs.readFileSync(new URL('./services.json', import.meta.url), 'utf8'));

await connectDB();
validatePassword(env.admin.password);
const email = env.admin.email.toLowerCase();
let admin = await User.findOne({ email });
if (admin) {
  console.log(`Admin already exists: ${email}`);
} else {
  admin = await User.create({ name: env.admin.name, email, phone: env.admin.phone, passwordHash: await hashPw(env.admin.password), role: 'admin', status: 'Active', emailVerified: true, joined: todayISO() });
  console.log(`Admin created: ${email}  (password from ADMIN_PASSWORD in .env)`);
}
await getSettings();
if ((await Service.countDocuments()) === 0) {
  await Service.insertMany(services);
  console.log(`Added ${services.length} standard Vastu services.`);
}
console.log('Done. You can now start the server and log in as the administrator.');
await mongoose.disconnect();
