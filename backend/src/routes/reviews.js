import { Router } from 'express';
import { Review } from '../models/Review.js';
import { Consultation } from '../models/Consultation.js';
import { SiteVisit } from '../models/SiteVisit.js';
import { requireRole } from '../middleware/auth.js';
import { notify } from '../services/notify.js';
import { logActivity } from '../services/activity.js';
import { buildRefs, pageParams, paged, rx, userIdsLike } from '../utils/paginate.js';
import { bad, conflict, forbidden } from '../utils/ApiError.js';
import { findOrFail, idOrNull, str } from '../utils/helpers.js';

const r = Router();

const shortName = (name = '') => {
  const [first, ...rest] = String(name).trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first || 'Customer';
};

const publicReview = (x) => ({ id: String(x._id), kind: x.kind, rating: x.rating, comment: x.comment, customerName: x.customerName, createdAt: x.createdAt });

r.get('/summary', async (_req, res) => {
  const rows = await Review.find({ hidden: false }, 'targetId rating').lean();
  const totals = {};
  for (const x of rows) {
    const t = (totals[String(x.targetId)] ||= { sum: 0, count: 0 });
    t.sum += x.rating;
    t.count += 1;
  }
  const summary = {};
  for (const [id, t] of Object.entries(totals)) summary[id] = { avg: Math.round((t.sum / t.count) * 10) / 10, count: t.count };
  res.json({ summary });
});

r.get('/mine', requireRole('customer'), async (req, res) => {
  const mine = await Review.find({ customerId: req.user._id });
  res.json({ items: mine.map((x) => ({ id: String(x._id), kind: x.kind, bookingId: String(x.bookingId), rating: x.rating, comment: x.comment })) });
});

r.get('/staff/:id', async (req, res) => {
  const id = idOrNull(req.params.id);
  if (!id) throw bad('Invalid person.');
  const p = pageParams(req.query, { sortable: ['createdAt', 'rating'], defaultLimit: 10 });
  const out = await paged(Review, { targetId: id, hidden: false }, p, { transform: publicReview });
  res.json({ items: out.items, total: out.total, page: out.page, pages: out.pages, limit: out.limit });
});

r.post('/', requireRole('customer'), async (req, res) => {
  const b = req.body || {};
  const rating = Math.round(Number(b.rating));
  if (!(rating >= 1 && rating <= 5)) throw bad('Choose a rating from 1 to 5 stars.');
  if (!['consultation', 'visit'].includes(b.kind)) throw bad('Invalid booking type.');
  const booking = idOrNull(b.bookingId) && (await (b.kind === 'consultation' ? Consultation : SiteVisit).findById(b.bookingId));
  if (!booking || String(booking.customerId) !== String(req.user._id)) throw forbidden('You can only review your own bookings.');
  if (booking.status !== 'Completed') throw conflict('You can review a booking after it is completed.');
  const targetId = b.kind === 'consultation' ? booking.consultantId : booking.agentId;
  if (!targetId) throw bad('This booking has no one to review.');
  if (await Review.exists({ kind: b.kind, bookingId: booking._id })) throw conflict('You have already reviewed this booking.');

  const review = await Review.create({ kind: b.kind, bookingId: booking._id, bookingRef: booking.ref, customerId: req.user._id, customerName: shortName(req.user.name), targetId, rating, comment: str(b.comment, 600) });
  await notify(targetId, { title: `New ${rating}-star review`, text: `${review.customerName} reviewed ${booking.ref}.`, to: b.kind === 'consultation' ? '/consultant' : '/agent', type: 'review' });
  await logActivity(req.user, { action: 'review.created', entityType: 'review', entity: review, entityRef: booking.ref, summary: `${rating}-star review for ${booking.ref}`, req });
  res.status(201).json({ review: publicReview(review) });
});

r.get('/', requireRole('admin'), async (req, res) => {
  const g = req.query;
  const q = {};
  if (g.hidden === 'true') q.hidden = true;
  if (g.hidden === 'false') q.hidden = false;
  if (g.rating && Number(g.rating) >= 1 && Number(g.rating) <= 5) q.rating = Number(g.rating);
  if (g.kind === 'consultation' || g.kind === 'visit') q.kind = g.kind;
  if (g.q) {
    const people = await userIdsLike(g.q);
    q.$or = [{ comment: rx(g.q) }, { bookingRef: rx(g.q) }, { customerName: rx(g.q) }, ...(people.length ? [{ targetId: { $in: people } }] : [])];
  }
  const p = pageParams(g, { sortable: ['createdAt', 'rating'], defaultLimit: 15 });
  const out = await paged(Review, q, p);
  res.json({ items: out.items, total: out.total, page: out.page, pages: out.pages, limit: out.limit, refs: await buildRefs(out.rows, { users: ['targetId'] }) });
});

r.patch('/:id', requireRole('admin'), async (req, res) => {
  const review = await findOrFail(Review, req.params.id, 'Review');
  if (typeof req.body?.hidden !== 'boolean') throw bad('Say whether the review should be hidden.');
  review.hidden = req.body.hidden;
  await review.save();
  await logActivity(req.user, { action: review.hidden ? 'review.hidden' : 'review.shown', entityType: 'review', entity: review, entityRef: review.bookingRef, summary: `Review of ${review.bookingRef} ${review.hidden ? 'hidden' : 'shown again'}`, req });
  res.json({ review });
});

export default r;
