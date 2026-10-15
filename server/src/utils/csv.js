const esc = (x) => {
  if (x === null || x === undefined) return '';
  let s = x instanceof Date ? x.toISOString().slice(0, 10) : String(x);
  // Stop spreadsheet formula injection
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// BOM makes Excel read Bangla text correctly.
export function toCsv(columns, rows) {
  const head = columns.map((c) => esc(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(','));
  return '\uFEFF' + [head, ...body].join('\r\n');
}
