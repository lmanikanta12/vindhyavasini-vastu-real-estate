import rateLimit from 'express-rate-limit';
import { bad } from '../utils/ApiError.js';
import { env } from '../config/env.js';

function scan(value, depth = 0) {
  if (depth > 8 || value === null || typeof value !== 'object') return;
  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key === '__proto__') throw bad('Invalid request.');
    scan(value[key], depth + 1);
  }
}
export const sanitize = (req, _res, next) => {
  scan(req.body);
  scan(req.query);
  scan(req.params);
  next();
};

const skip = () => !env.isProd && process.env.RATE_LIMIT === 'off';
const limiter = (opts) => rateLimit({ standardHeaders: true, legacyHeaders: false, skip, ...opts });

export const apiLimiter = limiter({ windowMs: 60 * 1000, limit: 300, message: { message: 'Too many requests. Please slow down.' } });
export const authLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 40, message: { message: 'Too many attempts. Please try again in a few minutes.' } });
export const otpLimiter = limiter({ windowMs: 15 * 60 * 1000, limit: 12, message: { message: 'Too many code requests. Please try again in a few minutes.' } });

export const rateLimitPublicForms = limiter({ windowMs: 10 * 60 * 1000, limit: 20, message: { message: 'Too many messages sent. Please try again later.' } });
