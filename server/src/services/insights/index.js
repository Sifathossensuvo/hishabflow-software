import { env } from '../../config/env.js';
import { Sale } from '../../models/index.js';
import { addDays, eachDay, startOfDayBD, ymdBD } from '../../utils/dates.js';
import { r2 } from '../../utils/money.js';
import { buildContext } from './context.js';
import { generate as llm } from './llm.js';
import { rulesProvider } from './rules.js';

export async function getInsights(businessId) {
  const context = await buildContext(businessId);
  let insights = null;
  let provider = 'rules';
  if (env.aiProvider === 'llm') {
    try {
      insights = await llm(context);
      if (insights) provider = 'llm';
    } catch (err) {
      console.error('LLM insights failed, using rules:', err.message);
    }
  }
  return { generatedAt: new Date(), provider, insights: insights || rulesProvider(context) };
}

// Simple, honest forecast: same-weekday average of the last 4 weeks, nudged by the recent trend.
export async function getForecast(businessId) {
  const today = startOfDayBD();
  const from = addDays(today, -28);
  const rows = await Sale.aggregate([
    { $match: { business: businessId, status: 'completed', date: { $gte: from, $lt: addDays(today, 1) } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Dhaka' } }, total: { $sum: '$total' } } },
  ]);
  const byDay = new Map(rows.map((r) => [r._id, r.total]));
  const history = eachDay(from, addDays(today, 1)).map((d) => ({ date: d, total: r2(byDay.get(d) || 0) }));
  const sumRange = (arr) => arr.reduce((s, x) => s + x.total, 0);
  const last14 = sumRange(history.slice(-14));
  const prev14 = sumRange(history.slice(-28, -14));
  const trend = prev14 > 0 ? Math.min(1.3, Math.max(0.7, last14 / prev14)) : 1;

  const forecast = [];
  for (let i = 1; i <= 7; i++) {
    const d = addDays(today, i);
    const dow = new Date(d.getTime() + 6 * 3600000).getUTCDay();
    const same = history.filter((h) => new Date(`${h.date}T12:00:00+06:00`).getUTCDay() === dow);
    const avg = same.length ? sumRange(same) / same.length : 0;
    forecast.push({ date: ymdBD(d), total: Math.round(avg * trend) });
  }
  return { history: history.slice(-14), forecast, trend: r2(trend), note: 'Estimate based on your last 4 weeks. It improves as you record more sales.' };
}
