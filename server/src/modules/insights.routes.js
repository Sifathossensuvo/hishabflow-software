import { Router } from 'express';
import { allow, protect, requireFeature } from '../middleware/auth.js';
import { getForecast, getInsights } from '../services/insights/index.js';
import { asyncHandler } from '../utils/errors.js';

const r = Router();
r.use(protect, allow('owner', 'manager'));

r.get('/', requireFeature('aiInsights'), asyncHandler(async (req, res) => {
  res.json({ data: await getInsights(req.businessId) });
}));

r.get('/forecast', requireFeature('forecasting'), asyncHandler(async (req, res) => {
  res.json({ data: await getForecast(req.businessId) });
}));

export default r;
