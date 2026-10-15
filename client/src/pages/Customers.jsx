import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiCreditCard, FiEdit2, FiPlus, FiTrash2, FiUsers } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { bdt, num } from '../lib/format.js';
import { useDebounced, useQuery } from '../lib/useQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm, useToast } from '../context/FeedbackContext.jsx';
import CustomerForm from '../components/CustomerForm.jsx';
import PaymentForm from '../components/PaymentForm.jsx';
import { Button, Card, DataTable, Empty, Modal, PageHeader, Pagination, SearchBox, Segmented, Select, Stat } from '../components/ui.jsx';

export default function Customers() {
  const nav = useNavigate();
  const { canManage } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [sp, setSp] = useSearchParams();
  const hasDue = sp.get('hasDue') === '1' ? '1' : '';
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [pay, setPay] = useState(null);

  const { data, loading, error, reload } = useQuery('/customers', { q: dq, hasDue, sort, dir: sort === 'name' ? 'asc' : 'desc', page, limit: 20 });
  const meta = data?.meta;

  async function remove(c) {
    const ok = await confirm({ title: `Delete ${c.name}?`, message: 'They will be removed from your customer list. Their past sales and invoices stay in your records.', confirmText: 'Delete customer', danger: true });
    if (!ok) return;
    try { await api.del(`/customers/${c._id}`); toast.success('Customer deleted'); reload(); } catch (ex) { toast.error(ex.message); }
  }

  const columns = [
    { key: 'name', header: 'Customer', render: (c) => <div><p className="font-medium">{c.name}</p><p className="text-sm text-ink-mute">{c.phone || 'No phone'}</p></div> },
    { key: 'purchase', header: 'Total purchase', align: 'right', render: (c) => bdt(c.totalPurchase), className: 'hidden lg:table-cell' },
    { key: 'paid', header: 'Total paid', align: 'right', render: (c) => bdt(c.totalPaid) },
    { key: 'due', header: 'Baki', align: 'right', mobile: 'amount', render: (c) => (c.dueBalance > 0 ? <span className="font-semibold text-due-600">{bdt(c.dueBalance)}</span> : <span className="text-ink-mute">-</span>) },
    { key: 'actions', header: '', align: 'right', render: (c) => (
      <div className="flex justify-end gap-1">
        {c.dueBalance > 0 && <Button variant="soft" size="sm" icon={FiCreditCard} onClick={() => setPay(c)}>Collect</Button>}
        {canManage && <Button variant="ghost" size="icon" icon={FiEdit2} onClick={() => setForm(c)} aria-label={`Edit ${c.name}`} />}
        {canManage && <Button variant="ghost" size="icon" icon={FiTrash2} className="text-due-600 hover:bg-due-50" onClick={() => remove(c)} aria-label={`Delete ${c.name}`} />}
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Customers" subtitle="Who buys from you, and who owes you baki." actions={<Button icon={FiPlus} onClick={() => setForm({})}>Add customer</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Total baki" value={bdt(meta?.totalDue || 0)} tone={meta?.totalDue ? 'due' : undefined} className="border-l-4 border-l-due-600" />
        <Stat label="Customers owing" value={num(meta?.dueCount || 0)} />
      </div>
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name or phone" className="md:w-72" />
          <Segmented label="Filter" value={hasDue} onChange={(v) => { setSp(v ? { hasDue: v } : {}); setPage(1); }} options={[{ id: '', label: 'Everyone' }, { id: '1', label: 'Owes baki' }]} />
          <Select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 md:w-48"><option value="name">Sort: Name</option><option value="due">Sort: Most baki</option><option value="purchase">Sort: Top buyers</option><option value="recent">Sort: Newest</option></Select>
        </div>
        <DataTable columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload} onRowClick={(c) => nav(`/customers/${c._id}`)}
          empty={dq || hasDue ? <Empty icon={FiUsers} title="No customers match" body="Try another name or clear the filter." /> : <Empty icon={FiUsers} title="No customers yet" body="Add customers to track what they buy and what they owe. You can still sell to walk-in customers without adding them." action={<Button icon={FiPlus} onClick={() => setForm({})}>Add customer</Button>} />} />
        <Pagination meta={meta} onPage={setPage} />
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Edit customer' : 'Add customer'}>
        {form && <CustomerForm customer={form._id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      </Modal>
      <Modal open={!!pay} onClose={() => setPay(null)} title="Collect baki" size="sm">
        {pay && <PaymentForm endpoint={`/customers/${pay._id}/payments`} due={pay.dueBalance} name={pay.name} onClose={() => setPay(null)} onSaved={() => { setPay(null); reload(); }} />}
      </Modal>
    </>
  );
}
