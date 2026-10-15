import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiArrowLeft, FiMinus, FiPlus, FiShoppingCart, FiTrash2, FiX } from 'react-icons/fi';
import { api } from '../lib/api.js';
import { bdt, cn, num } from '../lib/format.js';
import { useDebounced, useQuery } from '../lib/useQuery.js';
import { useToast } from '../context/FeedbackContext.jsx';
import CustomerSelect from '../components/CustomerSelect.jsx';
import { Badge, Button, Card, Empty, ErrorState, Input, MethodPicker, SearchBox, Segmented, Skeleton } from '../components/ui.jsx';

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const stepFor = (u) => (['kg', 'litre'].includes(u) ? 0.5 : ['g', 'ml'].includes(u) ? 100 : 1);

export default function NewSale() {
  const nav = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const { data, loading, error, reload } = useQuery('/products', { q: dq, inStock: 1, limit: 24, page });

  useEffect(() => { setPage(1); setProducts([]); }, [dq]);
  useEffect(() => { if (data) setProducts((prev) => (page === 1 ? data.data : [...prev, ...data.data.filter((p) => !prev.some((x) => x._id === p._id))])); }, [data, page]);

  const [cart, setCart] = useState([]); // [{ product, qty, unitPrice }]
  const [customer, setCustomer] = useState(null);
  const [discount, setDiscount] = useState('');
  const [payMode, setPayMode] = useState('full');
  const [paid, setPaid] = useState('');
  const [method, setMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const preselect = params.get('customer');
  useEffect(() => { if (preselect) api.get(`/customers/${preselect}`).then((r) => setCustomer(r.data.customer)).catch(() => {}); }, [preselect]);

  const subtotal = useMemo(() => r2(cart.reduce((s, l) => s + l.qty * l.unitPrice, 0)), [cart]);
  const disc = Math.max(0, Number(discount) || 0);
  const total = r2(Math.max(0, subtotal - disc));
  const paidNow = payMode === 'full' ? total : Math.min(total, Math.max(0, Number(paid) || 0));
  const due = r2(total - paidNow);
  const count = cart.length;

  function add(p) {
    setCart((c) => {
      const i = c.findIndex((l) => l.product._id === p._id);
      if (i >= 0) {
        const next = [...c];
        next[i] = { ...next[i], qty: Math.min(p.stock, r2(next[i].qty + stepFor(p.unit))) };
        return next;
      }
      return [...c, { product: p, qty: Math.min(p.stock, stepFor(p.unit)), unitPrice: p.sellPrice }];
    });
    setErrors({});
  }
  const patch = (id, change) => setCart((c) => c.map((l) => (l.product._id === id ? { ...l, ...change } : l)));
  const remove = (id) => setCart((c) => c.filter((l) => l.product._id !== id));

  async function submit() {
    const e = {};
    if (!cart.length) e.cart = 'Add at least one product';
    cart.forEach((l) => { if (!(l.qty > 0)) e.cart = `Set a quantity for ${l.product.name}`; else if (l.qty > l.product.stock) e.cart = `Only ${num(l.product.stock)} ${l.product.unit} of ${l.product.name} in stock`; if (l.unitPrice === '' || l.unitPrice < 0) e.cart = `Check the price of ${l.product.name}`; });
    if (disc > subtotal) e.discount = 'Discount is more than the subtotal';
    if (payMode === 'partial' && Number(paid) > total) e.paid = 'Paid amount is more than the total';
    if (due > 0 && !customer) e.customer = 'Choose a customer to record baki';
    setErrors(e);
    if (Object.keys(e).length) { if (e.cart) toast.error(e.cart); return; }
    setBusy(true);
    try {
      const res = await api.post('/sales', {
        items: cart.map((l) => ({ productId: l.product._id, qty: l.qty, unitPrice: l.unitPrice })),
        customerId: customer?._id, discount: disc, paid: payMode === 'full' ? undefined : paidNow, method, note,
      });
      toast.success(`Sale saved · ${res.data.invoiceNo}`);
      nav(`/invoices/${res.data._id}`, { replace: true });
    } catch (ex) {
      toast.error(ex.message);
      if (ex.code === 'INSUFFICIENT_STOCK') reload();
    } finally { setBusy(false); }
  }

  const cartPanel = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between lg:hidden">
        <h2 className="text-lg font-bold">Cart</h2>
        <Button variant="ghost" size="icon" icon={FiX} onClick={() => setCartOpen(false)} aria-label="Close cart" />
      </div>
      <CustomerSelect value={customer} onChange={(c) => { setCustomer(c); setErrors((s) => ({ ...s, customer: undefined })); }} error={errors.customer} />

      <div>
        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center text-[15px] text-ink-mute">Tap a product to add it.</div>
        ) : (
          <ul className="divide-y divide-line/70 rounded-xl border border-line">
            {cart.map((l) => (
              <li key={l.product._id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 font-medium leading-snug">{l.product.name}</p>
                  <button onClick={() => remove(l.product._id)} className="rounded p-1 text-ink-mute hover:text-due-600" aria-label={`Remove ${l.product.name}`}><FiTrash2 /></button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="flex items-center rounded-lg border border-line">
                    <button className="flex h-9 w-9 items-center justify-center text-ink-soft hover:bg-mist" onClick={() => patch(l.product._id, { qty: Math.max(0, r2(l.qty - stepFor(l.product.unit))) })} aria-label="Decrease quantity"><FiMinus /></button>
                    <input type="number" inputMode="decimal" min="0" step="any" value={l.qty} onChange={(e) => patch(l.product._id, { qty: e.target.value === '' ? '' : Number(e.target.value) })} aria-label={`Quantity of ${l.product.name}`}
                      className={cn('num h-9 w-14 border-x border-line text-center text-[15px] focus:outline-none', l.qty > l.product.stock && 'text-due-600')} />
                    <button className="flex h-9 w-9 items-center justify-center text-ink-soft hover:bg-mist" onClick={() => patch(l.product._id, { qty: Math.min(l.product.stock, r2((Number(l.qty) || 0) + stepFor(l.product.unit))) })} aria-label="Increase quantity"><FiPlus /></button>
                  </div>
                  <span className="text-sm text-ink-mute">{l.product.unit} ×</span>
                  <div className="flex items-center gap-1">
                    <span className="text-ink-mute">৳</span>
                    <input type="number" inputMode="decimal" min="0" step="any" value={l.unitPrice} onChange={(e) => patch(l.product._id, { unitPrice: e.target.value === '' ? '' : Number(e.target.value) })} aria-label={`Price of ${l.product.name}`} className="field num h-9 w-20 px-2 py-1 text-right" />
                  </div>
                  <p className="num w-20 text-right font-semibold">{bdt(r2((Number(l.qty) || 0) * (Number(l.unitPrice) || 0)))}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Card className="space-y-3 p-4">
        <div className="flex justify-between text-[15px]"><span className="text-ink-mute">Subtotal</span><span className="num">{bdt(subtotal)}</span></div>
        <Input label="Discount (৳)" type="number" inputMode="decimal" min="0" step="any" value={discount} onChange={(e) => { setDiscount(e.target.value); setErrors((s) => ({ ...s, discount: undefined })); }} error={errors.discount} placeholder="0" />
        <div className="flex items-baseline justify-between border-t border-dashed border-line pt-3"><span className="font-medium">Total</span><span className="num font-display text-2xl font-bold">{bdt(total)}</span></div>
      </Card>

      <div className="space-y-3">
        <MethodPicker value={method} onChange={setMethod} />
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink-soft">Payment</p>
          <Segmented label="Payment" value={payMode} onChange={setPayMode} options={[{ id: 'full', label: 'Paid in full' }, { id: 'partial', label: 'Partly paid / Baki' }]} />
        </div>
        {payMode === 'partial' && <Input label="Paid now (৳)" type="number" inputMode="decimal" min="0" step="any" value={paid} onChange={(e) => { setPaid(e.target.value); setErrors((s) => ({ ...s, paid: undefined })); }} error={errors.paid} placeholder="0" />}
        {due > 0 && <div className="flex items-center justify-between rounded-lg bg-due-50 px-4 py-3"><span className="text-due-700">Baki to collect later</span><span className="num font-bold text-due-700">{bdt(due)}</span></div>}
        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" maxLength={300} />
      </div>

      <Button size="lg" className="w-full" onClick={submit} loading={busy} disabled={!cart.length}>Complete sale · {bdt(total)}</Button>
    </div>
  );

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <Link to="/sales" className="rounded-lg p-2 text-ink-soft hover:bg-white" aria-label="Back to sales"><FiArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-bold">New sale</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <section aria-label="Products">
          <SearchBox value={q} onChange={setQ} placeholder="Search product or SKU" />
          {error ? <Card className="mt-4"><ErrorState error={error} onRetry={reload} /></Card> : loading && !products.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
          ) : products.length === 0 ? (
            <Card className="mt-4"><Empty icon={FiShoppingCart} title={dq ? 'No product found' : 'No products in stock'} body={dq ? 'Check the spelling or try the SKU.' : 'Add products or stock in some items first.'} action={!dq && <Link to="/products"><Button>Go to products</Button></Link>} /></Card>
          ) : (
            <>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {products.map((p) => {
                  const inCart = cart.find((l) => l.product._id === p._id);
                  return (
                    <li key={p._id}>
                      <button onClick={() => add(p)} className={cn('relative flex h-full w-full flex-col justify-between rounded-xl border bg-white p-3.5 text-left transition-colors hover:border-brand-500 active:bg-brand-50', inCart ? 'border-brand-600 bg-brand-50/50' : 'border-line')}>
                        <span className="line-clamp-2 font-medium leading-snug">{p.name}</span>
                        <span className="mt-3 flex items-end justify-between">
                          <span className="num font-bold text-brand-700">{bdt(p.sellPrice)}</span>
                          <span className={cn('num text-xs', p.stock <= p.lowStockThreshold ? 'text-gold-600' : 'text-ink-mute')}>{num(p.stock)} {p.unit}</span>
                        </span>
                        {inCart && <Badge tone="brand" className="absolute -right-1.5 -top-1.5 num">{num(inCart.qty)}</Badge>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {data?.meta && data.meta.page < data.meta.pages && <div className="mt-4 text-center"><Button variant="secondary" loading={loading} onClick={() => setPage((p) => p + 1)}>Show more</Button></div>}
            </>
          )}
        </section>

        <aside className={cn('lg:block', cartOpen ? 'fixed inset-0 z-40 overflow-y-auto bg-mist p-4 pb-10' : 'hidden')}>
          <Card className="p-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">{cartPanel}</Card>
        </aside>
      </div>

      {!cartOpen && cart.length > 0 && (
        <button onClick={() => setCartOpen(true)} className="fixed inset-x-4 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex h-14 items-center justify-between rounded-xl bg-ink px-5 text-white shadow-pop lg:hidden">
          <span className="flex items-center gap-2"><FiShoppingCart /> View cart ({count})</span><span className="num font-bold">{bdt(total)}</span>
        </button>
      )}
    </>
  );
}
