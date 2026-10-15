import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { FiAlertOctagon, FiAlertTriangle, FiInfo, FiRefreshCw, FiTrendingUp } from 'react-icons/fi';
import { bdt, fmtDate, fmtShortDate, fmtTime } from '../lib/format.js';
import { useQuery } from '../lib/useQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import PlanGate from '../components/PlanGate.jsx';
import { Badge, Button, Card, ErrorState, PageHeader, Skeleton } from '../components/ui.jsx';

const STYLE = {
  positive: { icon: FiTrendingUp, box: 'bg-brand-50 text-brand-600' },
  warning: { icon: FiAlertTriangle, box: 'bg-gold-50 text-gold-600' },
  alert: { icon: FiAlertOctagon, box: 'bg-due-50 text-due-600' },
  info: { icon: FiInfo, box: 'bg-mist text-ink-soft' },
};

function Forecast() {
  const { data, loading, error, reload } = useQuery('/insights/forecast');
  if (error) return <ErrorState error={error} onRetry={reload} compact />;
  if (loading || !data) return <Skeleton className="h-64" />;
  const f = data.data;
  const rows = [...f.history.map((h) => ({ ...h, kind: 'actual' })), ...f.forecast.map((h) => ({ ...h, kind: 'forecast' }))];
  const week = f.forecast.reduce((s, x) => s + x.total, 0);
  return (
    <>
      <p className="text-[15px] text-ink-soft">Expected sales for the next 7 days: <strong className="num text-ink">{bdt(week)}</strong></p>
      <div className="mt-3 h-60" role="img" aria-label="Bar chart of recent sales and the 7 day forecast">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 5, right: 4, left: -14, bottom: 0 }}>
            <CartesianGrid stroke="#E3E8E5" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtShortDate} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#7A8591' }} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#7A8591' }} tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} width={48} />
            <Tooltip formatter={(v) => bdt(v)} labelFormatter={(l) => fmtDate(`${l}T12:00:00+06:00`)} />
            <Bar dataKey="total" name="Sales" radius={[3, 3, 0, 0]} maxBarSize={26}>{rows.map((r) => <Cell key={r.date} fill={r.kind === 'forecast' ? '#9FD6BB' : '#0B7A57'} />)}</Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 flex items-center gap-4 text-sm text-ink-mute"><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-600" />Actual</span><span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-200" />Estimate</span></p>
      <p className="mt-1 text-sm text-ink-mute">{f.note}</p>
    </>
  );
}

function Inner() {
  const { can } = useAuth();
  const { data, loading, error, reload } = useQuery('/insights');
  const d = data?.data;

  return (
    <>
      <PageHeader title="AI Insights" subtitle="Plain-language tips from your own sales, stock and expenses."
        actions={<Button variant="secondary" icon={FiRefreshCw} onClick={reload} loading={loading && !!d}>Refresh</Button>} />
      {error ? <Card><ErrorState error={error} onRetry={reload} /></Card> : loading && !d ? (
        <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (
        <>
          <ul className="space-y-3">
            {d.insights.map((i) => {
              const s = STYLE[i.type] || STYLE.info;
              return (
                <li key={i.id}>
                  <Card className="flex items-start gap-4 p-4 sm:p-5">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.box}`}><s.icon className="h-5 w-5" aria-hidden /></span>
                    <div className="min-w-0"><h2 className="text-[17px] font-semibold">{i.title}</h2><p className="mt-0.5 text-[15px] text-ink-soft">{i.body}</p></div>
                  </Card>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-mute">Updated {fmtDate(d.generatedAt)}, {fmtTime(d.generatedAt)} <Badge>{d.provider === 'llm' ? 'AI model' : 'Smart rules'}</Badge></p>
        </>
      )}

      <h2 className="mb-3 mt-8 text-xl font-bold">Sales forecast</h2>
      <Card className="p-5">{can('forecasting') ? <Forecast /> : <PlanGate feature="forecasting" inline />}</Card>
    </>
  );
}

export default function Insights() {
  return <PlanGate feature="aiInsights"><Inner /></PlanGate>;
}
