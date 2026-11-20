import { Router } from 'express';
import { Service } from '../models/Service.js';
import { Consultation } from '../models/Consultation.js';
import { optionalAuth, requireRole } from '../middleware/auth.js';
import { bad, conflict } from '../utils/ApiError.js';
import { logActivity } from '../services/activity.js';
import { findOrFail, num, str } from '../utils/helpers.js';

const r = Router();

function clean(b, partial) {
  const o = {};
  if (!partial || b.name !== undefined) { if (!str(b.name)) throw bad('Add a service name.'); o.name = str(b.name, 100); }
  if (!partial || b.fee !== undefined) { if (!(num(b.fee) > 0)) throw bad('Enter the fee.'); o.fee = num(b.fee); }
  if (b.description !== undefined) o.description = str(b.description, 800);
  if (b.duration !== undefined) o.duration = Math.max(10, num(b.duration, 60));
  if (b.mode !== undefined) o.mode = str(b.mode, 60);
  if (b.icon !== undefined) o.icon = str(b.icon, 30);
  if (b.active !== undefined) o.active = b.active === true;
  return o;
}

r.get('/', optionalAuth, async (req, res) => {
  const staff = req.user && ['admin', 'consultant'].includes(req.user.role);
  res.json({ items: await Service.find(staff ? {} : { active: true }).sort({ createdAt: 1 }) });
});
r.post('/', requireRole('admin', 'consultant'), async (req, res) => {
  const service = await Service.create(clean(req.body || {}, false));
  await logActivity(req.user, { action: 'service.created', entityType: 'service', entity: service, entityRef: service.name, summary: `Service "${service.name}" added`, req });
  res.status(201).json({ service });
});
r.patch('/:id', requireRole('admin', 'consultant'), async (req, res) => {
  const s = await findOrFail(Service, req.params.id, 'Service');
  Object.assign(s, clean(req.body || {}, true));
  await s.save();
  await logActivity(req.user, { action: 'service.updated', entityType: 'service', entity: s, entityRef: s.name, summary: `Service "${s.name}" updated`, req });
  res.json({ service: s });
});
r.delete('/:id', requireRole('admin', 'consultant'), async (req, res) => {
  const s = await findOrFail(Service, req.params.id, 'Service');
  if (await Consultation.exists({ serviceId: s._id })) throw conflict('Bookings exist for this service. Turn it off instead of deleting it.');
  await logActivity(req.user, { action: 'service.deleted', entityType: 'service', entity: s, entityRef: s.name, summary: `Service "${s.name}" deleted`, req });
  await s.deleteOne();
  res.json({ ok: true });
});
export default r;
