import { Product, Purchase, Supplier } from '../models/index.js';
import { AppError } from '../utils/errors.js';
import { incPipeline, r2, sumBy } from '../utils/money.js';
import { applyStock, logMovements } from './stock.js';

// input: { supplierId, reference, items:[{productId?, name, qty, unitCost}], paid, method, note, date, updateBuyPrice }
export async function createPurchase({ businessId, userId, input }) {
  const supplier = await Supplier.findOne({ _id: input.supplierId, business: businessId, isArchived: false }).lean();
  if (!supplier) throw new AppError(404, 'Supplier not found.', 'NOT_FOUND');

  const linkedIds = input.items.filter((i) => i.productId).map((i) => i.productId);
  const products = await Product.find({ _id: { $in: linkedIds }, business: businessId, isArchived: false }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items = input.items.map((i) => {
    const p = i.productId ? byId.get(i.productId) : null;
    if (i.productId && !p) throw new AppError(400, 'One of the products is no longer available.', 'VALIDATION', 'items');
    return { product: p?._id, name: p?.name || i.name, qty: i.qty, unitCost: i.unitCost, lineTotal: r2(i.qty * i.unitCost) };
  });
  const total = sumBy(items, (i) => i.lineTotal);
  if (input.paid > total) throw new AppError(400, 'Paid amount cannot be more than the total.', 'VALIDATION', 'paid');
  const due = r2(total - input.paid);

  const purchase = await Purchase.create({
    business: businessId, supplier: supplier._id, reference: input.reference, items, total,
    paid: input.paid, due, method: input.method, note: input.note, date: input.date, createdBy: userId,
  });

  const moves = [];
  for (const it of items.filter((i) => i.product)) {
    const p = await applyStock(businessId, it.product, it.qty);
    if (p) {
      moves.push({ business: businessId, product: it.product, productName: it.name, type: 'purchase', quantity: it.qty, stockAfter: p.stock, note: `From ${supplier.name}`, ref: purchase._id, createdBy: userId, date: input.date });
      if (input.updateBuyPrice) await Product.updateOne({ _id: it.product }, { $set: { buyPrice: it.unitCost } });
    }
  }
  await logMovements(moves);
  await Supplier.updateOne({ _id: supplier._id }, incPipeline({ dueBalance: due, totalPurchased: total, totalPaid: input.paid }));
  return purchase;
}
