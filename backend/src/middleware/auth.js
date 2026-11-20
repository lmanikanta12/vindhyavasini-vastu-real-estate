import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { unauthorized, forbidden } from '../utils/ApiError.js';
import { isValidId } from '../utils/helpers.js';

export const signToken = (user) => jwt.sign({ id: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

async function load(req, required) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    if (required) throw unauthorized();
    return;
  }
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    if (required) throw unauthorized('Your session has expired. Please log in again.', { code: 'TOKEN_EXPIRED' });
    return;
  }
  if (payload.purpose || !isValidId(payload.id)) {
    if (required) throw unauthorized();
    return;
  }

  const user = await User.findById(payload.id);
  if (!user || user.status !== 'Active') {
    if (required) throw unauthorized('This account is not active.', { code: 'ACCOUNT_INACTIVE' });
    return;
  }
  req.user = user;
}

export const requireAuth = async (req, _res, next) => { await load(req, true); next(); };
export const optionalAuth = async (req, _res, next) => { await load(req, false); next(); };

export const requireRole = (...roles) => async (req, _res, next) => {
  await load(req, true);
  if (!roles.includes(req.user.role)) throw forbidden();
  next();
};
