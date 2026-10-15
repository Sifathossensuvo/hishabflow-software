import { Link } from 'react-router-dom';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FiAlertTriangle, FiArrowDownLeft, FiArrowUpRight, FiBox, FiCheckCircle, FiPlus, FiShoppingCart, FiUserPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { bdt, fmtDate, fmtShortDate, fmtTime, num } from '../lib/format.js';
import { useQuery } from '../lib/useQuery.js';
import { Badge, Button, Card, ErrorState, PageHeader, Skeleton, Stat } from '../components/ui.jsx';

function greeting() {
  const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Dhaka' }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const ICON = { sale: FiArrowUpRight, payment: FiArrowDownLeft, expense: FiArrowDownLeft };

function Recent({ items }) {
  if (!items.length) return <p className="px-5 py-10 text-center text-[15px] text-ink-mute">Sales, baki payments and expenses will show up here.</p>;
  return (
    <ul>
      {items.map((r) => {
        const Icon = ICON[r.type];
        const out = r.type === 'expense';
        return (
          <li key={r.type + r.id} className="flex items-center gap-3 border-b border-dashed border-line px-5 py-3 last:border-0">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${out ? 'bg-due-50 text-due-600' : 'bg-brand-50 text-brand-600'}`}><Icon aria-hidden /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{r.title}</p>
              <p className="truncate text-sm text-ink-mute">{r.sub} · {fmtShortDate(r.date)}, {fmtTime(r.date)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className={`num font-semibold ${out ? 'text-due-600' : r.status === 'cancelled' ? 'text-ink-mute line-through' : 'text-ink'}`}>{out ? '-' : ''}{bdt(r.amount)}</p>
              {r.status === 'cancelled' ? <Badge className="mt-0.5">Cancelled</Badge> : r.due > 0 ? <p className="text-xs text-due-600">Baki {bdt(r.due)}</p> : null}
            </div>
          </li>
        );
      })}
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

export default function Dashboard() {
  const { user, business, canManage } = useAuth();
  const { t } = useLang();
  const { data, loading, error, reload } = useQuery('/reports/dashboard');
  const d = data?.data;

  const header = (
    <PageHeader title={`${greeting()}, ${user.name.split(' ')[0]}`} subtitle={`${business.name} · ${fmtDate(new Date())}`}
      actions={<Link to="/sales/new"><Button icon={FiPlus}>{t('newSale')}</Button></Link>} />
  );

  if (error) return <>{header}<Card><ErrorState error={error} onRetry={reload} /></Card></>;
  if (loading && !d) {
    return (
      <>{header}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28" />)}</div>
        <Skeleton className="mt-4 h-72" />
      </>
    );
  }

  const fresh = d.recent.length === 0 && d.chart.every((c) => !c.sales);
  const hasProfit = d.month.profit !== undefined;

  return (
    <>
      {header}

      {fresh && (
        <Card className="mb-5 p-5 sm:p-6">
          <h2 className="text-lg font-bold">Start with three simple steps</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { to: '/products', icon: FiBox, title: 'Add your products', body: 'Name, price and how many you have.' },
              { to: '/customers', icon: FiUserPlus, title: 'Add regular customers', body: 'Needed if you sell on baki (credit).' },
              { to: '/sales/new', icon: FiShoppingCart, title: 'Make your first sale', body: 'Stock and totals update automatically.' },
            ].map((s) => (
              <Link key={s.to} to={s.to} className="rounded-xl border border-line p-4 transition-colors hover:border-brand-500 hover:bg-brand-50/40">
                <s.icon className="mb-2 h-5 w-5 text-brand-600" aria-hidden />
                <p className="font-semibold">{s.title}</p>
                <p className="mt-0.5 text-sm text-ink-mute">{s.body}</p>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className={`grid grid-cols-2 gap-3 ${hasProfit ? 'lg:grid-cols-5' : 'lg:grid-cols-3'}`}>
        <Stat label={t('todaySales')} value={bdt(d.today.sales)} sub={`${num(d.today.count)} ${d.today.count === 1 ? 'sale' : 'sales'} · ${bdt(d.today.collected)} received`} tone="brand" className="col-span-2 lg:col-span-1" />
        {hasProfit && <Stat label={t('monthRevenue')} value={bdt(d.month.revenue)} sub={`${num(d.month.count)} sales`} />}
        {hasProfit && <Stat label={t('monthExpenses')} value={bdt(d.month.expenses)} />}
        {hasProfit && <Stat label={t('monthProfit')} value={bdt(d.month.profit)} sub="After expenses" tone={d.month.profit < 0 ? 'due' : undefined} />}
        <Link to="/customers?hasDue=1" className="block">
          <Stat label={t('baki')} value={bdt(d.totalDue)} sub={d.dueCustomers ? `${d.dueCustomers} customers owe you` : 'Nobody owes you'} tone={d.totalDue > 0 ? 'due' : undefined} className="h-full border-l-4 border-l-due-600" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">{t('last7')}</h2>
            <div className="flex items-center gap-4 text-sm text-ink-soft">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-600" />Sales</span>
              {hasProfit && <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-gold-600" />Profit</span>}
            </div>
          </div>
          <div className="h-64" role="img" aria-label="Chart of sales and profit for the last 7 days">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={d.chart} margin={{ top: 5, right: 4, left: -14, bottom: 0 }}>
                <CartesianGrid stroke="#E3E8E5" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtShortDate} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#7A8591' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#7A8591' }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} width={48} />
                <Tooltip content={<Tip />} cursor={{ fill: '#F4F6F5' }} />
                <Bar dataKey="sales" name="Sales" fill="#0B7A57" radius={[4, 4, 0, 0]} maxBarSize={36} />
                {hasProfit && <Line dataKey="profit" name="Profit" stroke="#9A6A0B" strokeWidth={2.5} dot={{ r: 3 }} />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between px-5 pt-5">
            <h2 className="text-lg font-bold">{t('lowStock')}</h2>
            {d.lowStockCount > 0 && <Badge tone="gold">{d.lowStockCount}</Badge>}
          </div>
          {d.lowStock.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-10 text-center text-[15px] text-ink-mute"><FiCheckCircle className="mb-2 h-6 w-6 text-brand-600" />Every product has enough stock.</div>
          ) : (
            <ul className="mt-2 pb-2">
              {d.lowStock.map((p) => (
                <li key={p._id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="flex min-w-0 items-center gap-2"><FiAlertTriangle className={`shrink-0 ${p.stock <= 0 ? 'text-due-600' : 'text-gold-600'}`} aria-hidden /><span className="truncate">{p.name}</span></span>
                  <span className={`num shrink-0 text-sm font-semibold ${p.stock <= 0 ? 'text-due-600' : 'text-gold-600'}`}>{p.stock <= 0 ? 'Out' : `${num(p.stock)} ${p.unit}`}</span>
                </li>
              ))}
            </ul>
          )}
          {canManage && d.lowStockCount > 0 && <Link to="/inventory" className="block border-t border-line px-5 py-3 text-center text-sm font-medium text-brand-700 hover:bg-mist">Manage stock</Link>}
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex items-center justify-between px-5 pb-1 pt-5">
          <h2 className="text-lg font-bold">{t('recent')}</h2>
          <Link to="/sales" className="text-sm font-medium text-brand-700 hover:underline">All sales</Link>
        </div>
        <Recent items={d.recent} />
      </Card>
    </>
  );
}
