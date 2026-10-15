import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.js';
import auth from './modules/auth.routes.js';
import products from './modules/products.routes.js';
import inventory from './modules/inventory.routes.js';
import customers from './modules/customers.routes.js';
import sales from './modules/sales.routes.js';
import expenses from './modules/expenses.routes.js';
import suppliers from './modules/suppliers.routes.js';
import reports from './modules/reports.routes.js';
import insights from './modules/insights.routes.js';
import settings from './modules/settings.routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.clientOrigins, credentials: false }));
  app.use(express.json({ limit: '200kb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: { message: 'Too many attempts. Please wait a few minutes and try again.', code: 'RATE_LIMITED' } } });
  const apiLimiter = rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false, message: { error: { message: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' } } });

  app.use('/api', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth', auth);
  app.use('/api/products', products);
  app.use('/api/inventory', inventory);
  app.use('/api/customers', customers);
  app.use('/api/sales', sales);
  app.use('/api/expenses', expenses);
  app.use('/api/suppliers', suppliers);
  app.use('/api/reports', reports);
  app.use('/api/insights', insights);
  app.use('/api/settings', settings);
  app.use('/api', notFound);

  // Single-server deploy: serve the built React app if it exists.
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
