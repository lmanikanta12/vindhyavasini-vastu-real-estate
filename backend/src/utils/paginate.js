import { User } from '../models/User.js';
import { Property } from '../models/Property.js';
import { Service } from '../models/Service.js';
import { Payment } from '../models/Payment.js';
import { escapeRegex, num } from './helpers.js';

export function pageParams(query, { sortable = [], defaultSort = 'createdAt', defaultDir = -1, defaultLimit = 20, maxLimit = 100 } = {}) {
  const page = Math.max(1, Math.floor(num(query.page, 1)));
  const limit = Math.min(maxLimit, Math.max(1, Math.floor(num(query.limit, defaultLimit))));
  const field = sortable.includes(query.sort) ? query.sort : defaultSort;
  const dir = query.dir === 'asc' ? 1 : query.dir === 'desc' ? -1 : query.sort && sortable.includes(query.sort) ? 1 : defaultDir;
  const sort = { [field]: dir, _id: -1 };
  return { page, limit, sort, skip: (page - 1) * limit };
}

export async function paged(Model, filter, params, { transform } = {}) {
  const [rows, total] = await Promise.all([Model.find(filter).sort(params.sort).skip(params.skip).limit(params.limit), Model.countDocuments(filter)]);
  const items = transform ? rows.map(transform) : rows;
  return { items, total, page: params.page, limit: params.limit, pages: Math.max(1, Math.ceil(total / params.limit)), rows };
}

export const rx = (s) => new RegExp(escapeRegex(String(s).trim().slice(0, 80)), 'i');

export async function userIdsLike(text, role) {
  const q = { $or: [{ name: rx(text) }, { email: rx(text) }] };
  if (role) q.role = role;
  return (await User.find(q, '_id').limit(60)).map((u) => u._id);
}

const STAFF = 'name email phone role status city bio specialization experience languages areas availability workingDays workHours joined';
const PERSON = 'name email phone role status city address joined';

export async function buildRefs(rows, { users = [], properties = [], services = [], payments = false } = {}) {
  const pick = (keys, list) => [...new Set(list.flatMap((r) => keys.map((k) => r[k])).filter(Boolean).map(String))];
  const uIds = pick(users, rows);
  const pIds = pick(properties, rows);
  const sIds = pick(services, rows);
  const [u, p, s] = await Promise.all([
    uIds.length ? User.find({ _id: { $in: uIds } }, `${STAFF} ${PERSON}`) : [],
    pIds.length ? Property.find({ _id: { $in: pIds } }, 'title ref city location address images status price category type published agentId art facing') : [],
    sIds.length ? Service.find({ _id: { $in: sIds } }) : [],
  ]);
  const pay = payments && rows.length ? await Payment.find({ consultationId: { $in: rows.map((r) => r._id) } }) : [];
  return { users: u, properties: p, services: s, payments: pay };
}
