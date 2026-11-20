import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { apiLimiter, sanitize } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import propertyRoutes from './routes/properties.js';
import enquiryRoutes from './routes/enquiries.js';
import constructionRoutes from './routes/construction.js';
import visitRoutes from './routes/visits.js';
import serviceRoutes from './routes/services.js';
import consultationRoutes from './routes/consultations.js';
import paymentRoutes, { razorpayWebhook } from './routes/payments.js';
import bootstrapRoutes from './routes/bootstrap.js';
import reportRoutes from './routes/reports.js';
import activityRoutes from './routes/activity.js';
import accountRoutes from './routes/account.js';
import reviewRoutes from './routes/reviews.js';
import { notifications, shortlist, settings, uploads, system, UPLOAD_DIR } from './routes/misc.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: [env.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'], credentials: false }));

  app.post('/api/payments/webhook', express.raw({ type: '*/*', limit: '1mb' }), razorpayWebhook);

  app.use(express.json({ limit: '12mb' }));
  app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d', index: false, setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff') }));

  app.use('/api', apiLimiter, sanitize);
  app.use('/api', system);
  app.use('/api/auth', authRoutes);
  app.use('/api/bootstrap', bootstrapRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/properties', propertyRoutes);
  app.use('/api/enquiries', enquiryRoutes);
  app.use('/api/construction', constructionRoutes);
  app.use('/api/site-visits', visitRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/consultations', consultationRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/account', accountRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/notifications', notifications);
  app.use('/api/shortlist', shortlist);
  app.use('/api/settings', settings);
  app.use('/api/uploads', uploads);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
