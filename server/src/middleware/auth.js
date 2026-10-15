import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { effectivePlan, hasFeature, FEATURE_LABELS, FEATURE_MIN_PLAN } from '../config/plans.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { User, Business } from '../models/index.js';

export const signToken = (user) =>
  jwt.sign({ sub: String(user._id), tv: user.tokenVersion }, env.jwtSecret, { expiresIn: env.jwtExpires });

// Loads the user + business for every request. Everything downstream scopes by req.businessId.
export const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new AppError(401, 'Please log in to continue.', 'UNAUTHENTICATED');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new AppError(401, 'Your session has ended. Please log in again.', 'SESSION_EXPIRED');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.active || user.tokenVersion !== payload.tv) {
    throw new AppError(401, 'Your session has ended. Please log in again.', 'SESSION_EXPIRED');
  }
  const business = await Business.findById(user.business).lean();
  if (!business) throw new AppError(401, 'Business account not found.', 'SESSION_EXPIRED');

  req.user = user;
  req.business = business;
  req.businessId = business._id;
  req.plan = effectivePlan(business);
  next();
});

export const allow = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : next(new AppError(403, 'You do not have permission to do this.', 'FORBIDDEN'));

export const requireFeature = (feature) => (req, res, next) => {
  if (hasFeature(req.plan, feature)) return next();
  const needs = FEATURE_MIN_PLAN[feature] || 'pro';
  next(
    new AppError(402, `${FEATURE_LABELS[feature] || 'This feature'} is part of the ${needs === 'pro' ? 'Pro' : 'Business'} plan.`, 'PLAN_REQUIRED', undefined, {
      feature,
      requiredPlan: needs,
    }),
  );
};
