import { useRef, useState, useEffect } from 'react';
import { FiChevronDown, FiPlus, FiUser, FiX } from 'react-icons/fi';
import { bdt } from '../lib/format.js';
import { useDebounced, useQuery } from '../lib/useQuery.js';
import CustomerForm from './CustomerForm.jsx';
import { Modal, SearchBox, Spinner } from './ui.jsx';

export default function CustomerSelect({ value, onChange, error }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const ref = useRef(null);
  const { data, loading } = useQuery('/customers', { q: dq, limit: 6 }, { enabled: open });

  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <p className="mb-1.5 text-sm font-medium text-ink-soft">Customer</p>
      <div className={`flex items-center rounded-lg border bg-white ${error ? 'border-due-600' : 'border-line'}`}>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left" aria-haspopup="listbox" aria-expanded={open}>
          <FiUser className="shrink-0 text-ink-mute" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{value ? <><span className="font-medium">{value.name}</span>{value.dueBalance > 0 && <span className="ml-2 text-sm text-due-600">Baki {bdt(value.dueBalance)}</span>}</> : <span className="text-ink-soft">Walk-in customer</span>}</span>
          {!value && <FiChevronDown className="shrink-0 text-ink-mute" aria-hidden />}
        </button>
        {value && <button type="button" onClick={() => onChange(null)} className="px-3 text-ink-mute hover:text-ink" aria-label="Remove customer"><FiX /></button>}
      </div>
      {error && <p className="mt-1.5 text-sm text-due-600" role="alert">{error}</p>}
      {open && (
        <div className="absolute inset-x-0 top-full z-30 mt-1.5 rounded-xl border border-line bg-white p-2 shadow-pop">
          <SearchBox value={q} onChange={setQ} placeholder="Search name or phone" />
          <ul className="mt-2 max-h-56 overflow-y-auto" role="listbox">
            {loading && <li className="flex justify-center p-3 text-brand-600"><Spinner /></li>}
            {data?.data.map((c) => (
              <li key={c._id}>
                <button type="button" onClick={() => { onChange(c); setOpen(false); setQ(''); }} className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-mist">
                  <span className="min-w-0"><span className="block truncate font-medium">{c.name}</span><span className="text-sm text-ink-mute">{c.phone || 'No phone'}</span></span>
                  {c.dueBalance > 0 && <span className="num shrink-0 text-sm text-due-600">{bdt(c.dueBalance)}</span>}
                </button>
              </li>
            ))}
            {!loading && data?.data.length === 0 && <li className="p-3 text-center text-sm text-ink-mute">No customer found.</li>}
          </ul>
          <button type="button" onClick={() => { setAdding(true); setOpen(false); }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left font-medium text-brand-700 hover:bg-brand-50"><FiPlus /> New customer</button>
        </div>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add customer">
        <CustomerForm onClose={() => setAdding(false)} onSaved={(c) => { setAdding(false); onChange(c); }} />
      </Modal>
    </div>
  );
}
