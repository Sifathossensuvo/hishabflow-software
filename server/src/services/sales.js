import { Business, Customer, Product, Sale, StockMovement } from '../models/index.js';
import { AppError } from '../utils/errors.js';
import { incPipeline, r2, sumBy } from '../utils/money.js';
import { applyStock, logMovements } from './stock.js';

// input is already validated: { customerId, branchId, items:[{productId, qty, unitPrice?}], discount, paid?, method, note, date }
export async function createSale({ business, userId, input }) {
  const bid = business._id;

  const products = await Product.find({ _id: { $in: input.items.map((i) => i.productId) }, business: bid, isArchived: false }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  let customer = null;
  if (input.customerId) {
    customer = await Customer.findOne({ _id: input.customerId, business: bid, isArchived: false }).lean();
    if (!customer) throw new AppError(404, 'Customer not found.', 'NOT_FOUND');
  }

  const items = input.items.map((i) => {
    const p = byId.get(i.productId);
    if (!p) throw new AppError(400, 'One of the products is no longer available.', 'VALIDATION', 'items');
    const unitPrice = i.unitPrice ?? p.sellPrice;
    return { product: p._id, name: p.name, sku: p.sku, unit: p.unit, qty: i.qty, unitPrice, unitCost: p.buyPrice, lineTotal: r2(i.qty * unitPrice) };
  });

  const subtotal = sumBy(items, (i) => i.lineTotal);
  if (input.discount > subtotal) throw new AppError(400, 'Discount cannot be more than the subtotal.', 'VALIDATION', 'discount');
  const total = r2(subtotal - input.discount);
  const paid = input.paid ?? total;
  if (paid > total) throw new AppError(400, 'Paid amount cannot be more than the total.', 'VALIDATION', 'paid');
  const due = r2(total - paid);
  if (due > 0 && !customer) throw new AppError(400, 'Choose a customer to record baki (due).', 'VALIDATION', 'customerId');
  const profit = r2(total - sumBy(items, (i) => i.qty * i.unitCost));

  // 1) take stock, one product at a time, undoing everything if any line fails
  const taken = [];
  let sale;
  try {
    for (const it of items) {
      const p = await applyStock(bid, it.product, -it.qty);
      if (!p) throw new AppError(409, `Not enough stock for ${it.name}.`, 'INSUFFICIENT_STOCK', 'items');
      taken.push({ it, stockAfter: p.stock });
    }
    // 2) invoice number from an atomic counter
    const before = await Business.findByIdAndUpdate(bid, { $inc: { 'invoice.nextNumber': 1 } }, { new: false }).lean();
    const invoiceNo = `${before.invoice.prefix}-${String(before.invoice.nextNumber).padStart(5, '0')}`;
    sale = await Sale.create({
      business: bid, branch: input.branchId, invoiceNo,
      customer: customer?._id, customerName: customer?.name || 'Walk-in customer', customerPhone: customer?.phone,
      items, subtotal, discount: input.discount, total, paid, due, profit,
      paymentMethod: input.method, note: input.note, date: input.date, createdBy: userId,
    });
  } catch (err) {
    await Promise.all(taken.map(({ it }) => applyStock(bid, it.product, it.qty)));
    throw err;
  }

  // 3) log stock history and update the customer's running totals
  try {
    await logMovements(taken.map(({ it, stockAfter }) => ({
      business: bid, product: it.product, productName: it.name, type: 'sale', quantity: -it.qty,
      stockAfter, note: sale.invoiceNo, ref: sale._id, createdBy: userId, date: input.date,
    })));
    if (customer) {
      await Customer.updateOne({ _id: customer._id }, incPipeline({ dueBalance: due, totalPaid: paid, totalPurchase: total }));
    }
  } catch (err) {
    await Sale.deleteOne({ _id: sale._id });
    await StockMovement.deleteMany({ ref: sale._id });
    await Promise.all(taken.map(({ it }) => applyStock(bid, it.product, it.qty)));
    throw err;
  }
  return sale;
}

// Cancelling never deletes anything: stock goes back, the customer's totals are reversed,
// and the invoice stays in history marked "cancelled".
export async function cancelSale({ businessId, userId, saleId, reason }) {
  const sale = await Sale.findOneAndUpdate(
    { _id: saleId, business: businessId, status: 'completed' },
    { status: 'cancelled', cancelledAt: new Date(), cancelReason: reason },
    { new: true },
  );
  if (!sale) throw new AppError(409, 'This sale was not found or is already cancelled.', 'CONFLICT');

  const moves = [];
  for (const it of sale.items) {
    const p = await applyStock(businessId, it.product, it.qty);
    if (p) moves.push({ business: businessId, product: it.product, productName: it.name, type: 'sale_cancel', quantity: it.qty, stockAfter: p.stock, note: `Cancelled ${sale.invoiceNo}`, ref: sale._id, createdBy: userId });
  }
  await logMovements(moves);
  if (sale.customer) {
    await Customer.updateOne({ _id: sale.customer }, incPipeline({ dueBalance: -sale.due, totalPaid: -sale.paid, totalPurchase: -sale.total }));
  }
  return sale;
}
