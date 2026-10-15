const bdt = (n) => '৳' + Math.round(n).toLocaleString('en-IN');
const pct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);

export function rulesProvider(c) {
  const out = [];

  if (c.bestSellers[0]) {
    const b = c.bestSellers[0];
    out.push({ id: 'best-seller', type: 'positive', title: 'Best seller this week', body: `${b.name} is your best-selling product this week: ${b.qty} sold, ${bdt(b.revenue)} in sales.` });
  }

  for (const p of c.runningOut) {
    out.push({
      id: 'low-' + p.name, type: p.daysLeft <= 2 ? 'alert' : 'warning', title: `${p.name} may run out soon`,
      body: `Only ${p.stock} ${p.unit} left. At the recent pace, it will last about ${p.daysLeft <= 0 ? 'less than a day' : p.daysLeft + ' day' + (p.daysLeft === 1 ? '' : 's')}.`,
    });
  }

  const m = pct(c.month.total, c.prevMonth.total);
  if (m !== null && c.month.count > 0) {
    out.push(m >= 0
      ? { id: 'month', type: 'positive', title: 'Sales are up', body: `Sales are ${m}% higher than the same days last month (${bdt(c.month.total)} vs ${bdt(c.prevMonth.total)}).` }
      : { id: 'month', type: 'warning', title: 'Sales are down', body: `Sales are ${Math.abs(m)}% lower than the same days last month (${bdt(c.month.total)} vs ${bdt(c.prevMonth.total)}).` });
  }

  const w = pct(c.week.total, c.prevWeek.total);
  if (w !== null && Math.abs(w) >= 10) {
    out.push({ id: 'week', type: w > 0 ? 'positive' : 'info', title: w > 0 ? 'A stronger week' : 'A slower week', body: `The last 7 days brought ${bdt(c.week.total)}, ${Math.abs(w)}% ${w > 0 ? 'more' : 'less'} than the 7 days before.` });
  }

  const e = c.expenses;
  if (e.avgPrevWeek > 0 && e.week > e.avgPrevWeek * 1.4) {
    out.push({ id: 'expenses', type: 'alert', title: 'Expenses are unusually high', body: `You spent ${bdt(e.week)} this week. Your usual week is about ${bdt(e.avgPrevWeek)}.` });
  }

  if (c.totalDue > 0 && c.topDue.length) {
    const names = c.topDue.map((d) => `${d.name} (${bdt(d.due)})`).join(', ');
    out.push({ id: 'baki', type: 'info', title: `${bdt(c.totalDue)} baki to collect`, body: `The biggest dues: ${names}.` });
  }

  if (!out.length) {
    out.push({ id: 'empty', type: 'info', title: 'Insights will appear soon', body: 'Record a few sales and expenses. Insights get more useful after about a week of data.' });
  }
  return out;
}
