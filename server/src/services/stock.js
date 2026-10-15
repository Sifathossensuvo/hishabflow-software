import { Product, StockMovement } from '../models/index.js';
import { incPipeline } from '../utils/money.js';

// Atomically changes stock. A decrease only succeeds when enough stock exists,
// so two simultaneous sales can never push stock below zero.
export async function applyStock(businessId, productId, delta) {
  const filter = { _id: productId, business: businessId };
  if (delta < 0) filter.stock = { $gte: -delta };
  return Product.findOneAndUpdate(filter, incPipeline({ stock: delta }, 3), { new: true });
}

export async function logMovements(list) {
  if (list.length) await StockMovement.insertMany(list);
}
