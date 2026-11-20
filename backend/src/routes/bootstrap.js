import { Router } from 'express';
import { User } from '../models/User.js';
import { Property } from '../models/Property.js';
import { Enquiry } from '../models/Enquiry.js';
import { ConstructionRequest } from '../models/ConstructionRequest.js';
import { SiteVisit } from '../models/SiteVisit.js';
import { Service } from '../models/Service.js';
import { Consultation } from '../models/Consultation.js';
import { Payment } from '../models/Payment.js';
import { Shortlist } from '../models/Shortlist.js';
import { getSettings } from '../models/Setting.js';
import { optionalAuth } from '../middleware/auth.js';
import { customerView, enquiryScope } from './enquiries.js';
import { visitScope } from './visits.js';
import { consultScope } from './consultations.js';
import { paymentScope } from './payments.js';
import { env } from '../config/env.js';

const r = Router();

const STAFF_FIELDS = 'name email phone role status city bio specialization experience languages areas availability workingDays workHours joined';
const CUSTOMER_FIELDS = 'name email phone role status city address joined';
const ids = (rows, key) => [...new Set(rows.map((x) => x[key]).filter(Boolean).map(String))];

r.get('/', optionalAuth, async (req, res) => {
  const user = req.user;
  const role = user?.role;
  const db = { users: [], properties: [], enquiries: [], siteVisits: [], services: [], consultations: [], payments: [], constructionRequests: [], shortlists: {}, settings: null };

  db.settings = await getSettings();
  const staffUsers = await User.find({ role: { $in: ['agent', 'consultant'] }, status: 'Active' }, STAFF_FIELDS);

  const PUBLIC_CAP = 60;
  const publicProps = () => Property.find({ published: true }).sort({ featured: -1, createdAt: -1 }).limit(PUBLIC_CAP);
  if (!user) {
    db.users = staffUsers;
    db.properties = await publicProps();
    db.services = await Service.find({ active: true }).sort({ createdAt: 1 });
  } else if (role === 'admin') {

    const CAP = 300;
    const [staff, recentUsers, properties, enquiries, siteVisits, services, consultations, payments, constructionRequests] = await Promise.all([
      User.find({ role: { $in: ['agent', 'consultant', 'admin'] } }).sort({ createdAt: -1 }), User.find({ role: 'customer' }).sort({ createdAt: -1 }).limit(CAP),
      Property.find().sort({ createdAt: -1 }).limit(CAP), Enquiry.find().sort({ createdAt: -1 }).limit(CAP), SiteVisit.find().sort({ date: -1 }).limit(CAP),
      Service.find().sort({ createdAt: 1 }), Consultation.find().sort({ date: -1 }).limit(CAP), Payment.find().sort({ createdAt: -1 }).limit(CAP), ConstructionRequest.find().sort({ createdAt: -1 }).limit(CAP),
    ]);
    Object.assign(db, { users: [...staff, ...recentUsers], properties, enquiries, siteVisits, services, consultations, payments, constructionRequests });
    const [customers, propertiesAll, enquiriesAll, visitsAll, consultAll, paymentsAll, paidAgg] = await Promise.all([
      User.countDocuments({ role: 'customer' }), Property.countDocuments(), Enquiry.countDocuments(), SiteVisit.countDocuments(), Consultation.countDocuments(), Payment.countDocuments(),
      Payment.find({ status: { $in: ['Completed', 'Pending'] } }, 'amount status').limit(50000),
    ]);
    db.totals = { customers, properties: propertiesAll, enquiries: enquiriesAll, siteVisits: visitsAll, consultations: consultAll, payments: paymentsAll, revenue: paidAgg.filter((p) => p.status === 'Completed').reduce((a, p) => a + p.amount, 0), pending: paidAgg.filter((p) => p.status === 'Pending').reduce((a, p) => a + p.amount, 0) };
  } else {
    const [enquiries, siteVisits, consultations, payments] = await Promise.all([
      role === 'consultant' ? [] : Enquiry.find(await enquiryScope(user)).sort({ createdAt: -1 }),
      role === 'consultant' ? [] : SiteVisit.find(visitScope(user)).sort({ date: 1 }),
      role === 'agent' ? [] : Consultation.find(consultScope(user)).sort({ date: 1 }),
      role === 'agent' ? [] : Payment.find(await paymentScope(user)).sort({ createdAt: -1 }),
    ]);
    const [pub, own] = await Promise.all([publicProps(), role === 'agent' ? Property.find({ agentId: user._id }).sort({ createdAt: -1 }) : []]);

    const seen = new Set([...pub, ...own].map((p) => String(p._id)));
    const wanted = [...new Set([...ids(enquiries, 'propertyId'), ...ids(siteVisits, 'propertyId'), ...ids(consultations, 'propertyId')])].filter((i) => !seen.has(i));
    const linked = wanted.length ? await Property.find({ _id: { $in: wanted } }) : [];
    db.properties = [...own, ...pub.filter((p) => !own.some((o) => String(o._id) === String(p._id))), ...linked];
    db.services = await Service.find(role === 'consultant' ? {} : { active: true }).sort({ createdAt: 1 });
    if (role === 'customer') db.constructionRequests = await ConstructionRequest.find({ customerId: user._id }).sort({ createdAt: -1 });
    Object.assign(db, { enquiries: role === 'customer' ? enquiries.map(customerView) : enquiries, siteVisits, consultations, payments });

    const customerIds = [...ids(enquiries, 'customerId'), ...ids(siteVisits, 'customerId'), ...ids(consultations, 'customerId')];
    const customers = role === 'customer' ? [] : await User.find({ _id: { $in: [...new Set(customerIds)] } }, CUSTOMER_FIELDS);
    const known = new Set([String(user._id), ...staffUsers.map((u) => String(u._id))]);
    const self = await User.findById(user._id);

    const refIds = [...ids(enquiries, 'assignedTo'), ...ids(siteVisits, 'agentId'), ...ids(consultations, 'consultantId'), ...ids(db.properties, 'agentId')].filter((i) => !known.has(i));
    const extra = refIds.length ? await User.find({ _id: { $in: refIds } }, STAFF_FIELDS) : [];
    db.users = [self, ...staffUsers.filter((u) => String(u._id) !== String(user._id)), ...extra, ...customers];

    if (role === 'customer') {
      const list = await Shortlist.find({ userId: user._id });
      db.shortlists[String(user._id)] = list.map((s) => String(s.propertyId));
    }
  }

  res.json({
    db,
    me: user || null,
    config: { paymentMode: env.paymentMode, razorpayKeyId: env.paymentMode === 'razorpay' ? env.razorpay.keyId : null },
  });
});

export default r;
