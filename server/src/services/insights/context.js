import { Customer, Expense, Product, Sale } from '../../models/index.js';
import { addDays, monthStartBD, prevMonthStartBD, startOfDayBD, ymdBD } from '../../utils/dates.js';
import { r2 } from '../../utils/money.js';

const DAY = 86400000;

// Turns raw data into a small set of numbers. Both the rule engine and an LLM work from this.
export async function buildContext(businessId) {
  const now = new Date();
  const today = startOfDayBD(now);
  const tomorrow = addDays(today, 1);
  const w1 = addDays(today, -6);
  const w0 = addDays(today, -13);
  const d14 = addDays(today, -13);
  const mStart = monthStartBD(now);
  const pmStart = prevMonthStartBD(now);
  const elapsed = Math.ceil((now - mStart) / DAY);
  const pmEnd = new Date(Math.min(pmStart.getTime() + elapsed * DAY, mStart.getTime()));
  const base = { business: businessId, status: 'completed' };

  const sumSales = async (from, to) => {
    const [r] = await Sale.aggregate([{ $match: { ...base, date: { $gte: from, $lt: to } } }, { $group: { _id: null, total: { $sum: '$total' }, profit: { $sum: '$profit' }, count: { $sum: 1 } } }]);
    return { total: r?.total || 0, profit: r?.profit || 0, count: r?.count || 0 };
  };
  const sumExp = async (from, to) => {
    const [r] = await Expense.aggregate([{ $match: { business: businessId, date: { $gte: from, $lt: to } } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    return r?.total || 0;
  };

  const [week, prevWeek, month, prevMonth, expWeek, exp4w, sellers, velocity, topDue, dueAgg] = await Promise.all([
    sumSales(w1, tomorrow), sumSales(w0, w1), sumSales(mStart, tomorrow), sumSales(pmStart, pmEnd),
    sumExp(w1, tomorrow), sumExp(addDays(w1, -28), w1),
    Sale.aggregate([{ $match: { ...base, date: { $gte: w1, $lt: tomorrow } } }, { $unwind: '$items' }, { $group: { _id: '$items.name', qty: { $sum: '$items.qty' }, revenue: { $sum: '$items.lineTotal' } } }, { $sort: { qty: -1 } }, { $limit: 3 }]),
    Sale.aggregate([{ $match: { ...base, date: { $gte: d14, $lt: tomorrow } } }, { $unwind: '$items' }, { $group: { _id: '$items.product', qty: { $sum: '$items.qty' } } }]),
    Customer.find({ business: businessId, isArchived: false, dueBalance: { $gt: 0 } }).sort({ dueBalance: -1 }).limit(3).select('name dueBalance').lean(),
    Customer.aggregate([{ $match: { business: businessId, isArchived: false } }, { $group: { _id: null, due: { $sum: '$dueBalance' } } }]),
  ]);

  const perDay = new Map(velocity.map((x) => [String(x._id), x.qty / 14]));
  const stocked = await Product.find({ _id: { $in: [...perDay.keys()] }, business: businessId, isArchived: false, stock: { $gt: 0 } }).select('name stock unit').lean();
  const runningOut = stocked
    .map((p) => ({ name: p.name, stock: p.stock, unit: p.unit, daysLeft: Math.floor(p.stock / perDay.get(String(p._id))) }))
    .filter((p) => p.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3);

  return {
    today: ymdBD(now),
    week, prevWeek, month, prevMonth,
    expenses: { week: expWeek, avgPrevWeek: r2(exp4w / 4) },
    bestSellers: sellers.map((s) => ({ name: s._id, qty: s.qty, revenue: r2(s.revenue) })),
    runningOut,
    topDue: topDue.map((c) => ({ name: c.name, due: c.dueBalance })),
    totalDue: dueAgg[0]?.due || 0,
  };
}
