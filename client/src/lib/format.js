let locale = 'en-IN'; // Indian/Bangladeshi digit grouping: 12,34,567
let isBn = false;
export function setFormatLang(lang) {
  isBn = lang === 'bn';
  locale = isBn ? 'bn-BD' : 'en-IN';
}

export const num = (n, max = 3) => new Intl.NumberFormat(locale, { maximumFractionDigits: max }).format(Number(n) || 0);

// ৳1,23,456 (decimals only when needed)
export function bdt(n) {
  const v = Number(n) || 0;
  const hasFraction = Math.abs(v - Math.round(v)) > 0.004;
  const s = new Intl.NumberFormat(locale, { minimumFractionDigits: hasFraction ? 2 : 0, maximumFractionDigits: 2 }).format(Math.abs(v));
  return `${v < 0 ? '-' : ''}৳${s}`;
}

const tz = 'Asia/Dhaka';
export const fmtDate = (d) => (d ? new Intl.DateTimeFormat(isBn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: tz }).format(new Date(d)) : '');
export const fmtShortDate = (d) => (d ? new Intl.DateTimeFormat(isBn ? 'bn-BD' : 'en-GB', { day: 'numeric', month: 'short', timeZone: tz }).format(new Date(d.length === 10 ? `${d}T12:00:00+06:00` : d)) : '');
export const fmtTime = (d) => (d ? new Intl.DateTimeFormat(isBn ? 'bn-BD' : 'en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz }).format(new Date(d)) : '');
export const fmtDateTime = (d) => (d ? `${fmtDate(d)}, ${fmtTime(d)}` : '');

export const ymd = (d = new Date()) => new Date(d).toLocaleDateString('en-CA', { timeZone: tz });
export const daysAgo = (n) => ymd(new Date(Date.now() - n * 86400000));
export const monthStart = () => ymd().slice(0, 8) + '01';

export const METHODS = [
  { id: 'cash', label: 'Cash', color: '#0B7A57' },
  { id: 'bkash', label: 'bKash', color: '#D12053' },
  { id: 'nagad', label: 'Nagad', color: '#E2711D' },
  { id: 'bank', label: 'Bank', color: '#3B5B8C' },
];
export const methodLabel = (id) => METHODS.find((m) => m.id === id)?.label || id;

export const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'dozen', 'packet', 'box', 'bag'];
export const EXPENSE_CATEGORIES = ['Rent', 'Salary', 'Electricity & Gas', 'Transport', 'Mobile & Internet', 'Marketing', 'Repair & Maintenance', 'Tax & Fees', 'Packaging', 'Other'];

export const cn = (...a) => a.filter(Boolean).join(' ');
