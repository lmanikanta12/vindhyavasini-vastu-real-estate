import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { User } from '../models/User.js';
import { Enquiry } from '../models/Enquiry.js';
import { ConstructionRequest } from '../models/ConstructionRequest.js';
import { SiteVisit } from '../models/SiteVisit.js';
import { Consultation } from '../models/Consultation.js';
import { Payment } from '../models/Payment.js';
import { Shortlist } from '../models/Shortlist.js';
import { Notification } from '../models/Notification.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Review } from '../models/Review.js';
import { requireRole } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import { notify, notifyAdmins } from '../services/notify.js';
import { logActivity } from '../services/activity.js';
import { customerView } from './enquiries.js';
import { bad, conflict } from '../utils/ApiError.js';

const r = Router();
const DELETED = 'Deleted user';

r.get('/export', requireRole('customer'), async (req, res) => {
  const id = req.user._id;
  const [enquiries, siteVisits, consultations, payments, shortlist, construction] = await Promise.all([
    Enquiry.find({ customerId: id }).sort({ createdAt: -1 }),
    SiteVisit.find({ customerId: id }).sort({ date: -1 }),
    Consultation.find({ customerId: id }).sort({ date: -1 }),
    Payment.find({ customerId: id }).sort({ createdAt: -1 }),
    Shortlist.find({ userId: id }),
    ConstructionRequest.find({ customerId: id }).sort({ createdAt: -1 }),
  ]);
  await logActivity(req.user, { action: 'account.exported', entityType: 'user', entity: req.user, entityRef: req.user.email, summary: 'Customer downloaded their data', req });
  const body = {
    exportedAt: new Date().toISOString(),
    profile: req.user.toJSON(),
    enquiries: enquiries.map(customerView),
    siteVisits,
    consultations,
    payments,
    constructionRequests: construction,
    reviews: await Review.find({ customerId: id }),
    shortlistedPropertyIds: shortlist.map((s) => String(s.propertyId)),
  };
  res.setHeader('Content-Disposition', 'attachment; filename="my-data.json"');
  res.json(body);
});

r.post('/delete', requireRole('customer'), authLimiter, async (req, res) => {
  const user = req.user;
  if (!(await bcrypt.compare(String(req.body?.password || ''), user.passwordHash))) throw bad('Password is incorrect.');
  if (await Payment.exists({ customerId: user._id, status: 'Pending' })) {
    throw conflict('You have a payment that is still pending. Please pay it or cancel the booking first.');
  }

  const visits = await SiteVisit.find({ customerId: user._id, status: { $in: ['Requested', 'Scheduled'] } });
  for (const v of visits) {
    v.status = 'Cancelled';
    await v.save();
    await notify(v.agentId, { title: 'Site visit cancelled', text: `${v.ref} was cancelled because the customer closed their account.`, to: '/agent/visits', type: 'visit' });
  }
  const consults = await Consultation.find({ customerId: user._id, status: { $in: ['Requested', 'Confirmed'] } });
  for (const c of consults) {
    c.status = 'Cancelled';
    await c.save();
    await notify(c.consultantId, { title: 'Consultation cancelled', text: `${c.ref} was cancelled because the customer closed their account.`, to: '/consultant/requests', type: 'consultation' });
    if (await Payment.exists({ consultationId: c._id, status: 'Completed' })) {
      await notifyAdmins({ title: 'Refund needed', text: `${c.ref} was already paid and the customer deleted their account. Please arrange the refund.`, to: '/admin/payments', type: 'payment' });
    }
  }

  await logActivity(user, { action: 'account.deleted', entityType: 'user', entity: user, entityRef: 'Customer account', summary: 'Customer deleted their account', req });

  await Enquiry.updateMany({ customerId: user._id }, { $set: { 'contact.name': DELETED, 'contact.email': '', 'contact.phone': '' } });
  await ConstructionRequest.updateMany({ customerId: user._id }, { $set: { 'contact.name': DELETED, 'contact.email': '', 'contact.phone': '', location: '', message: '' } });
  await Consultation.updateMany({ customerId: user._id }, { $set: { address: '', concerns: '', floorPlans: [] } });
  await Review.updateMany({ customerId: user._id }, { $set: { customerName: DELETED } });
  await Shortlist.deleteMany({ userId: user._id });
  await Notification.deleteMany({ userId: user._id });
  await ActivityLog.updateMany({ actorId: user._id }, { $set: { actorName: DELETED, ip: '' } });

  user.name = DELETED;
  user.email = `deleted-${user._id}@removed.local`;
  user.phone = '';
  user.city = '';
  user.address = '';
  user.consent = undefined;
  user.status = 'Inactive';
  user.emailVerified = false;
  user.passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
  user.deletedAt = new Date();
  await user.save();
  res.json({ ok: true });
});

export default r;
