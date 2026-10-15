import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiEdit2, FiPlus, FiTrash2, FiTruck } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { bdt } from '../lib/format.js';
import { useDebounced, useQuery } from '../lib/useQuery.js';
import { useConfirm, useToast } from '../context/FeedbackContext.jsx';
import PlanGate from '../components/PlanGate.jsx';
import { Button, Card, DataTable, Empty, Input, Modal, PageHeader, Pagination, SearchBox, Stat } from '../components/ui.jsx';

export function SupplierForm({ supplier, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: supplier?.name || '', company: supplier?.company || '', phone: supplier?.phone || '', address: supplier?.address || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: undefined })); };
  async function submit(e) {
    e.preventDefault();
    if (!f.name.trim()) return setErrors({ name: 'Enter the supplier name' });
    setBusy(true);
    try {
      if (supplier) await api.put(`/suppliers/${supplier._id}`, f); else await api.post('/suppliers', f);
      toast.success(supplier ? 'Supplier updated' : 'Supplier added');
      onSaved();
    } catch (ex) { toast.error(ex.message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input label="Contact name" value={f.name} onChange={set('name')} error={errors.name} required autoFocus />
      <Input label="Company" value={f.company} onChange={set('company')} />
      <Input label="Phone" type="tel" value={f.phone} onChange={set('phone')} />
      <Input label="Address" value={f.address} onChange={set('address')} />
      <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>{supplier ? 'Save changes' : 'Add supplier'}</Button></div>
    </form>
  );
}

function Inner() {
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const { data, loading, error, reload } = useQuery('/suppliers', { q: dq, page, limit: 20 });
  const meta = data?.meta;

  async function remove(s) {
    const ok = await confirm({ title: `Delete ${s.name}?`, message: 'The supplier will be removed from your list. Past purchase records are kept.', confirmText: 'Delete supplier', danger: true });
    if (!ok) return;
    try { await api.del(`/suppliers/${s._id}`); toast.success('Supplier deleted'); reload(); } catch (ex) { toast.error(ex.message); }
  }

  const columns = [
    { key: 'n', header: 'Supplier', render: (s) => <div><p className="font-medium">{s.name}</p><p className="text-sm text-ink-mute">{s.company || s.phone || ''}</p></div> },
    { key: 'p', header: 'Phone', render: (s) => <span className="text-ink-soft">{s.phone || '-'}</span> },
    { key: 'tp', header: 'Total purchased', align: 'right', render: (s) => bdt(s.totalPurchased) },
    { key: 'due', header: 'You owe', align: 'right', mobile: 'amount', render: (s) => (s.dueBalance > 0 ? <span className="font-semibold text-due-600">{bdt(s.dueBalance)}</span> : <span className="text-ink-mute">-</span>) },
    { key: 'actions', header: '', align: 'right', render: (s) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" icon={FiEdit2} onClick={() => setForm(s)} aria-label={`Edit ${s.name}`} />
        <Button variant="ghost" size="icon" icon={FiTrash2} className="text-due-600 hover:bg-due-50" onClick={() => remove(s)} aria-label={`Delete ${s.name}`} />
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Suppliers" subtitle="Who you buy from, and what you still owe them." actions={<Button icon={FiPlus} onClick={() => setForm({})}>Add supplier</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3"><Stat label="You owe suppliers" value={bdt(meta?.totalDue || 0)} tone={meta?.totalDue ? 'due' : undefined} /><Stat label="Suppliers" value={meta?.total ?? 0} /></div>
      <Card>
        <div className="border-b border-line p-4"><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, company or phone" className="md:w-80" /></div>
        <DataTable columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload} onRowClick={(s) => nav(`/suppliers/${s._id}`)}
          empty={<Empty icon={FiTruck} title="No suppliers yet" body="Add the people you buy stock from. Recording a purchase adds to your stock automatically." action={<Button icon={FiPlus} onClick={() => setForm({})}>Add supplier</Button>} />} />
        <Pagination meta={meta} onPage={setPage} />
      </Card>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Edit supplier' : 'Add supplier'}>
        {form && <SupplierForm supplier={form._id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      </Modal>
    </>
  );
}

export default function Suppliers() {
  return <PlanGate feature="suppliers"><Inner /></PlanGate>;
}
