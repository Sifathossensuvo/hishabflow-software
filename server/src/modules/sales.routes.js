import { Router } from 'express';
import { Sale } from '../models/index.js';
import { allow, protect } from '../middleware/auth.js';
import { cancelSale, createSale } from '../services/sales.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { parseRange } from '../utils/dates.js';
import { boolQ, escapeRegex, pageMeta, paginate, qs } from '../utils/http.js';
import { v } from '../utils/validate.js';

const r = Router();
r.use(protect);
const METHODS = ['cash', 'bkash', 'nagad', 'bank'];

r.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const f = { business: req.businessId };
  if (req.query.from || req.query.to) {
    const { from, to } = parseRange(req.query);
    f.date = { $gte: from, $lt: to };
  }
  const q = qs(req.query.q);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    f.$or = [{ invoiceNo: rx }, { customerName: rx }, { customerPhone: rx }];
  }
  if (req.query.status === 'completed' || req.query.status === 'cancelled') f.status = req.query.status;
  if (req.query.method && METHODS.includes(req.query.method)) f.paymentMethod = req.query.method;
  if (req.query.customerId) f.customer = v.id(req.query, 'customerId');
  if (boolQ(req.query.hasDue)) { f.due = { $gt: 0 }; f.status = 'completed'; }

  const [data, total, sums] = await Promise.all([
    Sale.find(f).sort({ date: -1, _id: -1 }).skip(skip).limit(limit).select('-items.unitCost').lean(),
    Sale.countDocuments(f),
    Sale.aggregate([{ $match: { ...f, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$total' }, paid: { $sum: '$paid' }, due: { $sum: '$due' } } }]),
  ]);
  const s = sums[0] || { total: 0, paid: 0, due: 0 };
  res.json({ data, meta: { ...pageMeta(total, page, limit), sums: { total: s.total, paid: s.paid, due: s.due } } });
}));

r.get('/:id', asyncHandler(async (req, res) => {
  const sale = await Sale.findOne({ _id: v.id(req.params, 'id'), business: req.businessId }).lean();
  if (!sale) throw new AppError(404, 'Sale not found.', 'NOT_FOUND');
  const b = req.business;
  res.json({
    data: sale,
    business: { name: b.name, phone: b.phone, email: b.email, address: b.address, invoice: b.invoice },
  });
}));

r.post('/', asyncHandler(async (req, res) => {
  const b = req.body || {};
  if (!Array.isArray(b.items) || b.items.length === 0) throw new AppError(400, 'Add at least one product to the sale.', 'VALIDATION', 'items');
  if (b.items.length > 100) throw new AppError(400, 'A sale can have up to 100 different products.', 'VALIDATION', 'items');

  const merged = new Map();
  for (const raw of b.items) {
    if (!raw || typeof raw !== 'object') throw new AppError(400, 'Invalid item.', 'VALIDATION', 'items');
    const productId = v.id(raw, 'productId', { label: 'Product' });
    const qty = v.num(raw, 'qty', { min: 0.001, max: 1e6, decimals: 3, label: 'Quantity' });
    const unitPrice = v.num(raw, 'unitPrice', { optional: true, label: 'Price' });
    const prev = merged.get(productId);
    if (prev) {
      if (unitPrice !== undefined && prev.unitPrice !== undefined && unitPrice !== prev.unitPrice) throw new AppError(400, 'The same product has two different prices.', 'VALIDATION', 'items');
      prev.qty = Math.round((prev.qty + qty) * 1000) / 1000;
    } else merged.set(productId, { productId, qty, unitPrice });
  }

  const input = {
    items: [...merged.values()],
    customerId: v.id(b, 'customerId', { optional: true }),
    branchId: v.id(b, 'branchId', { optional: true }),
    discount: v.num(b, 'discount', { def: 0, label: 'Discount' }),
    paid: v.num(b, 'paid', { optional: true, label: 'Paid amount' }),
    method: v.oneOf(b, 'method', METHODS, { def: 'cash', label: 'Payment method' }),
    note: v.str(b, 'note', { max: 300, optional: true }),
    date: v.date(b, 'date'),
  };
  const sale = await createSale({ business: req.business, userId: req.user._id, input });
  res.status(201).json({ data: sale });
}));

r.post('/:id/cancel', allow('owner', 'manager'), asyncHandler(async (req, res) => {
  const sale = await cancelSale({ businessId: req.businessId, userId: req.user._id, saleId: v.id(req.params, 'id'), reason: v.str(req.body, 'reason', { max: 200, optional: true }) });
  res.json({ data: sale });
}));

export default r;
