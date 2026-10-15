import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCreditCard, FiEdit2, FiPackage, FiPhone, FiPlus, FiTrash2 } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { bdt, fmtDate, num, ymd } from '../lib/format.js';
import { useQuery } from '../lib/useQuery.js';
import { useToast } from '../context/FeedbackContext.jsx';
import PaymentForm from '../components/PaymentForm.jsx';
import PlanGate from '../components/PlanGate.jsx';
import ProductPicker from '../components/ProductPicker.jsx';
import { SupplierForm } from './Suppliers.jsx';
import { Badge, Button, Card, DataTable, Empty, ErrorState, Input, MethodBadge, MethodPicker, Modal, Segmented, Skeleton, Stat } from '../components/ui.jsx';

let rowId = 0;
const newRow = () => ({ id: ++rowId, product: null, custom: false, name: '', qty: '', unitCost: '' });

function PurchaseForm({ supplierId, onClose, onSaved }) {
  const toast = useToast();
  const [rows, setRows] = useState([newRow()]);
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState('cash');
  const [date, setDate] = useState(ymd());
  const [reference, setReference] = useState('');
  const [updateBuyPrice, setUpdate] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const patch = (id, ch) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...ch } : x)));
  const total = Math.round(rows.reduce((s, r) => s + (Number(r.qty) || 0) * (Number(r.unitCost) || 0), 0) * 100) / 100;
  const paidNum = paid === '' ? total : Number(paid);

  async function submit(e) {
    e.preventDefault();
    for (const r of rows) {
      if (!r.custom && !r.product) return setError('Choose a product for every row, or type a name');
      if (r.custom && !r.name.trim()) return setError('Type a name for every custom item');
      if (!(Number(r.qty) > 0)) return setError('Enter a quantity for every item');
      if (r.unitCost === '' || Number(r.unitCost) < 0) return setError('Enter the cost of every item');
    }
    if (paidNum < 0 || paidNum > total) return setError('Paid amount must be between 0 and the total');
    setError('');
    setBusy(true);
    try {
      await api.post(`/suppliers/${supplierId}/purchases`, {
        items: rows.map((r) => (r.custom ? { name: r.name, qty: Number(r.qty), unitCost: Number(r.unitCost) } : { productId: r.product._id, qty: Number(r.qty), unitCost: Number(r.unitCost) })),
        paid: paidNum, method, date, reference, updateBuyPrice,
      });
      toast.success('Purchase recorded and stock updated');
      onSaved();
    } catch (ex) { setError(ex.message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {rows.map((r, i) => (
        <div key={r.id} className="rounded-xl border border-line p-3">
          <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium text-ink-mute">Item {i + 1}</p>{rows.length > 1 && <button type="button" onClick={() => setRows((x) => x.filter((y) => y.id !== r.id))} className="rounded p-1 text-ink-mute hover:text-due-600" aria-label="Remove item"><FiTrash2 /></button>}</div>
          {r.custom ? <Input label="Item name" value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} /> : <ProductPicker value={r.product} onChange={(p) => patch(r.id, { product: p, unitCost: p ? p.buyPrice : r.unitCost })} />}
          <button type="button" className="mt-1.5 text-sm text-brand-700 hover:underline" onClick={() => patch(r.id, { custom: !r.custom, product: null, name: '' })}>{r.custom ? 'Pick from my products instead' : 'Not in my products? Type a name'}</button>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Input label="Quantity" type="number" inputMode="decimal" step="any" min="0" value={r.qty} onChange={(e) => patch(r.id, { qty: e.target.value })} />
            <Input label="Cost each (৳)" type="number" inputMode="decimal" step="any" min="0" value={r.unitCost} onChange={(e) => patch(r.id, { unitCost: e.target.value })} />
          </div>
        </div>
      ))}
      <Button variant="secondary" size="sm" icon={FiPlus} onClick={() => setRows((r) => [...r, newRow()])}>Add another item</Button>

      <div className="flex items-baseline justify-between border-t border-dashed border-line pt-3"><span className="font-medium">Total</span><span className="num font-display text-2xl font-bold">{bdt(total)}</span></div>
      <Input label="Paid now (৳)" type="number" inputMode="decimal" step="any" min="0" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder={String(total)} hint={paidNum < total ? `${bdt(total - paidNum)} will be added to what you owe` : 'Leave empty to mark as fully paid'} />
      <MethodPicker value={method} onChange={setMethod} label="Paid with" />
      <div className="grid grid-cols-2 gap-3"><Input label="Date" type="date" value={date} max={ymd()} onChange={(e) => setDate(e.target.value)} /><Input label="Bill / reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" /></div>
      <label className="flex items-center gap-2.5 text-[15px]"><input type="checkbox" checked={updateBuyPrice} onChange={(e) => setUpdate(e.target.checked)} className="h-4 w-4 accent-brand-600" /> Update the buying price of these products</label>
      {error && <p className="rounded-lg bg-due-50 px-3 py-2 text-sm text-due-700" role="alert">{error}</p>}
      <div className="flex justify-end gap-2 pt-1"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Save purchase</Button></div>
    </form>
  );
}

function Inner() {
  const { id } = useParams();
  const { data, loading, error, reload } = useQuery(`/suppliers/${id}`);
  const [tab, setTab] = useState('purchases');
  const [modal, setModal] = useState(null); // 'purchase' | 'pay' | 'edit'

  const back = <Link to="/suppliers" className="mb-3 inline-flex items-center gap-1.5 rounded-lg py-1 text-ink-soft hover:text-ink"><FiArrowLeft /> Suppliers</Link>;
  if (error) return <>{back}<Card><ErrorState error={error} onRetry={reload} /></Card></>;
  if (loading && !data) return <>{back}<Skeleton className="h-40" /></>;
  const { supplier: s, purchases, payments } = data.data;

  const pCols = [
    { key: 'd', header: 'Date', render: (p) => <div><p className="font-medium">{fmtDate(p.date)}</p><p className="text-sm text-ink-mute">{p.reference || `${p.items.length} item${p.items.length === 1 ? '' : 's'}`}</p></div> },
    { key: 'i', header: 'Items', render: (p) => <span className="text-ink-soft">{p.items.map((i) => `${i.name} ×${num(i.qty)}`).join(', ')}</span>, className: 'max-w-xs' },
    { key: 't', header: 'Total', align: 'right', mobile: 'amount', render: (p) => bdt(p.total) },
    { key: 'p', header: 'Paid', align: 'right', render: (p) => bdt(p.paid) },
    { key: 'due', header: 'Due', render: (p) => (p.due > 0 ? <Badge tone="due">{bdt(p.due)}</Badge> : <Badge tone="brand">Paid</Badge>) },
  ];
  const payCols = [
    { key: 'd', header: 'Date', render: (p) => fmtDate(p.date) },
    { key: 'a', header: 'Amount', align: 'right', mobile: 'amount', render: (p) => <span className="font-semibold">{bdt(p.amount)}</span> },
    { key: 'm', header: 'Method', render: (p) => <MethodBadge method={p.method} /> },
    { key: 'n', header: 'Note', render: (p) => <span className="text-ink-mute">{p.note || '-'}</span> },
  ];

  return (
    <>
      {back}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{s.name}</h1>
          <p className="mt-1 text-[15px] text-ink-soft">{s.company}{s.company && s.address ? ' · ' : ''}{s.address}</p>
          {s.phone && <a href={`tel:${s.phone}`} className="mt-1 inline-flex items-center gap-1.5 text-[15px] text-ink-soft hover:text-brand-700"><FiPhone aria-hidden /> {s.phone}</a>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={FiEdit2} onClick={() => setModal('edit')}>Edit</Button>
          {s.dueBalance > 0 && <Button variant="secondary" icon={FiCreditCard} onClick={() => setModal('pay')}>Pay supplier</Button>}
          <Button icon={FiPackage} onClick={() => setModal('purchase')}>Record purchase</Button>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3"><Stat label="Total purchased" value={bdt(s.totalPurchased)} /><Stat label="Total paid" value={bdt(s.totalPaid)} tone="brand" /><Stat label="You owe" value={bdt(s.dueBalance)} tone={s.dueBalance > 0 ? 'due' : undefined} /></div>
      <div className="mb-3 mt-6"><Segmented label="History" value={tab} onChange={setTab} options={[{ id: 'purchases', label: `Purchases (${purchases.length})` }, { id: 'payments', label: `Payments (${payments.length})` }]} /></div>
      <Card>
        {tab === 'purchases'
          ? <DataTable columns={pCols} rows={purchases} rowKey={(p) => p._id} empty={<Empty icon={FiPackage} title="No purchases yet" body="Record what you buy from this supplier. Stock goes up automatically." action={<Button icon={FiPlus} onClick={() => setModal('purchase')}>Record purchase</Button>} />} />
          : <DataTable columns={payCols} rows={payments} rowKey={(p) => p._id} empty={<Empty icon={FiCreditCard} title="No payments yet" body="Payments you make to this supplier are listed here." />} />}
      </Card>

      <Modal open={modal === 'purchase'} onClose={() => setModal(null)} title="Record purchase" size="lg"><PurchaseForm supplierId={s._id} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} /></Modal>
      <Modal open={modal === 'pay'} onClose={() => setModal(null)} title="Pay supplier" size="sm"><PaymentForm endpoint={`/suppliers/${s._id}/payments`} due={s.dueBalance} name={s.name} verb="Pay" onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} /></Modal>
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Edit supplier"><SupplierForm supplier={s} onClose={() => setModal(null)} onSaved={() => { setModal(null); reload(); }} /></Modal>
    </>
  );
}

export default function SupplierDetail() {
  return <PlanGate feature="suppliers"><Inner /></PlanGate>;
}
