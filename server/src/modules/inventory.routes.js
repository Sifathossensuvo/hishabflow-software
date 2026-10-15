import { Router } from 'express';
import { Product, StockMovement } from '../models/index.js';
import { allow, protect, requireFeature } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { pageMeta, paginate, qs } from '../utils/http.js';
import { incPipeline } from '../utils/money.js';
import { v } from '../utils/validate.js';

const r = Router();
r.use(protect);

const live = (req) => ({ business: req.businessId, isArchived: false });
const lowExpr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] };

r.get('/summary', asyncHandler(async (req, res) => {
  const [agg, low, lowCount, outCount, count] = await Promise.all([
    Product.aggregate([{ $match: live(req) }, { $group: { _id: null, cost: { $sum: { $multiply: ['$stock', '$buyPrice'] } }, retail: { $sum: { $multiply: ['$stock', '$sellPrice'] } }, units: { $sum: '$stock' } } }]),
    Product.find({ ...live(req), $expr: { $lte: ['$stock', '$lowStockThreshold'] } }).sort({ stock: 1 }).limit(20).select('name sku stock unit lowStockThreshold').lean(),
    Product.countDocuments({ ...live(req), $expr: lowExpr }),
    Product.countDocuments({ ...live(req), stock: { $lte: 0 } }),
    Product.countDocuments(live(req)),
  ]);
  const a = agg[0] || { cost: 0, retail: 0, units: 0 };
  res.json({ data: { inventoryValue: Math.round(a.cost * 100) / 100, retailValue: Math.round(a.retail * 100) / 100, totalUnits: a.units, productCount: count, lowCount, outCount, lowStock: low } });
}));

r.get('/movements', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const f = { business: req.businessId };
  if (req.query.productId) f.product = v.id(req.query, 'productId');
  const type = qs(req.query.type, 20);
  if (type) f.type = type;
  const [data, total] = await Promise.all([
    StockMovement.find(f).sort({ date: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    StockMovement.countDocuments(f),
  ]);
  res.json({ data, meta: pageMeta(total, page, limit) });
}));

// Pro: the notification list behind the bell icon
r.get('/alerts', requireFeature('lowStockAlerts'), asyncHandler(async (req, res) => {
  const items = await Product.find({ ...live(req), $expr: { $lte: ['$stock', '$lowStockThreshold'] } }).sort({ stock: 1 }).limit(30).select('name stock unit lowStockThreshold').lean();
  res.json({ data: items.map((p) => ({ id: p._id, level: p.stock <= 0 ? 'out' : 'low', name: p.name, stock: p.stock, unit: p.unit })) });
}));

r.post('/adjust', allow('owner', 'manager'), asyncHandler(async (req, res) => {
  const b = req.body || {};
  const productId = v.id(b, 'productId', { label: 'Product' });
  const type = v.oneOf(b, 'type', ['in', 'out', 'set'], { label: 'Type' });
  const qty = v.num(b, 'quantity', { min: type === 'set' ? 0 : 0.001, max: 1e7, decimals: 3, label: 'Quantity' });
  const note = v.str(b, 'note', { max: 200, optional: true });

  let before;
  let after;
  if (type === 'set') {
    before = await Product.findOneAndUpdate({ _id: productId, ...live(req) }, [{ $set: { stock: qty } }], { new: false });
    if (!before) throw new AppError(404, 'Product not found.', 'NOT_FOUND');
    after = qty;
  } else {
    const delta = type === 'in' ? qty : -qty;
    const filter = { _id: productId, ...live(req) };
    if (delta < 0) filter.stock = { $gte: qty };
    const p = await Product.findOneAndUpdate(filter, incPipeline({ stock: delta }, 3), { new: true });
    if (!p) {
      const exists = await Product.exists({ _id: productId, ...live(req) });
      throw exists ? new AppError(400, 'You cannot remove more than the stock you have.', 'VALIDATION', 'quantity') : new AppError(404, 'Product not found.', 'NOT_FOUND');
    }
    before = { name: p.name, stock: p.stock - delta };
    after = p.stock;
  }
  const quantity = Math.round((after - before.stock) * 1000) / 1000;
  const m = await StockMovement.create({ business: req.businessId, product: productId, productName: before.name, type: type === 'set' ? 'adjust' : type, quantity, stockAfter: after, note: note || (type === 'set' ? 'Stock count corrected' : undefined), createdBy: req.user._id });
  res.status(201).json({ data: m });
}));

export default r;
