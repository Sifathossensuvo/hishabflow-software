import { Customer, Supplier, Sale, Purchase, Payment } from '../models/index.js';
import { AppError } from '../utils/errors.js';
import { incPipeline, r2 } from '../utils/money.js';

// Pays off the oldest unpaid documents first, so each invoice's "due" stays accurate.
export async function allocateFIFO(Model, filter, amount) {
  let remaining = amount;
  const allocations = [];
  const docs = await Model.find(filter).sort({ date: 1, _id: 1 }).select('due').lean();
  for (const d of docs) {
    if (remaining <= 0) break;
    const take = Math.min(d.due, remaining);
    const res = await Model.updateOne({ _id: d._id, due: { $gte: take } }, [
      {
        $set: {
          paid: { $round: [{ $add: ['$paid', take] }, 2] },
          due: { $round: [{ $subtract: ['$total', { $add: ['$paid', take] }] }, 2] },
        },
      },
    ]);
    if (res.modifiedCount) {
      allocations.push({ ref: d._id, amount: take });
      remaining = r2(remaining - take);
    }
  }
  return allocations;
}

export async function receiveCustomerPayment({ businessId, userId, customerId, amount, method, note, date }) {
  const customer = await Customer.findOneAndUpdate(
    { _id: customerId, business: businessId, isArchived: false, dueBalance: { $gte: amount - 0.001 } },
    incPipeline({ dueBalance: -amount, totalPaid: amount }),
    { new: true },
  );
  if (!customer) {
    const exists = await Customer.exists({ _id: customerId, business: businessId, isArchived: false });
    if (!exists) throw new AppError(404, 'Customer not found.', 'NOT_FOUND');
    throw new AppError(400, 'This is more than the customer owes.', 'VALIDATION', 'amount');
  }
  const allocations = await allocateFIFO(Sale, { business: businessId, customer: customerId, status: 'completed', due: { $gt: 0 } }, amount);
  const payment = await Payment.create({
    business: businessId, kind: 'customer', customer: customerId, partyName: customer.name,
    amount, method, note, date, allocations, createdBy: userId,
  });
  return { payment, customer };
}

export async function paySupplier({ businessId, userId, supplierId, amount, method, note, date }) {
  const supplier = await Supplier.findOneAndUpdate(
    { _id: supplierId, business: businessId, isArchived: false, dueBalance: { $gte: amount - 0.001 } },
    incPipeline({ dueBalance: -amount, totalPaid: amount }),
    { new: true },
  );
  if (!supplier) {
    const exists = await Supplier.exists({ _id: supplierId, business: businessId, isArchived: false });
    if (!exists) throw new AppError(404, 'Supplier not found.', 'NOT_FOUND');
    throw new AppError(400, 'This is more than you owe this supplier.', 'VALIDATION', 'amount');
  }
  const allocations = await allocateFIFO(Purchase, { business: businessId, supplier: supplierId, due: { $gt: 0 } }, amount);
  const payment = await Payment.create({
    business: businessId, kind: 'supplier', supplier: supplierId, partyName: supplier.name,
    amount, method, note, date, allocations, createdBy: userId,
  });
  return { payment, supplier };
}
