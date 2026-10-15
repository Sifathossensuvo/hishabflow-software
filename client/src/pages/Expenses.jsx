import { useState } from 'react';
import { FiEdit2, FiPlus, FiTrash2, FiTrendingDown } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { EXPENSE_CATEGORIES, bdt, fmtDate, monthStart, ymd } from '../lib/format.js';
import { useDebounced, useQuery } from '../lib/useQuery.js';
import { useConfirm, useToast } from '../context/FeedbackContext.jsx';
import { Badge, Button, Card, DataTable, DateRange, Empty, Input, MethodBadge, MethodPicker, Modal, PageHeader, Pagination, SearchBox, Select, Stat, Textarea } from '../components/ui.jsx';

function ExpenseForm({ expense, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ title: expense?.title || '', category: expense?.category || 'Other', amount: expense?.amount ?? '', method: expense?.method || 'cash', date: expense ? ymd(expense.date) : ymd(), note: expense?.note || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: undefined })); };

  async function submit(e) {
    e.preventDefault();
    const err = {};
    if (!f.title.trim()) err.title = 'Write what the money was spent on';
    if (!(Number(f.amount) > 0)) err.amount = 'Enter an amount above 0';
    if (!f.date) err.date = 'Choose a date';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      const body = { ...f, amount: Number(f.amount) };
      if (expense) await api.put(`/expenses/${expense._id}`, body); else await api.post('/expenses', body);
      toast.success(expense ? 'Expense updated' : 'Expense added');
      onSaved();
    } catch (ex) { if (ex.field) setErrors({ [ex.field]: ex.message }); else toast.error(ex.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input label="What was it for?" value={f.title} onChange={set('title')} error={errors.title} placeholder="e.g. Shop rent for October" autoFocus required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Amount (৳)" type="number" inputMode="decimal" step="any" min="0" value={f.amount} onChange={set('amount')} error={errors.amount} required />
        <Input label="Date" type="date" value={f.date} max={ymd()} onChange={set('date')} error={errors.date} />
      </div>
      <Select label="Category" value={f.category} onChange={set('category')}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
      <MethodPicker label="Paid with" value={f.method} onChange={(m) => setF((s) => ({ ...s, method: m }))} />
      <Textarea label="Note" value={f.note} onChange={set('note')} rows={2} maxLength={300} placeholder="Optional" />
      <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>{expense ? 'Save changes' : 'Add expense'}</Button></div>
    </form>
  );
}

export default function Expenses() {
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [range, setRange] = useState({ from: monthStart(), to: ymd() });
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const { data, loading, error, reload } = useQuery('/expenses', { q: dq, category, ...range, page, limit: 20 });
  const meta = data?.meta;
  const top = meta?.byCategory?.[0];

  async function remove(x) {
    const ok = await confirm({ title: 'Delete this expense?', message: `"${x.title}" (${bdt(x.amount)}) will be removed and your profit will go up by that amount.`, confirmText: 'Delete expense', danger: true });
    if (!ok) return;
    try { await api.del(`/expenses/${x._id}`); toast.success('Expense deleted'); reload(); } catch (ex) { toast.error(ex.message); }
  }

  const columns = [
    { key: 't', header: 'Expense', render: (x) => <div><p className="font-medium">{x.title}</p>{x.note && <p className="text-sm text-ink-mute">{x.note}</p>}</div> },
    { key: 'c', header: 'Category', render: (x) => <Badge>{x.category}</Badge> },
    { key: 'd', header: 'Date', render: (x) => <span className="text-ink-soft">{fmtDate(x.date)}</span> },
    { key: 'm', header: 'Paid with', render: (x) => <MethodBadge method={x.method} /> },
    { key: 'a', header: 'Amount', align: 'right', mobile: 'amount', render: (x) => <span className="font-semibold">{bdt(x.amount)}</span> },
    { key: 'actions', header: '', align: 'right', render: (x) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" icon={FiEdit2} onClick={() => setForm(x)} aria-label={`Edit ${x.title}`} />
        <Button variant="ghost" size="icon" icon={FiTrash2} className="text-due-600 hover:bg-due-50" onClick={() => remove(x)} aria-label={`Delete ${x.title}`} />
      </div>
    ) },
  ];

  return (
    <>
      <PageHeader title="Expenses" subtitle="Rent, salary, bills and everything else you spend." actions={<Button icon={FiPlus} onClick={() => setForm({})}>Add expense</Button>} />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="Spent in this period" value={bdt(meta?.total || 0)} />
        <Stat label="Biggest category" value={top ? top.category : '-'} sub={top ? bdt(top.total) : 'No expenses yet'} />
      </div>
      <Card>
        <div className="space-y-3 border-b border-line p-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search expenses" className="md:w-72" />
            <Select aria-label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="h-11 md:w-52"><option value="">All categories</option>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
          </div>
          <DateRange from={range.from} to={range.to} onChange={(r) => { setRange(r); setPage(1); }} />
        </div>
        <DataTable columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload}
          empty={<Empty icon={FiTrendingDown} title="No expenses in this period" body="Record what you spend so your profit is accurate." action={<Button icon={FiPlus} onClick={() => setForm({})}>Add expense</Button>} />} />
        <Pagination meta={meta} onPage={setPage} />
      </Card>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Edit expense' : 'Add expense'}>
        {form && <ExpenseForm expense={form._id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      </Modal>
    </>
  );
}
