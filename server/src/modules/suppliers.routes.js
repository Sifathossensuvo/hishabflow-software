import { Router } from 'express';
import { Payment, Purchase, Supplier } from '../models/index.js';
import { allow, protect, requireFeature } from '../middleware/auth.js';
import { paySupplier } from '../services/payments.js';
import { createPurchase } from '../services/purchases.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { escapeRegex, pageMeta, paginate, qs } from '../utils/http.js';
import { v } from '../utils/validate.js';

const r = Router();
r.use(protect, requireFeature('suppliers'), allow('owner', 'manager'));
const METHODS = ['cash', 'bkash', 'nagad', 'bank'];

const parse = (b) => ({
  name: v.str(b, 'name', { max: 100, label: 'Supplier name' }),
  company: v.str(b, 'company', { max: 100, optional: true }),
  phone: v.str(b, 'phone', { max: 30, optional: true, label: 'Phone' }),
  address: v.str(b, 'address', { max: 200, optional: true }),
});

r.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const f = { business: req.businessId, isArchived: false };
  const q = qs(req.query.q);
  if (q) { const rx = new RegExp(escapeRegex(q), 'i'); f.$or = [{ name: rx }, { company: rx }, { phone: rx }]; }
  if (req.query.hasDue === '1') f.dueBalance = { $gt: 0 };
  const [data, total, agg] = await Promise.all([
    Supplier.find(f).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Supplier.countDocuments(f),
    Supplier.aggregate([{ $match: { business: req.businessId, isArchived: false } }, { $group: { _id: null, due: { $sum: '$dueBalance' } } }]),
  ]);
  res.json({ data, meta: { ...pageMeta(total, page, limit), totalDue: agg[0]?.due || 0 } });
}));

r.get('/:id', asyncHandler(async (req, res) => {
  const id = v.id(req.params, 'id');
  const supplier = await Supplier.findOne({ _id: id, business: req.businessId, isArchived: false }).lean();
  if (!supplier) throw new AppError(404, 'Supplier not found.', 'NOT_FOUND');
  const [purchases, payments] = await Promise.all([
    Purchase.find({ business: req.businessId, supplier: id }).sort({ date: -1 }).limit(100).lean(),
    Payment.find({ business: req.businessId, supplier: id }).sort({ date: -1 }).limit(100).lean(),
  ]);
  res.json({ data: { supplier, purchases, payments } });
}));

r.post('/', asyncHandler(async (req, res) => {
  res.status(201).json({ data: await Supplier.create({ ...parse(req.body || {}), business: req.businessId }) });
}));

r.put('/:id', asyncHandler(async (req, res) => {
  const s = await Supplier.findOneAndUpdate({ _id: v.id(req.params, 'id'), business: req.businessId, isArchived: false }, { $set: parse(req.body || {}) }, { new: true });
  if (!s) throw new AppError(404, 'Supplier not found.', 'NOT_FOUND');
  res.json({ data: s });
}));

r.delete('/:id', asyncHandler(async (req, res) => {
  const s = await Supplier.findOne({ _id: v.id(req.params, 'id'), business: req.businessId, isArchived: false });
  if (!s) throw new AppError(404, 'Supplier not found.', 'NOT_FOUND');
  if (s.dueBalance > 0) throw new AppError(409, `You still owe ${s.name}. Pay the due first.`, 'HAS_DUE');
  s.isArchived = true;
  await s.save();
  res.json({ ok: true });
}));

r.post('/:id/purchases', asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!Array.isArray(b.items) || !b.items.length) throw new AppError(400, 'Add at least one item.', 'VALIDATION', 'items');
  if (b.items.length > 100) throw new AppError(400, 'Too many items.', 'VALIDATION', 'items');
  const items = b.items.map((raw) => {
    if (!raw || typeof raw !== 'object') throw new AppError(400, 'Invalid item.', 'VALIDATION', 'items');
    const productId = v.id(raw, 'productId', { optional: true });
    return {
      productId,
      name: productId ? undefined : v.str(raw, 'name', { max: 120, label: 'Item name' }),
      qty: v.num(raw, 'qty', { min: 0.001, max: 1e6, decimals: 3, label: 'Quantity' }),
      unitCost: v.num(raw, 'unitCost', { label: 'Unit cost' }),
    };
  });
  const purchase = await createPurchase({
    businessId: req.businessId, userId: req.user._id,
    input: {
      supplierId: v.id(req.params, 'id'), items, reference: v.str(b, 'reference', { max: 60, optional: true }),
      paid: v.num(b, 'paid', { def: 0, label: 'Paid amount' }), method: v.oneOf(b, 'method', METHODS, { def: 'cash' }),
      note: v.str(b, 'note', { max: 300, optional: true }), date: v.date(b, 'date'), updateBuyPrice: v.bool(b, 'updateBuyPrice', true),
    },
  });
  res.status(201).json({ data: purchase });
}));

r.post('/:id/payments', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const out = await paySupplier({
    businessId: req.businessId, userId: req.user._id, supplierId: v.id(req.params, 'id'),
    amount: v.num(b, 'amount', { min: 0.01, label: 'Amount' }), method: v.oneOf(b, 'method', METHODS, { def: 'cash' }),
    note: v.str(b, 'note', { max: 200, optional: true }), date: v.date(b, 'date'),
  });
  res.status(201).json({ data: out.payment, supplier: out.supplier });
}));

export default r;
