import { Router } from 'express';
import { Property } from '../models/Property.js';
import { User } from '../models/User.js';
import { Shortlist } from '../models/Shortlist.js';
import { SiteVisit } from '../models/SiteVisit.js';
import { nextRef } from '../models/Counter.js';
import { optionalAuth, requireRole } from '../middleware/auth.js';
import { notify } from '../services/notify.js';
import { logActivity } from '../services/activity.js';
import { bad, forbidden, notFound } from '../utils/ApiError.js';
import { escapeRegex, findOrFail, idOrNull, num, requireFields, str, strList } from '../utils/helpers.js';

const r = Router();

const CATEGORIES = ['Residential', 'Commercial', 'Rental', 'Plot'];
const STATUSES = ['Available', 'Reserved', 'Sold', 'Rented'];
const okUrl = (u) => typeof u === 'string' && (u.startsWith('/uploads/') || /^https?:\/\//i.test(u));

function clean(b, { partial = false } = {}) {
  const out = {};
  const set = (k, v) => { if (!partial || b[k] !== undefined) out[k] = v; };
  set('title', str(b.title, 140));
  if (b.category !== undefined || !partial) {
    if (!CATEGORIES.includes(b.category)) throw bad('Choose a valid category.');
    out.category = b.category;
  }
  set('type', str(b.type, 60));
  set('city', str(b.city, 60));
  set('location', str(b.location, 100));
  set('address', str(b.address, 200));
  if (b.price !== undefined || !partial) {
    if (!(num(b.price) > 0)) throw bad('Enter a valid price.');
    out.price = num(b.price);
  }
  if (b.listingType !== undefined || b.category !== undefined || !partial) out.listingType = (b.listingType || (b.category === 'Rental' ? 'rent' : 'sale')) === 'rent' ? 'rent' : 'sale';
  set('area', Math.max(0, num(b.area)));
  set('bedrooms', Math.max(0, num(b.bedrooms)));
  set('bathrooms', Math.max(0, num(b.bathrooms)));
  set('floor', str(b.floor, 30) || '-');
  set('facing', str(b.facing, 20) || 'East');
  set('ageYears', Math.max(0, num(b.ageYears)));
  set('furnishing', str(b.furnishing, 30) || '-');
  set('amenities', strList(b.amenities));
  set('description', str(b.description, 3000));
  set('vastuNotes', str(b.vastuNotes, 1500));

  for (const [k, lim] of [['lat', 90], ['lng', 180]]) {
    if (b[k] === undefined && partial) continue;
    const v = b[k] === '' || b[k] === null || b[k] === undefined ? null : Number(b[k]);
    if (v !== null && (!Number.isFinite(v) || Math.abs(v) > lim)) throw bad(`Enter a valid ${k === 'lat' ? 'latitude' : 'longitude'}.`);
    out[k] = v;
  }
  if (b.status !== undefined) {
    if (!STATUSES.includes(b.status)) throw bad('Invalid status.');
    out.status = b.status;
  }
  if (b.featured !== undefined) out.featured = b.featured === true;
  if (b.published !== undefined) out.published = b.published !== false;
  if (b.images !== undefined) {
    if (!Array.isArray(b.images) || b.images.some((u) => !okUrl(u))) throw bad('Photos must be uploaded first.');
    out.images = b.images.slice(0, 12);
  }
  if (b.documents !== undefined) {
    if (!Array.isArray(b.documents) || b.documents.some((d) => !okUrl(d?.url))) throw bad('Documents must be uploaded first.');
    out.documents = b.documents.slice(0, 5).map((d) => ({ name: str(d.name, 120), url: d.url }));
  }
  return out;
}

const owns = (user, p) => user.role === 'admin' || String(p.agentId) === String(user._id);

r.get('/', optionalAuth, async (req, res) => {
  const q = {};
  const g = req.query;
  const staffView = req.user && (req.user.role === 'admin' || (req.user.role === 'agent' && g.mine === 'true'));
  if (!staffView) q.published = true;
  if (req.user?.role === 'agent' && g.mine === 'true') q.agentId = req.user._id;
  if (g.category && CATEGORIES.includes(g.category)) q.category = g.category;
  if (g.type) q.type = String(g.type);
  if (g.city) q.city = new RegExp(`^${escapeRegex(g.city)}$`, 'i');
  if (g.listingType) q.listingType = g.listingType === 'rent' ? 'rent' : 'sale';
  if (g.facing) q.facing = String(g.facing);
  if (g.status && STATUSES.includes(g.status)) q.status = g.status;
  if (g.featured === 'true') q.featured = true;
  if (g.bedrooms) q.bedrooms = { $gte: num(g.bedrooms) };
  if (g.minPrice || g.maxPrice) q.price = { ...(g.minPrice && { $gte: num(g.minPrice) }), ...(g.maxPrice && { $lte: num(g.maxPrice) }) };
  if (g.minArea || g.maxArea) q.area = { ...(g.minArea && { $gte: num(g.minArea) }), ...(g.maxArea && { $lte: num(g.maxArea) }) };
  if (g.ids) q._id = { $in: String(g.ids).split(',').filter((i) => idOrNull(i)).slice(0, 100) };
  if (g.q) {
    const rx = new RegExp(escapeRegex(String(g.q).slice(0, 80)), 'i');
    q.$or = [{ title: rx }, { location: rx }, { city: rx }, { address: rx }, { ref: rx }];
  }
  const sorts = { newest: { createdAt: -1 }, 'price-asc': { price: 1 }, 'price-desc': { price: -1 }, 'area-desc': { area: -1 } };
  const page = Math.max(1, num(g.page, 1));
  const limit = Math.min(60, Math.max(1, num(g.limit, 12)));

  const sortBy = sorts[g.sort] || (['createdAt', 'price', 'area', 'title', 'status', 'category', 'ref'].includes(g.sort) ? { [g.sort]: g.dir === 'asc' ? 1 : -1, _id: -1 } : sorts.newest);
  const [items, total] = await Promise.all([
    Property.find(q).sort(sortBy).skip((page - 1) * limit).limit(limit),
    Property.countDocuments(q),
  ]);
  res.json({ items, total, page, pages: Math.ceil(total / limit) });
});

r.get('/:id', optionalAuth, async (req, res) => {
  const p = await findOrFail(Property, req.params.id, 'Property');
  if (!p.published && !(req.user && owns(req.user, p))) throw notFound('Property not found.');
  res.json({ property: p });
});

r.post('/', requireRole('agent', 'admin'), async (req, res) => {
  requireFields(req.body || {}, { title: 'Title', category: 'Category', price: 'Price' });
  const data = clean(req.body);
  let agentId = req.user._id;
  if (req.user.role === 'admin' && req.body.agentId) {
    const a = idOrNull(req.body.agentId) && (await User.findById(req.body.agentId));
    if (!a || !['agent', 'admin'].includes(a.role)) throw bad('Choose a valid agent.');
    agentId = a._id;
  }
  const count = await Property.countDocuments();
  const p = await Property.create({ ...data, agentId, ref: await nextRef('property'), art: Number.isFinite(Number(req.body.art)) ? Number(req.body.art) : count % 12 });
  await logActivity(req.user, { action: 'property.created', entityType: 'property', entity: p, summary: `Listing "${p.title}" created`, req });
  res.status(201).json({ property: p });
});

r.patch('/:id', requireRole('agent', 'admin'), async (req, res) => {
  const p = await findOrFail(Property, req.params.id, 'Property');
  if (!owns(req.user, p)) throw forbidden('You can only edit your own listings.');
  const before = p.status;
  Object.assign(p, clean(req.body, { partial: true }));
  if (req.user.role === 'admin' && req.body.agentId) {
    const a = idOrNull(req.body.agentId) && (await User.findById(req.body.agentId));
    if (!a || !['agent', 'admin'].includes(a.role)) throw bad('Choose a valid agent.');
    p.agentId = a._id;
  }
  await p.save();

  if (before !== p.status && ['Sold', 'Rented', 'Reserved'].includes(p.status)) {
    const saved = await Shortlist.find({ propertyId: p._id });
    await Promise.all(saved.map((s) => notify(s.userId, { title: `Shortlisted property is now ${p.status.toLowerCase()}`, text: `${p.title} (${p.ref}) is ${p.status.toLowerCase()}.`, to: '/customer/shortlist', type: 'property' })));
  }
  await logActivity(req.user, { action: before !== p.status ? 'property.status_changed' : 'property.updated', entityType: 'property', entity: p, summary: before !== p.status ? `"${p.title}" changed from ${before} to ${p.status}` : `Listing "${p.title}" edited (${Object.keys(req.body || {}).filter((k) => k !== 'images').join(', ')}${req.body?.images ? ', photos' : ''})`, req });
  res.json({ property: p });
});

r.delete('/:id', requireRole('agent', 'admin'), async (req, res) => {
  const p = await findOrFail(Property, req.params.id, 'Property');
  if (!owns(req.user, p)) throw forbidden('You can only delete your own listings.');

  const visits = await SiteVisit.find({ propertyId: p._id, status: { $in: ['Requested', 'Scheduled'] } });
  for (const v of visits) {
    v.status = 'Cancelled';
    await v.save();
    if (v.customerId) await notify(v.customerId, { title: 'Site visit cancelled', text: `${p.title} is no longer listed, so visit ${v.ref} was cancelled.`, to: '/customer/appointments', type: 'visit' });
  }
  await Shortlist.deleteMany({ propertyId: p._id });
  await logActivity(req.user, { action: 'property.deleted', entityType: 'property', entity: p, summary: `Listing "${p.title}" deleted${visits.length ? ` (${visits.length} open visit(s) cancelled)` : ''}`, req });
  await p.deleteOne();
  res.json({ ok: true });
});

export default r;
