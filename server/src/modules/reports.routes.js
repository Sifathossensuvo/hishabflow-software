import { Router } from 'express';
import { Customer, Expense, Payment, Product, Sale, Supplier } from '../models/index.js';
import { hasFeature } from '../config/plans.js';
import { allow, protect, requireFeature } from '../middleware/auth.js';
import { AppError, asyncHandler } from '../utils/errors.js';
import { addDays, eachDay, monthStartBD, parseRange, startOfDayBD, ymdBD } from '../utils/dates.js';
import { toCsv } from '../utils/csv.js';
import { r2 } from '../utils/money.js';

const r = Router();
r.use(protect);

const dayKey = { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Dhaka' } };
const completed = (bid, from, to) => ({ business: bid, status: 'completed', date: { $gte: from, $lt: to } });

// ---------- Dashboard (all roles; staff do not see money-out or profit) ----------
r.get('/dashboard', asyncHandler(async (req, res) => {
  const bid = req.businessId;
  const isStaff = req.user.role === 'staff';
  const today = startOfDayBD();
  const tomorrow = addDays(today, 1);
  const from7 = addDays(today, -6);
  const mStart = monthStartBD();

  const group = { _id: null, count: { $sum: 1 }, total: { $sum: '$total' }, paid: { $sum: '$paid' }, profit: { $sum: '$profit' } };
  const [todayAgg, monthAgg, series, expMonth, expSeries, dueAgg, lowStock, lowCount, recentSales, recentPay, recentExp] = await Promise.all([
    Sale.aggregate([{ $match: completed(bid, today, tomorrow) }, { $group: group }]),
    Sale.aggregate([{ $match: completed(bid, mStart, tomorrow) }, { $group: group }]),
    Sale.aggregate([{ $match: completed(bid, from7, tomorrow) }, { $group: { _id: dayKey, total: { $sum: '$total' }, profit: { $sum: '$profit' } } }]),
    isStaff ? [] : Expense.aggregate([{ $match: { business: bid, date: { $gte: mStart, $lt: tomorrow } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    isStaff ? [] : Expense.aggregate([{ $match: { business: bid, date: { $gte: from7, $lt: tomorrow } } }, { $group: { _id: dayKey, total: { $sum: '$amount' } } }]),
    Customer.aggregate([{ $match: { business: bid, isArchived: false } }, { $group: { _id: null, due: { $sum: '$dueBalance' }, n: { $sum: { $cond: [{ $gt: ['$dueBalance', 0] }, 1, 0] } } } }]),
    Product.find({ business: bid, isArchived: false, $expr: { $lte: ['$stock', '$lowStockThreshold'] } }).sort({ stock: 1 }).limit(5).select('name sku stock unit lowStockThreshold').lean(),
    Product.countDocuments({ business: bid, isArchived: false, $expr: { $lte: ['$stock', '$lowStockThreshold'] } }),
    Sale.find({ business: bid }).sort({ date: -1 }).limit(6).select('invoiceNo customerName total paid due date status paymentMethod').lean(),
    Payment.find({ business: bid, kind: 'customer' }).sort({ date: -1 }).limit(4).lean(),
    isStaff ? [] : Expense.find({ business: bid }).sort({ date: -1 }).limit(4).lean(),
  ]);

  const t = todayAgg[0] || { count: 0, total: 0, paid: 0, profit: 0 };
  const m = monthAgg[0] || { count: 0, total: 0, paid: 0, profit: 0 };
  const sMap = new Map(series.map((x) => [x._id, x]));
  const eMap = new Map(expSeries.map((x) => [x._id, x.total]));
  const chart = eachDay(from7, tomorrow).map((d) => ({
    date: d,
    sales: r2(sMap.get(d)?.total || 0),
    ...(isStaff ? {} : { profit: r2((sMap.get(d)?.profit || 0) - (eMap.get(d) || 0)) }),
  }));
  const expenses = expMonth[0]?.total || 0;

  const recent = [
    ...recentSales.map((s) => ({ type: 'sale', id: s._id, title: s.customerName, sub: s.invoiceNo, amount: s.total, due: s.due, status: s.status, method: s.paymentMethod, date: s.date })),
    ...recentPay.map((p) => ({ type: 'payment', id: p._id, title: p.partyName, sub: 'Baki received', amount: p.amount, method: p.method, date: p.date })),
    ...recentExp.map((e) => ({ type: 'expense', id: e._id, title: e.title, sub: e.category, amount: e.amount, method: e.method, date: e.date })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  res.json({
    data: {
      today: { count: t.count, sales: r2(t.total), collected: r2(t.paid) },
      month: isStaff ? { count: m.count } : { count: m.count, revenue: r2(m.total), expenses: r2(expenses), profit: r2(m.profit - expenses) },
      totalDue: r2(dueAgg[0]?.due || 0),
      dueCustomers: dueAgg[0]?.n || 0,
      lowStock, lowStockCount: lowCount,
      chart, recent,
    },
  });
}));

// ---------- Reports ----------
r.get('/summary', allow('owner', 'manager'), asyncHandler(async (req, res) => {
  const bid = req.businessId;
  const { from, to } = parseRange(req.query, 30);
  const pnl = hasFeature(req.plan, 'profitLoss');
  const perf = hasFeature(req.plan, 'analytics');

  const [tot, daily, expTot, expDaily, expCat, methods, dueIn, due, top] = await Promise.all([
    Sale.aggregate([{ $match: completed(bid, from, to) }, { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: '$total' }, discount: { $sum: '$discount' }, paid: { $sum: '$paid' }, dueCreated: { $sum: '$due' }, profit: { $sum: '$profit' } } }]),
    Sale.aggregate([{ $match: completed(bid, from, to) }, { $group: { _id: dayKey, sales: { $sum: '$total' }, profit: { $sum: '$profit' }, count: { $sum: 1 } } }]),
    Expense.aggregate([{ $match: { business: bid, date: { $gte: from, $lt: to } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { business: bid, date: { $gte: from, $lt: to } } }, { $group: { _id: dayKey, total: { $sum: '$amount' } } }]),
    Expense.aggregate([{ $match: { business: bid, date: { $gte: from, $lt: to } } }, { $group: { _id: '$category', total: { $sum: '$amount' } } }, { $sort: { total: -1 } }]),
    Sale.aggregate([{ $match: completed(bid, from, to) }, { $group: { _id: '$paymentMethod', total: { $sum: '$paid' } } }]),
    Payment.aggregate([{ $match: { business: bid, kind: 'customer', date: { $gte: from, $lt: to } } }, { $group: { _id: '$method', total: { $sum: '$amount' } } }]),
    Customer.aggregate([{ $match: { business: bid, isArchived: false } }, { $group: { _id: null, due: { $sum: '$dueBalance' } } }]),
    perf
      ? Sale.aggregate([{ $match: completed(bid, from, to) }, { $unwind: '$items' }, { $group: { _id: '$items.product', name: { $first: '$items.name' }, qty: { $sum: '$items.qty' }, revenue: { $sum: '$items.lineTotal' }, profit: { $sum: { $multiply: [{ $subtract: ['$items.unitPrice', '$items.unitCost'] }, '$items.qty'] } } } }, { $sort: { revenue: -1 } }, { $limit: 15 }])
      : [],
  ]);

  const t = tot[0] || { count: 0, revenue: 0, discount: 0, paid: 0, dueCreated: 0, profit: 0 };
  const expenses = expTot[0]?.total || 0;
  const dMap = new Map(daily.map((x) => [x._id, x]));
  const eMap = new Map(expDaily.map((x) => [x._id, x.total]));
  const collections = new Map();
  for (const x of [...methods, ...dueIn]) collections.set(x._id, r2((collections.get(x._id) || 0) + x.total));

  const series = eachDay(from, to).map((d) => ({
    date: d, sales: r2(dMap.get(d)?.sales || 0), count: dMap.get(d)?.count || 0, expenses: r2(eMap.get(d) || 0),
    ...(pnl ? { profit: r2((dMap.get(d)?.profit || 0) - (eMap.get(d) || 0)) } : {}),
  }));

  res.json({
    data: {
      range: { from: ymdBD(from), to: ymdBD(addDays(to, -1)) },
      salesCount: t.count, revenue: r2(t.revenue), discount: r2(t.discount), collected: r2(t.paid), dueCreated: r2(t.dueCreated),
      expenses: r2(expenses), totalDue: r2(due[0]?.due || 0),
      grossProfit: pnl ? r2(t.profit) : null,
      netProfit: pnl ? r2(t.profit - expenses) : null,
      expenseByCategory: expCat.map((x) => ({ category: x._id, total: r2(x.total) })),
      collections: [...collections].map(([method, total]) => ({ method, total })),
      series,
      products: top.map((p) => ({ id: p._id, name: p.name, qty: p.qty, revenue: r2(p.revenue), profit: pnl ? r2(p.profit) : null })),
      locked: [...(pnl ? [] : ['profitLoss']), ...(perf ? [] : ['analytics'])],
    },
  });
}));

// ---------- CSV export (opens in Excel) ----------
const bdt = (n) => r2(n);
const EXPORTS = {
  sales: {
    load: (bid, { from, to }) => Sale.find({ business: bid, date: { $gte: from, $lt: to } }).sort({ date: 1 }).lean(),
    cols: [
      { header: 'Date', value: (s) => ymdBD(s.date) }, { header: 'Invoice', value: (s) => s.invoiceNo }, { header: 'Customer', value: (s) => s.customerName },
      { header: 'Status', value: (s) => s.status }, { header: 'Subtotal', value: (s) => bdt(s.subtotal) }, { header: 'Discount', value: (s) => bdt(s.discount) },
      { header: 'Total', value: (s) => bdt(s.total) }, { header: 'Paid', value: (s) => bdt(s.paid) }, { header: 'Due', value: (s) => bdt(s.due) },
      { header: 'Profit', value: (s) => bdt(s.profit) }, { header: 'Payment method', value: (s) => s.paymentMethod },
    ],
  },
  expenses: {
    load: (bid, { from, to }) => Expense.find({ business: bid, date: { $gte: from, $lt: to } }).sort({ date: 1 }).lean(),
    cols: [
      { header: 'Date', value: (e) => ymdBD(e.date) }, { header: 'Title', value: (e) => e.title }, { header: 'Category', value: (e) => e.category },
      { header: 'Amount', value: (e) => bdt(e.amount) }, { header: 'Method', value: (e) => e.method }, { header: 'Note', value: (e) => e.note },
    ],
  },
  products: {
    load: (bid) => Product.find({ business: bid, isArchived: false }).sort({ name: 1 }).lean(),
    cols: [
      { header: 'Name', value: (p) => p.name }, { header: 'SKU', value: (p) => p.sku }, { header: 'Category', value: (p) => p.category },
      { header: 'Unit', value: (p) => p.unit }, { header: 'Buying price', value: (p) => p.buyPrice }, { header: 'Selling price', value: (p) => p.sellPrice },
      { header: 'Stock', value: (p) => p.stock }, { header: 'Low-stock level', value: (p) => p.lowStockThreshold }, { header: 'Stock value', value: (p) => bdt(p.stock * p.buyPrice) },
    ],
  },
  customers: {
    load: (bid) => Customer.find({ business: bid, isArchived: false }).sort({ name: 1 }).lean(),
    cols: [
      { header: 'Name', value: (c) => c.name }, { header: 'Phone', value: (c) => c.phone }, { header: 'Address', value: (c) => c.address },
      { header: 'Total purchase', value: (c) => bdt(c.totalPurchase) }, { header: 'Total paid', value: (c) => bdt(c.totalPaid) }, { header: 'Baki (due)', value: (c) => bdt(c.dueBalance) },
    ],
  },
  suppliers: {
    load: (bid) => Supplier.find({ business: bid, isArchived: false }).sort({ name: 1 }).lean(),
    cols: [
      { header: 'Name', value: (s) => s.name }, { header: 'Company', value: (s) => s.company }, { header: 'Phone', value: (s) => s.phone },
      { header: 'Total purchased', value: (s) => bdt(s.totalPurchased) }, { header: 'Total paid', value: (s) => bdt(s.totalPaid) }, { header: 'Due to supplier', value: (s) => bdt(s.dueBalance) },
    ],
  },
};

r.get('/export/:type', allow('owner', 'manager'), requireFeature('export'), asyncHandler(async (req, res) => {
  const def = EXPORTS[req.params.type];
  if (!def) throw new AppError(404, 'Unknown export type.', 'NOT_FOUND');
  const rows = await def.load(req.businessId, parseRange(req.query, 30));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="hisabflow-${req.params.type}-${ymdBD(new Date())}.csv"`);
  res.send(toCsv(def.cols, rows));
}));

export default r;
