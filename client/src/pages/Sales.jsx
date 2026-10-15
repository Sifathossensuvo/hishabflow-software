import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiFileText, FiPlus, FiShoppingCart, FiXCircle } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { METHODS, bdt, daysAgo, fmtDate, fmtTime, num, ymd } from '../lib/format.js';
import { useDebounced, useQuery } from '../lib/useQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm, useToast } from '../context/FeedbackContext.jsx';
import { Badge, Button, Card, DataTable, DateRange, Empty, MethodBadge, PageHeader, Pagination, SearchBox, Select, Stat } from '../components/ui.jsx';

export default function Sales() {
  const { canManage } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [range, setRange] = useState({ from: daysAgo(29), to: ymd() });
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [hasDue, setHasDue] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useQuery('/sales', { q: dq, ...range, status, method, hasDue, page, limit: 20 });
  const meta = data?.meta;
  const reset = () => setPage(1);

  async function cancel(s) {
    const ok = await confirm({ title: `Cancel ${s.invoiceNo}?`, message: 'The products go back into stock and the customer\'s baki is corrected. The invoice stays in your history marked as cancelled. Any money already paid must be refunded by you.', confirmText: 'Cancel this sale', cancelText: 'Keep sale', danger: true });
    if (!ok) return;
    try { await api.post(`/sales/${s._id}/cancel`, {}); toast.success('Sale cancelled and stock restored'); reload(); }
    catch (ex) { toast.error(ex.message); }
  }

  const columns = [
    { key: 'inv', header: 'Invoice', render: (s) => <div><p className="font-medium">{s.invoiceNo}</p><p className="text-sm text-ink-mute">{fmtDate(s.date)}, {fmtTime(s.date)}</p></div> },
    { key: 'cust', header: 'Customer', render: (s) => <span className="text-ink-soft">{s.customerName}</span> },
    { key: 'total', header: 'Total', align: 'right', mobile: 'amount', render: (s) => <span className={s.status === 'cancelled' ? 'text-ink-mute line-through' : ''}>{bdt(s.total)}</span> },
    { key: 'paid', header: 'Paid', align: 'right', render: (s) => bdt(s.paid) },
    { key: 'due', header: 'Baki', align: 'right', render: (s) => (s.status === 'completed' && s.due > 0 ? <span className="font-medium text-due-600">{bdt(s.due)}</span> : <span className="text-ink-mute">-</span>) },
    { key: 'method', header: 'Method', render: (s) => <MethodBadge method={s.paymentMethod} /> },
    { key: 'status', header: 'Status', render: (s) => (s.status === 'cancelled' ? <Badge>Cancelled</Badge> : s.due > 0 ? <Badge tone="due">Baki</Badge> : <Badge tone="brand">Paid</Badge>) },
    { key: 'actions', header: '', align: 'right', render: (s) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" icon={FiFileText} onClick={() => nav(`/invoices/${s._id}`)} aria-label={`Open invoice ${s.invoiceNo}`} />
        {canManage && s.status === 'completed' && <Button variant="ghost" size="icon" icon={FiXCircle} className="text-due-600 hover:bg-due-50" onClick={() => cancel(s)} aria-label={`Cancel ${s.invoiceNo}`} />}
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Sales" subtitle="Every sale, with what was paid and what is still baki."
        actions={<Link to="/sales/new"><Button icon={FiPlus}>New sale</Button></Link>} />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Sales" value={bdt(meta?.sums.total || 0)} />
        <Stat label="Received" value={bdt(meta?.sums.paid || 0)} tone="brand" />
        <Stat label="Baki" value={bdt(meta?.sums.due || 0)} tone={meta?.sums.due ? 'due' : undefined} />
      </div>

      <Card>
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <SearchBox value={q} onChange={(v) => { setQ(v); reset(); }} placeholder="Invoice no, customer or phone" className="md:w-80" />
            <Select aria-label="Payment method" value={method} onChange={(e) => { setMethod(e.target.value); reset(); }} className="h-11 md:w-40"><option value="">All methods</option>{METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</Select>
            <Select aria-label="Status" value={hasDue ? 'due' : status} onChange={(e) => { const v = e.target.value; setHasDue(v === 'due' ? '1' : ''); setStatus(v === 'due' ? '' : v); reset(); }} className="h-11 md:w-44">
              <option value="">All sales</option><option value="due">Has baki</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            </Select>
          </div>
          <DateRange from={range.from} to={range.to} onChange={(r) => { setRange(r); reset(); }} />
        </div>
        <DataTable columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload} onRowClick={(s) => nav(`/invoices/${s._id}`)}
          empty={<Empty icon={FiShoppingCart} title={dq || status || method || hasDue ? 'No sales match' : 'No sales in this period'} body="Change the dates or filters, or record a new sale." action={<Link to="/sales/new"><Button icon={FiPlus}>New sale</Button></Link>} />} />
        <Pagination meta={meta} onPage={setPage} />
      </Card>
      <p className="mt-3 text-sm text-ink-mute">{meta ? `${num(meta.total)} sales in this list.` : ''}</p>
    </>
  );
}
