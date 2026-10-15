import { Router } from 'express';
import { Customer, Payment, Sale } from '../models/index.js';
import { allow, protect } from '../middleware/auth.js';
import { receiveCustomerPayment } from '../services/payments.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { escapeRegex, pageMeta, paginate, qs, sortBy, boolQ } from '../utils/http.js';
import { v } from '../utils/validate.js';

const r = Router();
r.use(protect);
const SORTS = { name: 'name', due: 'dueBalance', purchase: 'totalPurchase', recent: 'createdAt' };
const METHODS = ['cash', 'bkash', 'nagad', 'bank'];

const parse = (b) => ({
  name: v.str(b, 'name', { max: 100, label: 'Customer name' }),
  phone: v.phone(b, 'phone'),
  address: v.str(b, 'address', { max: 200, optional: true }),
  note: v.str(b, 'note', { max: 300, optional: true }),
});

r.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const f = { business: req.businessId, isArchived: false };
  const q = qs(req.query.q);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    f.$or = [{ name: rx }, { phone: rx }];
  }
  if (boolQ(req.query.hasDue)) f.dueBalance = { $gt: 0 };
  const [data, total, dueAgg] = await Promise.all([
    Customer.find(f).sort(sortBy(req.query, SORTS, 'name')).skip(skip).limit(limit).lean(),
    Customer.countDocuments(f),
    Customer.aggregate([{ $match: { business: req.businessId, isArchived: false } }, { $group: { _id: null, due: { $sum: '$dueBalance' }, n: { $sum: { $cond: [{ $gt: ['$dueBalance', 0] }, 1, 0] } } } }]),
  ]);
  res.json({ data, meta: { ...pageMeta(total, page, limit), totalDue: dueAgg[0]?.due || 0, dueCount: dueAgg[0]?.n || 0 } });
}));

r.get('/:id', asyncHandler(async (req, res) => {
  const id = v.id(req.params, 'id');
  const customer = await Customer.findOne({ _id: id, business: req.businessId, isArchived: false }).lean();
  if (!customer) throw new AppError(404, 'Customer not found.', 'NOT_FOUND');
  const [sales, payments] = await Promise.all([
    Sale.find({ business: req.businessId, customer: id }).sort({ date: -1 }).limit(100).select('invoiceNo date total paid due status paymentMethod items').lean(),
    Payment.find({ business: req.businessId, customer: id }).sort({ date: -1 }).limit(100).lean(),
  ]);
  res.json({ data: { customer, sales: sales.map((s) => ({ ...s, itemCount: s.items.length, items: undefined })), payments } });
}));

r.post('/', asyncHandler(async (req, res) => {
  const c = await Customer.create({ ...parse(req.body || {}), business: req.businessId });
  res.status(201).json({ data: c });
}));

r.put('/:id', allow('owner', 'manager'), asyncHandler(async (req, res) => {
  const c = await Customer.findOneAndUpdate({ _id: v.id(req.params, 'id'), business: req.businessId, isArchived: false }, { $set: parse(req.body || {}) }, { new: true });
  if (!c) throw new AppError(404, 'Customer not found.', 'NOT_FOUND');
  res.json({ data: c });
}));

r.delete('/:id', allow('owner', 'manager'), asyncHandler(async (req, res) => {
  const id = v.id(req.params, 'id');
  const c = await Customer.findOne({ _id: id, business: req.businessId, isArchived: false });
  if (!c) throw new AppError(404, 'Customer not found.', 'NOT_FOUND');
  if (c.dueBalance > 0) throw new AppError(409, `${c.name} still has baki to pay. Collect it first.`, 'HAS_DUE');
  c.isArchived = true;
  await c.save();
  res.json({ ok: true });
}));

r.post('/:id/payments', asyncHandler(async (req, res) => {
  const b = req.body || {};
  const out = await receiveCustomerPayment({
    businessId: req.businessId, userId: req.user._id, customerId: v.id(req.params, 'id'),
    amount: v.num(b, 'amount', { min: 0.01, label: 'Amount' }), method: v.oneOf(b, 'method', METHODS, { def: 'cash' }),
    note: v.str(b, 'note', { max: 200, optional: true }), date: v.date(b, 'date'),
  });
  res.status(201).json({ data: out.payment, customer: out.customer });
}));

export default r;
