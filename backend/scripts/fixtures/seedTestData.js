import fs from 'node:fs';
import mongoose from 'mongoose';
import { connectDB } from '../../src/config/db.js';
import { User } from '../../src/models/User.js';
import { Property } from '../../src/models/Property.js';
import { Enquiry } from '../../src/models/Enquiry.js';
import { ConstructionRequest } from '../../src/models/ConstructionRequest.js';
import { SiteVisit } from '../../src/models/SiteVisit.js';
import { Service } from '../../src/models/Service.js';
import { Consultation } from '../../src/models/Consultation.js';
import { Payment } from '../../src/models/Payment.js';
import { Shortlist } from '../../src/models/Shortlist.js';
import { nextRef } from '../../src/models/Counter.js';
import { getSettings } from '../../src/models/Setting.js';
import { hashPw } from '../../src/utils/password.js';

const PASSWORD = 'Test@12345';
const props = JSON.parse(fs.readFileSync(new URL('./properties.json', import.meta.url), 'utf8'));
const services = JSON.parse(fs.readFileSync(new URL('../../src/seed/services.json', import.meta.url), 'utf8'));
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const ago = (n) => new Date(Date.now() - n * 86400000);

await connectDB();
await getSettings();
const passwordHash = await hashPw(PASSWORD);
const base = { passwordHash, emailVerified: true, status: 'Active', prefs: { email: true } };
const av = (slots, days = [1, 2, 3, 4, 5, 6]) => ({ days, slots, blocked: [day(9)] });

const people = [
  { key: 'rohan', name: 'Rohan Deshpande', email: 'agent@vastuestates.in', phone: '+91 98450 10002', role: 'agent', city: 'Bengaluru', joined: day(-300), bio: 'Specialises in premium villas and apartments across East Bengaluru.', areas: ['Whitefield', 'Sarjapur Road', 'HSR Layout'], experience: 9, languages: ['English', 'Kannada', 'Hindi'], workingDays: [1, 2, 3, 4, 5, 6], workHours: '9:30 AM - 6:30 PM' },
  { key: 'priya', name: 'Priya Nair', email: 'priya@vastuestates.in', phone: '+91 98450 10003', role: 'agent', city: 'Bengaluru', joined: day(-210), bio: 'Commercial leasing and plot sales across North Bengaluru and Hyderabad.', areas: ['Hebbal', 'Yelahanka', 'Gachibowli'], experience: 6, languages: ['English', 'Malayalam', 'Tamil'], workingDays: [1, 2, 3, 4, 5], workHours: '10:00 AM - 7:00 PM' },
  { key: 'vikram', name: 'Acharya Vikram Rao', email: 'consultant@vastuestates.in', phone: '+91 98450 10004', role: 'consultant', city: 'Bengaluru', joined: day(-380), bio: 'Three decades of residential and plot Vastu practice with a focus on practical, low-cost corrections.', specialization: 'Residential and Plot Vastu', experience: 28, languages: ['English', 'Kannada', 'Telugu'], availability: av(['10:00', '11:30', '14:00', '15:30', '17:00']) },
  { key: 'lakshmi', name: 'Dr. Lakshmi Narayanan', email: 'lakshmi@vastuestates.in', phone: '+91 98450 10005', role: 'consultant', city: 'Chennai', joined: day(-250), bio: 'Architect and Vastu consultant for offices, showrooms and commercial complexes.', specialization: 'Commercial and Office Vastu', experience: 16, languages: ['English', 'Tamil', 'Hindi'], availability: av(['11:30', '14:00', '15:30'], [1, 2, 3, 4, 5]) },
  { key: 'ananya', name: 'Ananya Sharma', email: 'customer@vastuestates.in', phone: '+91 98450 20001', role: 'customer', city: 'Bengaluru', address: 'Indiranagar, Bengaluru', joined: day(-90) },
  { key: 'karthik', name: 'Karthik Reddy', email: 'karthik@example.com', phone: '+91 98450 20002', role: 'customer', city: 'Hyderabad', joined: day(-60) },
  { key: 'sneha', name: 'Sneha Kulkarni', email: 'sneha@example.com', phone: '+91 98450 20003', role: 'customer', city: 'Pune', joined: day(-35) },
];
const U = {};
for (const p of people) {
  const { key, ...data } = p;
  U[key] = (await User.findOne({ email: data.email })) || (await User.create({ ...base, ...data }));
}

const hasProps = await Property.countDocuments();
const P = {};
if (!hasProps) {
  for (const p of props) {
    const { agentKey, ref, ...data } = p;
    P[ref] = await Property.create({ ...data, ref: await nextRef('property'), agentId: U[agentKey]._id, published: true });
  }
} else {
  for (const p of await Property.find()) P[p.ref] = p;
}

if (!(await Enquiry.countDocuments())) {
  const c = (u) => ({ name: u.name, email: u.email, phone: u.phone });
  const E = [
    ['VE-1001', 'ananya', 'Contacted', 'rohan', 'I would like to know about the possession timeline and whether the price is negotiable.', 'Looking for a 3 BHK villa with a garden, budget up to ₹2 Cr.', -7],
    ['VE-1007', 'ananya', 'New', 'rohan', 'Is the apartment available from the first of next month?', '', -1],
    ['VE-1005', 'karthik', 'Scheduled', 'priya', 'Need details on maintenance charges and parking slots.', 'Needs 8 parking slots for a growing team.', -9],
    ['VE-1004', 'sneha', 'Completed', 'priya', 'Is the layout RERA approved? Please share the documents.', 'Plot for building a family home in 2 years.', -20],
    ['VE-1002', 'karthik', 'New', null, 'Can I get a loan assistance contact?', '', 0],
  ];
  for (const [ref, who, status, agent, message, requirements, age] of E) {
    const e = await Enquiry.create({ ref: await nextRef('enquiry'), propertyId: P[ref]._id, customerId: U[who]._id, contact: c(U[who]), message, requirements, status, assignedTo: agent ? U[agent]._id : null, createdAt: ago(-age) });
    if (agent && status !== 'New') { e.notes.push({ text: 'Called the customer and shared the details.', by: U[agent].name, byId: U[agent]._id }); await e.save(); }
  }
  await Enquiry.create({ ref: await nextRef('enquiry'), propertyId: P['VE-1009']._id, customerId: null, contact: { name: 'Vivek Joshi', email: 'vivek.joshi@example.com', phone: '+91 98450 30001' }, message: 'Interested in the corner plot. Please call me this week.', status: 'New', assignedTo: U.priya._id });
}

if (!(await ConstructionRequest.countDocuments())) {
  const c = (u) => ({ name: u.name, email: u.email, phone: u.phone });
  const C = [
    ['ananya', 'New house construction', 'Sarjapur Road, Bengaluru', '30 x 40 ft (1,200 sq ft)', '70 L - 90 L', 'Want a 3 BHK east-facing house with a small garden.', 'In progress', 4800000, 'Foundation work has started. Weekly photo updates will be shared.', -14],
    ['karthik', 'Renovation and repairs', 'Gachibowli, Hyderabad', '1,800 sq ft office', '15 L - 20 L', 'Office needs repainting and new flooring.', 'Quoted', 1750000, 'Quote shared. Please review and confirm.', -6],
  ];
  for (const [who, type, location, plotSize, budget, message, status, quote, note, age] of C) {
    const doc = await ConstructionRequest.create({ ref: await nextRef('construction'), customerId: U[who]._id, contact: c(U[who]), type, location, plotSize, budget, message, status, quote, assignedTo: U.rohan._id, createdAt: ago(-age) });
    doc.notes.push({ text: note, by: 'Administrator' });
    await doc.save();
  }
  await ConstructionRequest.create({ ref: await nextRef('construction'), customerId: null, contact: { name: 'Vivek Joshi', email: 'vivek.joshi@example.com', phone: '+91 98450 30001' }, type: 'Interior work', location: 'Hebbal, Bengaluru', plotSize: '3 BHK apartment', budget: '10 L - 12 L', message: 'Kitchen and wardrobes.', status: 'New' });
}

if (!(await SiteVisit.countDocuments())) {
  const V = [['VE-1001', 'ananya', 'rohan', 3, '11:00', 'Scheduled', 'Visiting with family (4 people).'], ['VE-1005', 'karthik', 'priya', 2, '15:00', 'Scheduled', ''], ['VE-1004', 'sneha', 'priya', -10, '09:30', 'Completed', 'Customer liked the plot.'], ['VE-1007', 'ananya', 'rohan', 6, '12:30', 'Requested', 'Prefer a weekend.']];
  for (const [ref, who, agent, d, time, status, note] of V) await SiteVisit.create({ ref: await nextRef('visit'), propertyId: P[ref]._id, customerId: U[who]._id, agentId: U[agent]._id, date: day(d), time, status, note });
}

if (!(await Consultation.countDocuments())) {
  const S = Object.fromEntries((await Service.find()).map((s) => [s.name, s]));
  if (!Object.keys(S).length) { await Service.insertMany(services); for (const s of await Service.find()) S[s.name] = s; }
  const C = [
    ['ananya', 'vikram', 'Home Vastu Consultation', 'VE-1002', 'Apartment', 'North-East', 'HSR Layout, Bengaluru', 'Kitchen is in the north-east corner. Need practical corrections without breaking walls.', -14, '11:30', 'Completed', 'Kitchen and pooja zones are overlapping in the north-east. Main door placement is good.', '1. Shift the cooking range to the south-east side of the kitchen slab.\n2. Keep the north-east corner open and clutter free.\n3. Use light colours on the north walls.', true],
    ['ananya', 'vikram', 'Plot Vastu Assessment', 'VE-1004', 'Plot', 'East', 'Devanahalli, Bengaluru', 'Planning to buy this plot. Want to check slope and road position.', 2, '14:00', 'Confirmed', '', '', false],
    ['karthik', 'lakshmi', 'Office and Commercial Vastu', 'VE-1005', 'Office', 'North', 'Indiranagar, Bengaluru', 'Where should the founder cabin and the accounts team sit?', 4, '15:30', 'Requested', '', '', false],
    ['sneha', 'vikram', 'Floor Plan Review', null, 'House', 'West', 'Kothrud, Pune', 'West-facing entrance. Is the layout acceptable?', -6, '10:00', 'Completed', 'Entrance is acceptable. Kitchen needs a small shift.', '1. Install a threshold strip at the main door.\n2. Move the stove to the south-east side.', true],
  ];
  for (const [who, cons, svc, ref, propertyType, direction, address, concerns, d, time, status, assessmentNotes, recommendations, paid] of C) {
    const s = S[svc];
    const c = await Consultation.create({ ref: await nextRef('consultation'), customerId: U[who]._id, consultantId: U[cons]._id, serviceId: s._id, propertyId: ref ? P[ref]._id : null, propertyType, direction, address, concerns, date: day(d), time, status, assessmentNotes, recommendations, fee: s.fee });
    await Payment.create({ ref: await nextRef('payment'), customerId: U[who]._id, consultationId: c._id, description: `${s.name} (${c.ref})`, amount: s.fee, status: paid ? 'Completed' : 'Pending', method: paid ? 'UPI' : '', date: day(d - 1), paidAt: paid ? ago(-d + 1) : null });
  }
}

if (!(await Shortlist.countDocuments())) {
  for (const [who, refs] of [['ananya', ['VE-1001', 'VE-1002', 'VE-1007']], ['karthik', ['VE-1005']], ['sneha', ['VE-1004']]]) for (const r of refs) await Shortlist.create({ userId: U[who]._id, propertyId: P[r]._id });
}

console.log('Test data ready. All test accounts use the password:', PASSWORD);
console.log('  customer@vastuestates.in   agent@vastuestates.in   consultant@vastuestates.in');
await mongoose.disconnect();
