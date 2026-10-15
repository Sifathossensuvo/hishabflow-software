import { Router } from 'express';
import { Expense, EXPENSE_CATEGORIES } from '../models/index.js';
import { allow, protect } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { parseRange } from '../utils/dates.js';
import { escapeRegex, pageMeta, paginate, qs } from '../utils/http.js';
import { v } from '../utils/validate.js';

const r = Router();
r.use(protect, allow('owner', 'manager'));
const METHODS = ['cash', 'bkash', 'nagad', 'bank'];

const parse = (b) => ({
  title: v.str(b, 'title', { max: 120, label: 'What was it for?' }),
  category: v.oneOf(b, 'category', EXPENSE_CATEGORIES, { def: 'Other' }),
  amount: v.num(b, 'amount', { min: 0.01, label: 'Amount' }),
  method: v.oneOf(b, 'method', METHODS, { def: 'cash' }),
  note: v.str(b, 'note', { max: 300, optional: true }),
  date: v.date(b, 'date'),
});

r.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { from, to } = parseRange(req.query, 30);
  const f = { business: req.businessId, date: { $gte: from, $lt: to } };
  const q = qs(req.query.q);
  if (q) f.$or = [{ title: new RegExp(escapeRegex(q), 'i') }, { note: new RegExp(escapeRegex(q), 'i') }];
  if (EXPENSE_CATEGORIES.includes(req.query.category)) f.category = req.query.category;
  const [data, total, byCat] = await Promise.all([
    Expense.find(f).sort({ date: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Expense.countDocuments(f),
    Expense.aggregate([{ $match: f }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }]),
  ]);
  res.json({ data, meta: { ...pageMeta(total, page, limit), total: byCat.reduce((s, x) => s + x.total, 0), byCategory: byCat.map((x) => ({ category: x._id, total: x.total })), categories: EXPENSE_CATEGORIES } });
}));

r.post('/', asyncHandler(async (req, res) => {
  const e = await Expense.create({ ...parse(req.body || {}), business: req.businessId, createdBy: req.user._id });
  res.status(201).json({ data: e });
}));

r.put('/:id', asyncHandler(async (req, res) => {
  const e = await Expense.findOneAndUpdate({ _id: v.id(req.params, 'id'), business: req.businessId }, { $set: parse(req.body || {}) }, { new: true });
  if (!e) throw new AppError(404, 'Expense not found.', 'NOT_FOUND');
  res.json({ data: e });
}));

r.delete('/:id', asyncHandler(async (req, res) => {
  const e = await Expense.findOneAndDelete({ _id: v.id(req.params, 'id'), business: req.businessId });
  if (!e) throw new AppError(404, 'Expense not found.', 'NOT_FOUND');
  res.json({ ok: true });
}));

export default r;
