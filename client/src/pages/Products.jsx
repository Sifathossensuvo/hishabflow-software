import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBox, FiEdit2, FiPlus, FiTrash2 } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { UNITS, bdt, num } from '../lib/format.js';
import { useDebounced, useQuery } from '../lib/useQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useConfirm, useToast } from '../context/FeedbackContext.jsx';
import { Badge, Button, Card, DataTable, Empty, Input, Modal, PageHeader, Pagination, SearchBox, Segmented, Select } from '../components/ui.jsx';

const blank = { name: '', sku: '', category: '', unit: 'pcs', buyPrice: '', sellPrice: '', stock: '', lowStockThreshold: '5' };

function stockBadge(p) {
  if (p.stock <= 0) return <Badge tone="due">Out of stock</Badge>;
  if (p.stock <= p.lowStockThreshold) return <Badge tone="gold">Low · {num(p.stock)} {p.unit}</Badge>;
  return <span className="num">{num(p.stock)} {p.unit}</span>;
}

function ProductForm({ product, categories, onClose, onSaved }) {
  const toast = useToast();
  const editing = !!product;
  const [f, setF] = useState(product ? { ...product, category: product.category === 'General' ? '' : product.category } : blank);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: undefined })); };

  function validate() {
    const e = {};
    if (!f.name.trim()) e.name = 'Enter the product name';
    if (f.buyPrice === '' || Number(f.buyPrice) < 0) e.buyPrice = 'Enter the buying price (0 if free)';
    if (f.sellPrice === '' || Number(f.sellPrice) < 0) e.sellPrice = 'Enter the selling price';
    if (!editing && f.stock !== '' && Number(f.stock) < 0) e.stock = 'Stock cannot be negative';
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body = { name: f.name, sku: f.sku, category: f.category, unit: f.unit, buyPrice: Number(f.buyPrice), sellPrice: Number(f.sellPrice), lowStockThreshold: f.lowStockThreshold === '' ? 5 : Number(f.lowStockThreshold) };
      if (!editing) body.stock = f.stock === '' ? 0 : Number(f.stock);
      if (editing) await api.put(`/products/${product._id}`, body);
      else await api.post('/products', body);
      toast.success(editing ? 'Product updated' : 'Product added');
      onSaved();
    } catch (ex) {
      if (ex.field) setErrors({ [ex.field]: ex.message });
      else toast.error(ex.message);
    } finally { setBusy(false); }
  }

  const loss = f.buyPrice !== '' && f.sellPrice !== '' && Number(f.sellPrice) < Number(f.buyPrice);

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Input label="Product name" value={f.name} onChange={set('name')} error={errors.name} required autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Buying price (৳)" type="number" inputMode="decimal" step="any" min="0" value={f.buyPrice} onChange={set('buyPrice')} error={errors.buyPrice} required />
        <Input label="Selling price (৳)" type="number" inputMode="decimal" step="any" min="0" value={f.sellPrice} onChange={set('sellPrice')} error={errors.sellPrice} required />
      </div>
      {loss && <p className="rounded-lg bg-gold-50 px-3 py-2 text-sm text-gold-600">The selling price is lower than the buying price. You will lose money on each sale.</p>}
      <div className="grid grid-cols-2 gap-3">
        {!editing && <Input label="Stock you have now" type="number" inputMode="decimal" step="any" min="0" value={f.stock} onChange={set('stock')} error={errors.stock} placeholder="0" />}
        <Select label="Unit" value={f.unit} onChange={set('unit')}>{UNITS.map((u) => <option key={u}>{u}</option>)}</Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Input label="Category" list="cats" value={f.category} onChange={set('category')} placeholder="General" />
          <datalist id="cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <Input label="Warn me when stock is" type="number" inputMode="decimal" step="any" min="0" value={f.lowStockThreshold} onChange={set('lowStockThreshold')} hint="or below" />
      </div>
      <Input label="SKU / code" value={f.sku} onChange={set('sku')} error={errors.sku} hint="Leave empty and we will make one" />
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={busy}>{editing ? 'Save changes' : 'Add product'}</Button>
      </div>
    </form>
  );
}

export default function Products() {
  const { canManage } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null); // null | {} (new) | product (edit)

  const params = { q: dq, category, status, sort, dir: sort === 'name' || sort === 'category' ? 'asc' : 'desc', page, limit: 20 };
  const { data, loading, error, reload } = useQuery('/products', params);
  const rows = data?.data || [];
  const meta = data?.meta;
  const filtered = !!(dq || category || status);

  async function remove(p) {
    const ok = await confirm({ title: `Delete ${p.name}?`, message: 'It will be removed from your product list. Past sales and invoices keep its name, so your reports stay correct.', confirmText: 'Delete product', cancelText: 'Keep it', danger: true });
    if (!ok) return;
    try { await api.del(`/products/${p._id}`); toast.success('Product deleted'); reload(); }
    catch (ex) { toast.error(ex.message); }
  }

  const columns = [
    { key: 'name', header: 'Product', render: (p) => <div><p className="font-medium">{p.name}</p><p className="text-sm text-ink-mute">{p.sku}</p></div> },
    { key: 'category', header: 'Category', render: (p) => <span className="text-ink-soft">{p.category}</span> },
    { key: 'buy', header: 'Buying', align: 'right', render: (p) => bdt(p.buyPrice), className: 'hidden lg:table-cell' },
    { key: 'sell', header: 'Selling', align: 'right', mobile: 'amount', render: (p) => bdt(p.sellPrice) },
    { key: 'stock', header: 'Stock', align: 'right', render: stockBadge },
    ...(canManage ? [{ key: 'actions', header: '', align: 'right', render: (p) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" icon={FiEdit2} onClick={() => setForm(p)} aria-label={`Edit ${p.name}`} />
        <Button variant="ghost" size="icon" icon={FiTrash2} className="text-due-600 hover:bg-due-50" onClick={() => remove(p)} aria-label={`Delete ${p.name}`} />
      </div>
    ) }] : []),
  ];

  const empty = filtered ? (
    <Empty icon={FiBox} title="No products match" body="Try a different search or clear the filters." action={<Button variant="secondary" onClick={() => { setQ(''); setCategory(''); setStatus(''); setPage(1); }}>Clear filters</Button>} />
  ) : (
    <Empty icon={FiBox} title="Add your first product" body="Products are what you sell. Add a name, price and how many you have, and stock will update with every sale."
      action={canManage ? <Button icon={FiPlus} onClick={() => setForm({})}>Add product</Button> : null} />
  );

  return (
    <>
      <PageHeader title="Products" subtitle={meta ? `${num(meta.total)} ${filtered ? 'found' : 'products'}` : ' '}
        actions={canManage && <Button icon={FiPlus} onClick={() => setForm({})}>Add product</Button>} />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name or SKU" className="md:w-72" />
          <Select aria-label="Category" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="h-11 md:w-48">
            <option value="">All categories</option>
            {(meta?.categories || []).map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select aria-label="Sort by" value={sort} onChange={(e) => setSort(e.target.value)} className="h-11 md:w-44">
            <option value="name">Sort: Name</option><option value="stock">Sort: Stock</option><option value="sellPrice">Sort: Price</option><option value="updated">Sort: Recently changed</option>
          </Select>
          <Segmented label="Stock filter" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ id: '', label: 'All' }, { id: 'low', label: 'Low' }, { id: 'out', label: 'Out' }]} />
        </div>
        <DataTable columns={columns} rows={rows} loading={loading} error={error} onRetry={reload} empty={empty} />
        <Pagination meta={meta} onPage={setPage} />
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Edit product' : 'Add product'}>
        {form && <ProductForm product={form._id ? form : null} categories={meta?.categories || []} onClose={() => setForm(null)} onSaved={() => { setForm(null); reload(); }} />}
      </Modal>
    </>
  );
}
