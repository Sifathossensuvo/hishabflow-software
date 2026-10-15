// Bangladesh is UTC+6 with no daylight saving, so day boundaries are simple.
const OFFSET = 6 * 3600 * 1000;
const DAY = 24 * 3600 * 1000;

export const startOfDayBD = (d = new Date()) => new Date(Math.floor((d.getTime() + OFFSET) / DAY) * DAY - OFFSET);
export const addDays = (d, n) => new Date(d.getTime() + n * DAY);
export const ymdBD = (d) => new Date(d.getTime() + OFFSET).toISOString().slice(0, 10);
export const monthStartBD = (d = new Date()) => new Date(`${ymdBD(d).slice(0, 7)}-01T00:00:00+06:00`);
export const prevMonthStartBD = (d = new Date()) => {
  const [y, m] = ymdBD(d).slice(0, 7).split('-').map(Number);
  const py = m === 1 ? y - 1 : y;
  const pm = m === 1 ? 12 : m - 1;
  return new Date(`${py}-${String(pm).padStart(2, '0')}-01T00:00:00+06:00`);
};

const YMD = /^\d{4}-\d{2}-\d{2}$/;

// Reads ?from=YYYY-MM-DD&to=YYYY-MM-DD. "to" is inclusive in the URL, exclusive in the result.
export function parseRange(query, defaultDays = 30) {
  const today = startOfDayBD();
  const f = typeof query.from === 'string' && YMD.test(query.from) ? new Date(`${query.from}T00:00:00+06:00`) : null;
  const t = typeof query.to === 'string' && YMD.test(query.to) ? new Date(`${query.to}T00:00:00+06:00`) : null;
  const to = t && !Number.isNaN(t.getTime()) ? addDays(t, 1) : addDays(today, 1);
  const from = f && !Number.isNaN(f.getTime()) ? f : addDays(to, -defaultDays);
  if (from >= to) return { from: addDays(to, -defaultDays), to };
  if (to - from > 800 * DAY) return { from: addDays(to, -800), to };
  return { from, to };
}

export function eachDay(from, to) {
  const out = [];
  for (let d = startOfDayBD(from); d < to; d = addDays(d, 1)) out.push(ymdBD(d));
  return out;
}
