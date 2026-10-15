import { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { num } from '../lib/format.js';
import { useDebounced, useQuery } from '../lib/useQuery.js';
import { SearchBox, Spinner } from './ui.jsx';

// Pick one product by searching. Used for stock adjustments and supplier purchases.
export default function ProductPicker({ value, onChange, label = 'Product', error }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data, loading } = useQuery('/products', { q: dq, limit: 6 }, { enabled: !value });

  if (value) {
    return (
      <div>
        <p className="mb-1.5 text-sm font-medium text-ink-soft">{label}</p>
        <div className="flex items-center justify-between rounded-lg border border-brand-600 bg-brand-50 px-3 py-2.5">
          <div className="min-w-0"><p className="truncate font-medium">{value.name}</p><p className="text-sm text-ink-mute">{value.sku} · {num(value.stock)} {value.unit} in stock</p></div>
          <button type="button" onClick={() => onChange(null)} className="rounded p-1 text-ink-mute hover:text-ink" aria-label="Choose another product"><FiX /></button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-ink-soft">{label}</p>
      <SearchBox value={q} onChange={setQ} placeholder="Search by name or SKU" />
      {error && <p className="mt-1.5 text-sm text-due-600" role="alert">{error}</p>}
      <ul className="mt-2 max-h-52 divide-y divide-line/70 overflow-y-auto rounded-lg border border-line">
        {loading && <li className="flex justify-center p-4 text-brand-600"><Spinner /></li>}
        {!loading && data?.data.length === 0 && <li className="p-4 text-center text-sm text-ink-mute">No products found.</li>}
        {data?.data.map((p) => (
          <li key={p._id}>
            <button type="button" onClick={() => onChange(p)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-mist">
              <span className="min-w-0"><span className="block truncate font-medium">{p.name}</span><span className="text-sm text-ink-mute">{p.sku}</span></span>
              <span className="num shrink-0 text-sm text-ink-soft">{num(p.stock)} {p.unit}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
