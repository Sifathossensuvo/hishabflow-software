import { Router } from 'express';
import { Product, StockMovement } from '../models/index.js';
import { PLANS } from '../config/plans.js';
import { allow, protect } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { escapeRegex, pageMeta, paginate, qs, sortBy } from '../utils/http.js';
import { v } from '../utils/validate.js';

const r = Router();
r.use(protect);

export const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'dozen', 'packet', 'box', 'bag'];
const SORTS = { name: 'name', stock: 'stock', sellPrice: 'sellPrice', category: 'category', updated: 'updatedAt' };

const parse = (b) => ({
  name: v.str(b, 'name', { max: 120, label: 'Product name' }),
  sku: v.str(b, 'sku', { max: 40, optional: true, label: 'SKU' }),
  category: v.str(b, 'category', { max: 60, optional: true }) || 'General',
  unit: v.oneOf(b, 'unit', UNITS, { def: 'pcs' }),
  buyPrice: v.num(b, 'buyPrice', { label: 'Buying price' }),
  sellPrice: v.num(b, 'sellPrice', { label: 'Selling price' }),
  lowStockThreshold: v.num(b, 'lowStockThreshold', { def: 5, decimals: 3, label: 'Low-stock level' }),
});

r.get('/', asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const f = { business: req.businessId, isArchived: false };
  const q = qs(req.query.q);
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    f.$or = [{ name: rx }, { sku: rx }];
  }
  const category = qs(req.query.category, 60);
  if (category) f.category = category;
  const status = req.query.status;
  if (status === 'low') f.$expr = { $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', '$lowStockThreshold'] }] };
  else if (status === 'out') f.stock = { $lte: 0 };
  else if (status === 'ok') f.$expr = { $gt: ['$stock', '$lowStockThreshold'] };
  else if (req.query.inStock === '1') f.stock = { $gt: 0 };

  const [data, total, categories] = await Promise.all([
    Product.find(f).sort(sortBy(req.query, SORTS, 'name')).skip(skip).limit(limit).lean(),
    Product.countDocuments(f),
    Product.distinct('category', { business: req.businessId, isArchived: false }),
  ]);
  res.json({ data, meta: { ...pageMeta(total, page, limit), categories: categories.sort() } });
}));

r.get('/:id', asyncHandler(async (req, res) => {
  const p = await Product.findOne({ _id: v.id(req.params, 'id'), business: req.businessId, isArchived: false }).lean();
  if (!p) throw new AppError(404, 'Product not found.', 'NOT_FOUND');
  res.json({ data: p });
}));

r.post('/', allow('owner', 'manager'), asyncHandler(async (req, res) => {
  const data = parse(req.body || {});
  const stock = v.num(req.body, 'stock', { def: 0, decimals: 3, label: 'Opening stock' });
  const limit = PLANS[req.plan].productLimit;
  const count = await Product.countDocuments({ business: req.businessId, isArchived: false });
  if (count >= limit) {
    throw new AppError(402, `The Free plan includes up to ${limit} products. Upgrade to Pro for unlimited products.`, 'PRODUCT_LIMIT', undefined, { feature: 'unlimitedProducts', requiredPlan: 'pro' });
  }
  if (!data.sku) data.sku = 'SKU-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const p = await Product.create({ ...data, stock, business: req.businessId });
  if (stock > 0) {
    await StockMovement.create({ business: req.businessId, product: p._id, productName: p.name, type: 'opening', quantity: stock, stockAfter: stock, note: 'Opening stock', createdBy: req.user._id });
  }
  res.status(201).json({ data: p });
}));

r.put('/:id', allow('owner', 'manager'), asyncHandler(async (req, res) => {
  const data = parse(req.body || {});
  if (!data.sku) delete data.sku;
  const p = await Product.findOneAndUpdate({ _id: v.id(req.params, 'id'), business: req.businessId, isArchived: false }, { $set: data }, { new: true, runValidators: true });
  if (!p) throw new AppError(404, 'Product not found.', 'NOT_FOUND');
  res.json({ data: p });
}));

// Archive instead of delete: past invoices and reports still show the product name.
r.delete('/:id', allow('owner', 'manager'), asyncHandler(async (req, res) => {
  const p = await Product.findOneAndUpdate({ _id: v.id(req.params, 'id'), business: req.businessId, isArchived: false }, { isArchived: true, archivedAt: new Date() });
  if (!p) throw new AppError(404, 'Product not found.', 'NOT_FOUND');
  res.json({ ok: true });
}));

export default r;
