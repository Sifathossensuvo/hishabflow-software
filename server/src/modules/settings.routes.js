import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { Branch, Business, Customer, Expense, Payment, Product, Purchase, Sale, StockMovement, Supplier, User } from '../models/index.js';
import { env } from '../config/env.js';
import { PLANS, hasFeature, publicPlan } from '../config/plans.js';
import { allow, protect, requireFeature, signToken } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { v } from '../utils/validate.js';
import { businessView, checkPassword, session, userView } from './auth.routes.js';

const r = Router();
r.use(protect);

r.get('/', asyncHandler(async (req, res) => {
  const [products, staff] = await Promise.all([
    Product.countDocuments({ business: req.businessId, isArchived: false }),
    User.countDocuments({ business: req.businessId, role: { $ne: 'owner' }, active: true }),
  ]);
  res.json({ ...session(req.user, req.business), usage: { products, staff } });
}));

r.get('/plans', (req, res) => res.json({ data: Object.keys(PLANS).map(publicPlan) }));

r.put('/business', allow('owner'), asyncHandler(async (req, res) => {
  const b = req.body || {};
  const set = {
    name: v.str(b, 'name', { max: 120, label: 'Business name' }),
    phone: v.str(b, 'phone', { max: 30, optional: true }),
    email: b.email ? v.email(b, 'email') : '',
    address: v.str(b, 'address', { max: 300, optional: true }),
    language: v.oneOf(b, 'language', ['bn', 'en'], { def: req.business.language }),
  };
  const biz = await Business.findByIdAndUpdate(req.businessId, { $set: set }, { new: true, runValidators: true }).lean();
  res.json({ business: businessView(biz) });
}));

r.put('/invoice', allow('owner'), asyncHandler(async (req, res) => {
  const b = req.body || {};
  const set = { 'invoice.footerNote': v.str(b, 'footerNote', { max: 200, optional: true }) };
  if (hasFeature(req.plan, 'customInvoice')) {
    const prefix = v.str(b, 'prefix', { max: 8, label: 'Invoice prefix' }).toUpperCase();
    if (!/^[A-Z0-9]{1,8}$/.test(prefix)) throw new AppError(400, 'Prefix can only use letters and numbers.', 'VALIDATION', 'prefix');
    const color = v.str(b, 'accentColor', { max: 7, optional: true }) || '#0B7A57';
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new AppError(400, 'Choose a valid color.', 'VALIDATION', 'accentColor');
    set['invoice.prefix'] = prefix;
    set['invoice.terms'] = v.str(b, 'terms', { max: 300, optional: true });
    set['invoice.accentColor'] = color;
  }
  const biz = await Business.findByIdAndUpdate(req.businessId, { $set: set }, { new: true }).lean();
  res.json({ business: businessView(biz) });
}));

r.put('/notifications', allow('owner'), asyncHandler(async (req, res) => {
  const b = req.body || {};
  const set = {
    'notifications.lowStock': v.bool(b, 'lowStock', true),
    'notifications.dueReminder': v.bool(b, 'dueReminder', true),
    'notifications.dailySummary': v.bool(b, 'dailySummary', false),
  };
  const biz = await Business.findByIdAndUpdate(req.businessId, { $set: set }, { new: true }).lean();
  res.json({ business: businessView(biz) });
}));

r.put('/account', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const user = await User.findById(req.user._id).select('+passwordHash');
  user.name = v.str(b, 'name', { max: 100, label: 'Your name' });
  user.phone = v.phone(b, 'phone');
  let token;
  if (b.newPassword) {
    const ok = typeof b.currentPassword === 'string' && (await bcrypt.compare(b.currentPassword, user.passwordHash));
    if (!ok) throw new AppError(400, 'Your current password is not correct.', 'VALIDATION', 'currentPassword');
    user.passwordHash = await bcrypt.hash(checkPassword(b, 'newPassword'), 12);
    user.tokenVersion += 1; // signs out every other device
    token = true;
  }
  await user.save();
  res.json({ user: userView(user), ...(token ? { token: signToken(user) } : {}) });
}));

// Demo/dev only. A real launch should switch plans from a payment webhook (bKash/Nagad/SSLCommerz).
r.post('/subscription', allow('owner'), asyncHandler(async (req, res) => {
  if (!env.allowPlanSwitch) throw new AppError(403, 'Online payment is not connected yet. Please contact support to upgrade.', 'PAYMENT_NOT_CONNECTED');
  const plan = v.oneOf(req.body, 'plan', Object.keys(PLANS), { label: 'Plan' });
  const expires = plan === 'free' ? null : new Date(Date.now() + 30 * 86400000);
  const biz = await Business.findByIdAndUpdate(req.businessId, { plan, planExpiresAt: expires }, { new: true }).lean();
  res.json({ business: businessView(biz), plan: publicPlan(plan) });
}));

r.get('/backup', allow('owner'), requireFeature('backup'), asyncHandler(async (req, res) => {
  const f = { business: req.businessId };
  const [products, customers, suppliers, sales, purchases, payments, expenses, stockMovements] = await Promise.all([
    Product.find(f).lean(), Customer.find(f).lean(), Supplier.find(f).lean(), Sale.find(f).lean(),
    Purchase.find(f).lean(), Payment.find(f).lean(), Expense.find(f).lean(), StockMovement.find(f).lean(),
  ]);
  const body = { app: 'HisabFlow', exportedAt: new Date(), business: businessView(req.business), products, customers, suppliers, sales, purchases, payments, expenses, stockMovements };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="hisabflow-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  res.send(JSON.stringify(body));
}));

// ---------- Team ----------
r.get('/team', allow('owner'), requireFeature('staff'), asyncHandler(async (req, res) => {
  const users = await User.find({ business: req.businessId }).sort({ createdAt: 1 }).lean();
  res.json({ data: users.map((u) => ({ ...userView(u), active: u.active, lastLoginAt: u.lastLoginAt })), limit: PLANS[req.plan].staffLimit });
}));

r.post('/team', allow('owner'), requireFeature('staff'), asyncHandler(async (req, res) => {
  const b = req.body || {};
  const roles = hasFeature(req.plan, 'advancedRoles') ? ['staff', 'manager'] : ['staff'];
  const data = { name: v.str(b, 'name', { max: 100 }), email: v.email(b, 'email'), phone: v.phone(b, 'phone'), role: v.oneOf(b, 'role', roles, { def: 'staff', label: 'Role' }) };
  const count = await User.countDocuments({ business: req.businessId, role: { $ne: 'owner' }, active: true });
  if (count >= PLANS[req.plan].staffLimit) throw new AppError(402, `Your plan includes up to ${PLANS[req.plan].staffLimit} staff accounts.`, 'STAFF_LIMIT');
  if (await User.exists({ email: data.email })) throw new AppError(409, 'This email is already registered.', 'DUPLICATE', 'email');
  const u = await User.create({ ...data, business: req.businessId, passwordHash: await bcrypt.hash(checkPassword(b, 'password'), 12) });
  res.status(201).json({ data: userView(u) });
}));

// Staff are deactivated, never deleted, so their past sales stay attributable.
r.patch('/team/:id', allow('owner'), requireFeature('staff'), asyncHandler(async (req, res) => {
  const u = await User.findOne({ _id: v.id(req.params, 'id'), business: req.businessId });
  if (!u || u.role === 'owner') throw new AppError(404, 'Team member not found.', 'NOT_FOUND');
  if (typeof req.body?.active === 'boolean') {
    u.active = req.body.active;
    if (!u.active) u.tokenVersion += 1;
  }
  if (req.body?.role && hasFeature(req.plan, 'advancedRoles')) u.role = v.oneOf(req.body, 'role', ['staff', 'manager']);
  await u.save();
  res.json({ data: userView(u) });
}));

// ---------- Branches (Business plan) ----------
const branchData = (b) => ({ name: v.str(b, 'name', { max: 80, label: 'Branch name' }), address: v.str(b, 'address', { max: 200, optional: true }), phone: v.str(b, 'phone', { max: 30, optional: true }) });

r.get('/branches', requireFeature('branches'), asyncHandler(async (req, res) => {
  res.json({ data: await Branch.find({ business: req.businessId, isArchived: false }).sort({ name: 1 }).lean() });
}));
r.post('/branches', allow('owner'), requireFeature('branches'), asyncHandler(async (req, res) => {
  res.status(201).json({ data: await Branch.create({ ...branchData(req.body || {}), business: req.businessId }) });
}));
r.put('/branches/:id', allow('owner'), requireFeature('branches'), asyncHandler(async (req, res) => {
  const br = await Branch.findOneAndUpdate({ _id: v.id(req.params, 'id'), business: req.businessId, isArchived: false }, { $set: branchData(req.body || {}) }, { new: true });
  if (!br) throw new AppError(404, 'Branch not found.', 'NOT_FOUND');
  res.json({ data: br });
}));
r.delete('/branches/:id', allow('owner'), requireFeature('branches'), asyncHandler(async (req, res) => {
  const br = await Branch.findOneAndUpdate({ _id: v.id(req.params, 'id'), business: req.businessId }, { isArchived: true });
  if (!br) throw new AppError(404, 'Branch not found.', 'NOT_FOUND');
  res.json({ ok: true });
}));

export default r;
