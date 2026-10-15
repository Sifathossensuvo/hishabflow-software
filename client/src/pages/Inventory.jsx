import { useState } from 'react';
import { FiArrowDown, FiArrowUp, FiLayers, FiSliders } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { bdt, fmtDateTime, num } from '../lib/format.js';
import { useQuery } from '../lib/useQuery.js';
import { useToast } from '../context/FeedbackContext.jsx';
import ProductPicker from '../components/ProductPicker.jsx';
import { Badge, Button, Card, DataTable, Empty, ErrorState, Input, Modal, PageHeader, Pagination, Segmented, Select, Skeleton, Stat } from '../components/ui.jsx';

const TYPE_LABEL = { opening: 'Opening stock', in: 'Stock in', out: 'Stock out', adjust: 'Count corrected', sale: 'Sale', sale_cancel: 'Sale cancelled', purchase: 'Purchase' };

function AdjustForm({ initial, onClose, onSaved }) {
  const toast = useToast();
  const [product, setProduct] = useState(initial || null);
  const [type, setType] = useState('in');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const q = Number(qty);
  const after = product && qty !== '' ? (type === 'in' ? product.stock + q : type === 'out' ? product.stock - q : q) : null;

  async function submit(e) {
    e.preventDefault();
    const err = {};
    if (!product) err.product = 'Choose a product';
    if (qty === '' || q < 0 || (type !== 'set' && q <= 0)) err.qty = type === 'set' ? 'Enter the counted stock' : 'Enter a quantity above 0';
    if (type === 'out' && product && q > product.stock) err.qty = `You only have ${num(product.stock)} ${product.unit}`;
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      await api.post('/inventory/adjust', { productId: product._id, type, quantity: q, note });
      toast.success('Stock updated');
      onSaved();
    } catch (ex) { toast.error(ex.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <ProductPicker value={product} onChange={setProduct} error={errors.product} />
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-soft">What happened?</p>
        <Segmented label="Adjustment type" value={type} onChange={setType} options={[{ id: 'in', label: 'Stock in' }, { id: 'out', label: 'Stock out' }, { id: 'set', label: 'Recount' }]} />
      </div>
      <Input label={type === 'set' ? 'Counted stock' : 'Quantity'} type="number" inputMode="decimal" step="any" min="0" value={qty} onChange={(e) => { setQty(e.target.value); setErrors({}); }} error={errors.qty}
        hint={after !== null && !errors.qty ? `Stock will become ${num(after)} ${product?.unit || ''}` : undefined} />
      <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={type === 'out' ? 'e.g. damaged, expired' : 'Optional'} maxLength={200} />
      <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={busy}>Save stock</Button></div>
    </form>
  );
}

function History() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useQuery('/inventory/movements', { type, page, limit: 25 });
  const columns = [
    { key: 'p', header: 'Product', render: (m) => <div><p className="font-medium">{m.productName}</p><p className="text-sm text-ink-mute">{m.note || ''}</p></div> },
    { key: 't', header: 'Type', render: (m) => <Badge tone={m.quantity < 0 ? 'due' : 'brand'}>{TYPE_LABEL[m.type]}</Badge> },
    { key: 'q', header: 'Change', align: 'right', mobile: 'amount', render: (m) => <span className={m.quantity < 0 ? 'text-due-600' : 'text-brand-700'}>{m.quantity > 0 ? '+' : ''}{num(m.quantity)}</span> },
    { key: 'a', header: 'Stock after', align: 'right', render: (m) => num(m.stockAfter) },
    { key: 'd', header: 'When', render: (m) => <span className="text-ink-mute">{fmtDateTime(m.date)}</span> },
  ];
  return (
    <Card>
      <div className="border-b border-line p-4">
        <Select aria-label="Type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="h-11 md:w-56">
          <option value="">All movements</option>{Object.entries(TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </div>
      <DataTable columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload} rowKey={(m) => m._id}
        empty={<Empty icon={FiLayers} title="No stock history yet" body="Every sale, purchase and adjustment will be listed here." />} />
      <Pagination meta={data?.meta} onPage={setPage} />
    </Card>
  );
}

export default function Inventory() {
  const [tab, setTab] = useState('overview');
  const [adjust, setAdjust] = useState(null); // null | {product?}
  const { data, loading, error, reload } = useQuery('/inventory/summary');
  const s = data?.data;

  return (
    <>
      <PageHeader title="Inventory" subtitle="Know what you have, and what it is worth."
        actions={<Button icon={FiSliders} onClick={() => setAdjust({})}>Adjust stock</Button>} />
      <div className="mb-4"><Segmented label="Inventory view" value={tab} onChange={setTab} options={[{ id: 'overview', label: 'Overview' }, { id: 'history', label: 'Stock history' }]} /></div>

      {tab === 'history' ? <History /> : error ? <Card><ErrorState error={error} onRetry={reload} /></Card> : loading && !s ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Stock value (cost)" value={bdt(s.inventoryValue)} sub={`${num(s.productCount)} products`} tone="brand" />
            <Stat label="Value if all sold" value={bdt(s.retailValue)} sub={`Potential margin ${bdt(s.retailValue - s.inventoryValue)}`} />
            <Stat label="Low stock" value={num(s.lowCount)} sub="products to refill soon" tone={s.lowCount ? undefined : undefined} />
            <Stat label="Out of stock" value={num(s.outCount)} sub="cannot be sold" tone={s.outCount ? 'due' : undefined} />
          </div>
          <Card className="mt-4">
            <h2 className="px-5 pt-5 text-lg font-bold">Needs refilling</h2>
            {s.lowStock.length === 0 ? <Empty icon={FiLayers} title="Stock looks healthy" body="Products at or below their warning level will be listed here." /> : (
              <ul className="mt-2 divide-y divide-line/70">
                {s.lowStock.map((p) => (
                  <li key={p._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0"><p className="truncate font-medium">{p.name}</p><p className="text-sm text-ink-mute">Warn at {num(p.lowStockThreshold)} {p.unit} · {p.sku}</p></div>
                    <div className="flex items-center gap-3">
                      <Badge tone={p.stock <= 0 ? 'due' : 'gold'}>{p.stock <= 0 ? 'Out of stock' : `${num(p.stock)} ${p.unit} left`}</Badge>
                      <Button variant="secondary" size="sm" icon={FiArrowUp} onClick={() => setAdjust({ product: { ...p } })}>Stock in</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <Modal open={!!adjust} onClose={() => setAdjust(null)} title="Adjust stock">
        {adjust && <AdjustForm initial={adjust.product} onClose={() => setAdjust(null)} onSaved={() => { setAdjust(null); reload(); }} />}
      </Modal>
    </>
  );
}
