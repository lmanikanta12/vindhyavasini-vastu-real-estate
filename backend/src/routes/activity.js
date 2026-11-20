import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { pageParams, rx } from '../utils/paginate.js';
import { isISODate } from '../utils/helpers.js';

const r = Router();

r.get('/', requireRole('admin'), async (req, res) => {
  const g = req.query;
  const q = {};
  if (g.entityType) q.entityType = String(g.entityType);
  if (g.action) q.action = new RegExp(`^${String(g.action).replace(/[^a-z.]/gi, '')}`);
  if (g.role) q.actorRole = String(g.role);
  if (g.actorId) q.actorId = String(g.actorId);
  if (isISODate(g.from) || isISODate(g.to)) {
    q.createdAt = {};
    if (isISODate(g.from)) q.createdAt.$gte = new Date(`${g.from}T00:00:00`);
    if (isISODate(g.to)) q.createdAt.$lte = new Date(`${g.to}T23:59:59.999`);
  }
  if (g.q) { const e = rx(g.q); q.$or = [{ summary: e }, { actorName: e }, { entityRef: e }, { action: e }]; }
  const p = pageParams(g, { sortable: ['createdAt', 'action', 'actorName'], defaultLimit: 25 });
  const [items, total] = await Promise.all([ActivityLog.find(q).sort(p.sort).skip(p.skip).limit(p.limit), ActivityLog.countDocuments(q)]);
  res.json({ items, total, page: p.page, limit: p.limit, pages: Math.max(1, Math.ceil(total / p.limit)) });
});

export default r;
