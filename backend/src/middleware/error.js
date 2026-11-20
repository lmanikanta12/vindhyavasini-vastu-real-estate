import { ApiError } from '../utils/ApiError.js';
import { env } from '../config/env.js';

export const notFoundHandler = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

export const errorHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) return res.status(err.status).json({ message: err.message, ...err.extra });
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors)[0];
    return res.status(400).json({ message: first?.message || 'Some details are invalid.' });
  }
  if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid value for ' + err.path + '.' });
  if (err.code === 11000) return res.status(409).json({ message: 'This record already exists.' });
  if (err.type === 'entity.too.large') return res.status(413).json({ message: 'The file or request is too large.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON.' });
  console.error(err);
  res.status(500).json({ message: env.isProd ? 'Something went wrong. Please try again.' : err.message });
};
