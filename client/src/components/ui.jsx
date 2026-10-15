import { forwardRef, useEffect, useId } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiAlertTriangle, FiChevronLeft, FiChevronRight, FiSearch, FiX } from 'react-icons/fi';
import { METHODS, cn, daysAgo, monthStart, ymd } from '../lib/format.js';

/* ---------- Button ---------- */
const BTN = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-200',
  secondary: 'bg-white text-ink border border-line hover:bg-mist active:bg-line/60 disabled:text-ink-mute',
  ghost: 'text-ink-soft hover:bg-mist active:bg-line/60',
  danger: 'bg-due-600 text-white hover:bg-due-700 disabled:bg-due-100',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
};
const SIZES = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-4 text-[15px]', lg: 'h-12 px-6 text-base', icon: 'h-10 w-10' };

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading, icon: Icon, children, className, disabled, type = 'button', ...rest }, ref) {
  return (
    <button ref={ref} type={type} disabled={disabled || loading}
      className={cn('inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed', BTN[variant], SIZES[size], className)} {...rest}>
      {loading ? <Spinner className="h-4 w-4" /> : Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function Spinner({ className = 'h-5 w-5' }) {
  return <span className={cn('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className)} role="status" aria-label="Loading" />;
}

/* ---------- Form fields ---------- */
function FieldShell({ label, error, hint, required, id, children, className }) {
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-soft">{label}{required && <span className="text-due-600"> *</span>}</label>}
      {children}
      {error ? <p id={id + '-err'} className="mt-1.5 text-sm text-due-600" role="alert">{error}</p> : hint ? <p className="mt-1.5 text-sm text-ink-mute">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, required, className, wrapClass, prefix, ...rest }, ref) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} id={id} className={wrapClass}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-mute">{prefix}</span>}
        <input ref={ref} id={id} aria-invalid={!!error} aria-describedby={error ? id + '-err' : undefined}
          className={cn('field', prefix && 'pl-8', error && 'field-error', className)} {...rest} />
      </div>
    </FieldShell>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, required, children, className, wrapClass, ...rest }, ref) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} id={id} className={wrapClass}>
      <select ref={ref} id={id} className={cn('field pr-8', error && 'field-error', className)} {...rest}>{children}</select>
    </FieldShell>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, required, className, wrapClass, ...rest }, ref) {
  const id = useId();
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} id={id} className={wrapClass}>
      <textarea ref={ref} id={id} rows={3} className={cn('field', error && 'field-error', className)} {...rest} />
    </FieldShell>
  );
});

export function Switch({ checked, onChange, label, description, disabled }) {
  return (
    <label className={cn('flex items-start justify-between gap-4 py-3', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <span>
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        {description && <span className="block text-sm text-ink-mute">{description}</span>}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-line transition-colors peer-checked:bg-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-focus-visible:ring-offset-2 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
    </label>
  );
}

export function SearchBox({ value, onChange, placeholder = 'Search', className }) {
  return (
    <div className={cn('relative', className)}>
      <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" aria-hidden />
      <input type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="field h-11 pl-9" />
    </div>
  );
}

export function MethodPicker({ value, onChange, label = 'Payment method' }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink-soft">{label}</legend>
      <div className="grid grid-cols-4 gap-2">
        {METHODS.map((m) => (
          <button key={m.id} type="button" onClick={() => onChange(m.id)} aria-pressed={value === m.id}
            className={cn('flex h-11 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors', value === m.id ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-line bg-white text-ink-soft hover:bg-mist')}>
            <span className="h-2 w-2 rounded-full" style={{ background: m.color }} aria-hidden />{m.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-lg border border-line bg-white p-0.5">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className={cn('h-9 rounded-md px-3 text-sm font-medium transition-colors', value === o.id ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-mist')}>{o.label}</button>
      ))}
    </div>
  );
}

export function DateRange({ from, to, onChange }) {
  const presets = [
    { id: 'today', label: 'Today', f: ymd(), t: ymd() },
    { id: '7', label: '7 days', f: daysAgo(6), t: ymd() },
    { id: '30', label: '30 days', f: daysAgo(29), t: ymd() },
    { id: 'month', label: 'This month', f: monthStart(), t: ymd() },
  ];
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button key={p.id} type="button" onClick={() => onChange({ from: p.f, to: p.t })}
            className={cn('h-9 rounded-full border px-3 text-sm transition-colors', from === p.f && to === p.t ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-line bg-white text-ink-soft hover:bg-mist')}>{p.label}</button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input type="date" aria-label="From date" value={from} max={to} onChange={(e) => e.target.value && onChange({ from: e.target.value, to })} className="field h-9 w-[9.5rem] py-1 text-sm" />
        <span className="text-ink-mute">–</span>
        <input type="date" aria-label="To date" value={to} min={from} max={ymd()} onChange={(e) => e.target.value && onChange({ from, to: e.target.value })} className="field h-9 w-[9.5rem] py-1 text-sm" />
      </div>
    </div>
  );
}

/* ---------- Display ---------- */
export const Card = ({ className, children, ...rest }) => <div className={cn('card', className)} {...rest}>{children}</div>;

const TONES = {
  neutral: 'bg-mist text-ink-soft', brand: 'bg-brand-50 text-brand-700', due: 'bg-due-50 text-due-700',
  gold: 'bg-gold-50 text-gold-600', blue: 'bg-sky-50 text-sky-800',
};
export const Badge = ({ tone = 'neutral', children, className }) => (
  <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', TONES[tone], className)}>{children}</span>
);

export const Skeleton = ({ className }) => <div className={cn('animate-pulse rounded-md bg-line/70', className)} aria-hidden />;

export function Empty({ icon: Icon, title, body, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><Icon className="h-7 w-7" aria-hidden /></span>}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-[15px] text-ink-mute">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, compact }) {
  return (
    <div className={cn('flex flex-col items-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14')} role="alert">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-due-50 text-due-600"><FiAlertTriangle className="h-6 w-6" aria-hidden /></span>
      <h3 className="text-lg font-semibold">Could not load this</h3>
      <p className="mt-1 max-w-sm text-[15px] text-ink-mute">{error?.message || 'Something went wrong.'}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-ink sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-ink-mute">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone, icon: Icon, className }) {
  const color = tone === 'due' ? 'text-due-600' : tone === 'brand' ? 'text-brand-700' : 'text-ink';
  return (
    <Card className={cn('p-4 sm:p-5', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-ink-mute">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-ink-mute" aria-hidden />}
      </div>
      <p className={cn('num mt-1.5 font-display text-2xl font-bold sm:text-[28px]', color)}>{value}</p>
      {sub && <p className="mt-1 text-sm text-ink-mute">{sub}</p>}
    </Card>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  const width = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size];
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4 print:hidden">
          <motion.div className="absolute inset-0 bg-ink/40" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div role="dialog" aria-modal="true" aria-label={title}
            className={cn('relative flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-white shadow-pop sm:rounded-2xl', width)}
            initial={{ y: 32, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 32, opacity: 0 }} transition={{ duration: 0.18 }}>
            <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
              <h2 className="text-lg font-bold">{title}</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-ink-mute hover:bg-mist hover:text-ink" aria-label="Close"><FiX className="h-5 w-5" /></button>
            </div>
            <div className="overflow-y-auto px-5 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Pagination ---------- */
export function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm text-ink-mute">
      <span className="num">Page {meta.page} of {meta.pages} · {meta.total} total</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" icon={FiChevronLeft} disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page" />
        <Button variant="secondary" size="sm" icon={FiChevronRight} disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)} aria-label="Next page" />
      </div>
    </div>
  );
}

/* ---------- DataTable: real table on desktop, stacked cards on phones ---------- */
export function DataTable({ columns, rows, rowKey = (r) => r._id, onRowClick, loading, empty, error, onRetry }) {
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading && !rows?.length) {
    return <div className="space-y-3 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>;
  }
  if (!rows?.length) return empty || null;

  const clickable = !!onRowClick;
  const keyHandler = (r) => (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRowClick(r); } };
  const visible = columns.filter((c) => c.mobile !== 'hide');
  const title = visible.find((c) => c.mobile === 'title') || visible[0];
  const amount = visible.find((c) => c.mobile === 'amount');
  const actions = columns.find((c) => c.key === 'actions');
  const details = visible.filter((c) => c !== title && c !== amount && c !== actions);

  return (
    <div className={cn(loading && 'opacity-60 transition-opacity')}>
      <table className="hidden w-full text-left text-[15px] md:table">
        <thead>
          <tr className="border-b border-line text-sm text-ink-mute">
            {columns.map((c) => <th key={c.key} scope="col" className={cn('px-4 py-3 font-medium', c.align === 'right' && 'text-right', c.className)}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} onClick={clickable ? () => onRowClick(r) : undefined} onKeyDown={clickable ? keyHandler(r) : undefined} tabIndex={clickable ? 0 : undefined}
              className={cn('border-b border-line/70 last:border-0', clickable && 'cursor-pointer hover:bg-mist/70 focus-visible:bg-mist/70')}>
              {columns.map((c) => <td key={c.key} className={cn('px-4 py-3.5 align-middle', c.align === 'right' && 'text-right num', c.className)} onClick={c.key === 'actions' ? (e) => e.stopPropagation() : undefined}>{c.render(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-line/70 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} onClick={clickable ? () => onRowClick(r) : undefined} onKeyDown={clickable ? keyHandler(r) : undefined} tabIndex={clickable ? 0 : undefined}
            className={cn('px-4 py-3.5', clickable && 'cursor-pointer active:bg-mist')}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 font-medium">{title.render(r)}</div>
              {amount && <div className="num shrink-0 text-right font-semibold">{amount.render(r)}</div>}
            </div>
            {details.length > 0 && (
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {details.map((c) => (
                  <div key={c.key} className="min-w-0">
                    <dt className="text-xs text-ink-mute">{c.header}</dt>
                    <dd className="truncate text-ink-soft">{c.render(r)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions && <div className="mt-2 flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>{actions.render(r)}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Plan lock ---------- */
export function MethodBadge({ method }) {
  const m = METHODS.find((x) => x.id === method);
  if (!m) return null;
  return <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft"><span className="h-2 w-2 rounded-full" style={{ background: m.color }} aria-hidden />{m.label}</span>;
}
