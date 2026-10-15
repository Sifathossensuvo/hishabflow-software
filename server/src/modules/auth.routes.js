import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Business, User } from '../models/index.js';
import { effectivePlan, publicPlan } from '../config/plans.js';
import { protect, signToken } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { v } from '../utils/validate.js';

const r = Router();
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

export const userView = (u) => ({ id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role });
export const businessView = (b) => ({ id: b._id, name: b.name, phone: b.phone, email: b.email, address: b.address, currency: b.currency, language: b.language, plan: b.plan, planExpiresAt: b.planExpiresAt, invoice: b.invoice, notifications: b.notifications });
export const session = (user, business) => ({ user: userView(user), business: businessView(business), plan: publicPlan(effectivePlan(business)) });

const password = (body, key = 'password') => {
  const p = body?.[key];
  if (typeof p !== 'string' || p.length < 8) throw new AppError(400, 'Password must be at least 8 characters.', 'VALIDATION', key);
  if (p.length > 100) throw new AppError(400, 'Password is too long.', 'VALIDATION', key);
  return p;
};
export const checkPassword = password;

r.post('/register', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const data = {
    businessName: v.str(b, 'businessName', { max: 120, label: 'Business name' }),
    name: v.str(b, 'name', { max: 100, label: 'Your name' }),
    email: v.email(b, 'email'),
    phone: v.phone(b, 'phone'),
    password: password(b),
  };
  if (await User.exists({ email: data.email })) throw new AppError(409, 'This email is already registered. Try logging in.', 'DUPLICATE', 'email');

  const business = await Business.create({ name: data.businessName, phone: data.phone });
  let user;
  try {
    user = await User.create({ business: business._id, name: data.name, email: data.email, phone: data.phone, role: 'owner', passwordHash: await bcrypt.hash(data.password, 12) });
  } catch (err) {
    await Business.deleteOne({ _id: business._id });
    throw err;
  }
  res.status(201).json({ token: signToken(user), ...session(user, business) });
}));

r.post('/login', asyncHandler(async (req, res) => {
  const email = v.email(req.body, 'email');
  const pw = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(pw, user?.passwordHash || DUMMY_HASH);
  if (!user || !ok || !user.active) throw new AppError(401, 'Email or password is not correct.', 'BAD_CREDENTIALS');
  const business = await Business.findById(user.business).lean();
  user.lastLoginAt = new Date();
  await user.save();
  res.json({ token: signToken(user), ...session(user, business) });
}));

r.get('/me', protect, (req, res) => res.json(session(req.user, req.business)));

// Tokens are stateless; the client deletes its copy. "Log out everywhere" lives in Settings.
r.post('/logout', protect, (req, res) => res.json({ ok: true }));

export default r;
