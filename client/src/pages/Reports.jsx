import { useState } from 'react';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from 'recharts';
import { FiBarChart2, FiDownload, FiPrinter } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { bdt, daysAgo, fmtDate, fmtShortDate, methodLabel, METHODS, num, ymd } from '../lib/format.js';
import { useQuery } from '../lib/useQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/FeedbackContext.jsx';
import PlanGate, { LockedHint } from '../components/PlanGate.jsx';
import { Button, Card, DataTable, DateRange, Empty, ErrorState, PageHeader, Skeleton, Stat } from '../components/ui.jsx';

function Bars({ items, color = '#0B7A57' }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (!items.length) return <p className="py-6 text-center text-[15px] text-ink-mute">Nothing in this period.</p>;
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.label}>
          <div className="mb-1 flex justify-between text-[15px]"><span>{i.label}</span><span className="num font-medium">{bdt(i.value)}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-mist"><div className="h-full rounded-full" style={{ width: `${(i.value / max) * 100}%`, background: i.color || color }} /></div>
        </li>
      ))}
    </ul>
  );
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-sm shadow-pop">
      <p className="mb-1 font-medium">{fmtDate(`${label}T12:00:00+06:00`)}</p>
      {payload.map((p) => <p key={p.dataKey} className="num" style={{ color: p.color }}>{p.name}: {bdt(p.value)}</p>)}
    </div>
  );
}

export default function Reports() {
  const { can } = useAuth();
  const toast = useToast();
  const [range, setRange] = useState({ from: daysAgo(29), to: ymd() });
  const { data, loading, error, reload } = useQuery('/reports/summary', range);
  const [busy, setBusy] = useState('');
  const d = data?.data;
  const pnl = can('profitLoss');
  const canExport = can('export');

  async function exportCsv(type) {
    setBusy(type);
    try { await api.download(`/reports/export/${type}`, range, `hisabflow-${type}.csv`); }
    catch (ex) { toast.error(ex.message); }
    finally { setBusy(''); }
  }

  const header = (
    <PageHeader title="Reports" subtitle="How your business did in any period."
      actions={<Button variant="secondary" icon={FiPrinter} onClick={() => window.print()}>Print / Save PDF</Button>} />
  );
  const filter = <div className="mb-4 print:hidden"><DateRange from={range.from} to={range.to} onChange={setRange} /></div>;

  if (error) return <>{header}{filter}<Card><ErrorState error={error} onRetry={reload} /></Card></>;
  if (loading && !d) return <>{header}{filter}<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="mt-4 h-72" /></>;

  const empty = d.salesCount === 0 && d.expenses === 0;
  const productCols = [
    { key: 'n', header: 'Product', render: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'q', header: 'Sold', align: 'right', render: (p) => num(p.qty) },
    { key: 'r', header: 'Revenue', align: 'right', mobile: 'amount', render: (p) => bdt(p.revenue) },
    { key: 'p', header: 'Profit', align: 'right', render: (p) => (p.profit === null ? '-' : <span className={p.profit < 0 ? 'text-due-600' : ''}>{bdt(p.profit)}</span>) },
  ];

  return (
    <>
      {header}
      {filter}
      <p className="mb-4 hidden text-sm text-ink-mute print:block">Report for {fmtDate(`${d.range.from}T12:00:00+06:00`)} to {fmtDate(`${d.range.to}T12:00:00+06:00`)}</p>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales" value={num(d.salesCount)} sub={`${bdt(d.discount)} discount given`} />
        <Stat label="Revenue" value={bdt(d.revenue)} sub={`${bdt(d.collected)} received at sale`} tone="brand" />
        <Stat label="Expenses" value={bdt(d.expenses)} />
        <Stat label={pnl ? 'Profit after expenses' : 'Profit'} value={pnl ? bdt(d.netProfit) : 'Pro plan'} sub={pnl ? `Before expenses ${bdt(d.grossProfit)}` : <LockedHint feature="profitLoss" />} tone={pnl && d.netProfit < 0 ? 'due' : undefined} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label="Baki created in this period" value={bdt(d.dueCreated)} />
        <Stat label="Total baki right now" value={bdt(d.totalDue)} tone={d.totalDue ? 'due' : undefined} />
      </div>

      {empty ? (
        <Card className="mt-4"><Empty icon={FiBarChart2} title="No data in this period" body="Pick a different date range, or record some sales and expenses." /></Card>
      ) : (
        <>
          <Card className="mt-4 p-5">
            <h2 className="mb-3 text-lg font-bold">Sales and expenses by day</h2>
            <div className="h-72" role="img" aria-label="Chart of daily sales, expenses and profit">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={d.series} margin={{ top: 5, right: 4, left: -14, bottom: 0 }}>
                  <CartesianGrid stroke="#E3E8E5" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtShortDate} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#7A8591' }} minTickGap={24} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#7A8591' }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} width={48} />
                  <Tooltip content={<Tip />} cursor={{ fill: '#F4F6F5' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
                  <Bar dataKey="sales" name="Sales" fill="#0B7A57" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expenses" name="Expenses" fill="#E7B4AD" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  {pnl && <Line dataKey="profit" name="Profit" stroke="#9A6A0B" strokeWidth={2.5} dot={false} />}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            {!pnl && <div className="mt-3 print:hidden"><PlanGate feature="profitLoss" inline /></div>}
          </Card>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card className="p-5"><h2 className="mb-4 text-lg font-bold">Money received by method</h2><Bars items={d.collections.map((c) => ({ label: methodLabel(c.method), value: c.total, color: METHODS.find((m) => m.id === c.method)?.color }))} /></Card>
            <Card className="p-5"><h2 className="mb-4 text-lg font-bold">Expenses by category</h2><Bars color="#C0392B" items={d.expenseByCategory.map((c) => ({ label: c.category, value: c.total }))} /></Card>
          </div>

          <Card className="mt-4">
            <h2 className="px-5 pt-5 text-lg font-bold">Product performance</h2>
            {can('analytics') ? <DataTable columns={productCols} rows={d.products} rowKey={(p) => p.id} empty={<Empty icon={FiBarChart2} title="No product sales" body="Products you sell in this period will be ranked here." />} /> : <div className="p-5"><PlanGate feature="analytics" inline /></div>}
          </Card>
        </>
      )}

      <Card className="mt-4 p-5 print:hidden">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Download for Excel</h2>
          {!canExport && <LockedHint feature="export" />}
        </div>
        {canExport ? (
          <div className="flex flex-wrap gap-2">
            {[['sales', 'Sales'], ['expenses', 'Expenses'], ['products', 'Products'], ['customers', 'Customers'], ['suppliers', 'Suppliers']].map(([k, l]) => (
              <Button key={k} variant="secondary" size="sm" icon={FiDownload} loading={busy === k} onClick={() => exportCsv(k)}>{l}</Button>
            ))}
          </div>
        ) : <PlanGate feature="export" inline />}
        {canExport && <p className="mt-3 text-sm text-ink-mute">Files open in Excel and Google Sheets. Sales and expenses follow the dates above.</p>}
      </Card>
    </>
  );
}
