import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCreditCard, FiEdit2, FiMapPin, FiPhone, FiShoppingCart } from 'react-icons/fi';
import { bdt, fmtDate } from '../lib/format.js';
import { useQuery } from '../lib/useQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import CustomerForm from '../components/CustomerForm.jsx';
import PaymentForm from '../components/PaymentForm.jsx';
import { Badge, Button, Card, DataTable, Empty, ErrorState, MethodBadge, Modal, Segmented, Skeleton, Stat } from '../components/ui.jsx';

export default function CustomerDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { canManage } = useAuth();
  const { data, loading, error, reload } = useQuery(`/customers/${id}`);
  const [tab, setTab] = useState('sales');
  const [edit, setEdit] = useState(false);
  const [pay, setPay] = useState(false);

  const back = <Link to="/customers" className="mb-3 inline-flex items-center gap-1.5 rounded-lg py-1 text-ink-soft hover:text-ink"><FiArrowLeft /> Customers</Link>;
  if (error) return <>{back}<Card><ErrorState error={error} onRetry={reload} /></Card></>;
  if (loading && !data) return <>{back}<Skeleton className="h-40" /></>;
  const { customer: c, sales, payments } = data.data;

  const saleCols = [
    { key: 'inv', header: 'Invoice', render: (s) => <div><p className="font-medium">{s.invoiceNo}</p><p className="text-sm text-ink-mute">{fmtDate(s.date)}</p></div> },
    { key: 'items', header: 'Items', render: (s) => `${s.itemCount} item${s.itemCount === 1 ? '' : 's'}` },
    { key: 'total', header: 'Total', align: 'right', mobile: 'amount', render: (s) => bdt(s.total) },
    { key: 'paid', header: 'Paid', align: 'right', render: (s) => bdt(s.paid) },
    { key: 'status', header: 'Status', render: (s) => (s.status === 'cancelled' ? <Badge>Cancelled</Badge> : s.due > 0 ? <Badge tone="due">Baki {bdt(s.due)}</Badge> : <Badge tone="brand">Paid</Badge>) },
  ];
  const payCols = [
    { key: 'd', header: 'Date', render: (p) => fmtDate(p.date) },
    { key: 'a', header: 'Amount', align: 'right', mobile: 'amount', render: (p) => <span className="font-semibold text-brand-700">{bdt(p.amount)}</span> },
    { key: 'm', header: 'Method', render: (p) => <MethodBadge method={p.method} /> },
    { key: 'n', header: 'Note', render: (p) => <span className="text-ink-mute">{p.note || '-'}</span> },
  ];

  return (
    <>
      {back}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[15px] text-ink-soft">
            {c.phone && <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 hover:text-brand-700"><FiPhone aria-hidden /> {c.phone}</a>}
            {c.address && <span className="inline-flex items-center gap-1.5"><FiMapPin aria-hidden /> {c.address}</span>}
          </div>
          {c.note && <p className="mt-2 text-sm text-ink-mute">{c.note}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {canManage && <Button variant="secondary" icon={FiEdit2} onClick={() => setEdit(true)}>Edit</Button>}
          <Link to={`/sales/new?customer=${c._id}`}><Button variant="secondary" icon={FiShoppingCart}>New sale</Button></Link>
          {c.dueBalance > 0 && <Button icon={FiCreditCard} onClick={() => setPay(true)}>Collect baki</Button>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Total purchase" value={bdt(c.totalPurchase)} />
        <Stat label="Total paid" value={bdt(c.totalPaid)} tone="brand" />
        <Stat label="Baki" value={bdt(c.dueBalance)} tone={c.dueBalance > 0 ? 'due' : undefined} className={c.dueBalance > 0 ? 'border-l-4 border-l-due-600' : ''} />
      </div>

      <div className="mb-3 mt-6"><Segmented label="History" value={tab} onChange={setTab} options={[{ id: 'sales', label: `Purchases (${sales.length})` }, { id: 'payments', label: `Baki payments (${payments.length})` }]} /></div>
      <Card>
        {tab === 'sales'
          ? <DataTable columns={saleCols} rows={sales} rowKey={(s) => s._id} onRowClick={(s) => nav(`/invoices/${s._id}`)} empty={<Empty icon={FiShoppingCart} title="No purchases yet" body="Sales to this customer will appear here." />} />
          : <DataTable columns={payCols} rows={payments} rowKey={(p) => p._id} empty={<Empty icon={FiCreditCard} title="No baki payments yet" body="When this customer pays off baki, it is listed here." />} />}
      </Card>

      <Modal open={edit} onClose={() => setEdit(false)} title="Edit customer"><CustomerForm customer={c} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); reload(); }} /></Modal>
      <Modal open={pay} onClose={() => setPay(false)} title="Collect baki" size="sm"><PaymentForm endpoint={`/customers/${c._id}/payments`} due={c.dueBalance} name={c.name} onClose={() => setPay(false)} onSaved={() => { setPay(false); reload(); }} /></Modal>
    </>
  );
}
