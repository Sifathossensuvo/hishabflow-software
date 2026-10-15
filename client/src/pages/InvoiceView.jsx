import { Link, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCopy, FiPrinter, FiShare2 } from 'react-icons/fi';
import { bdt, fmtDate, fmtTime, methodLabel, num } from '../lib/format.js';
import { useQuery } from '../lib/useQuery.js';
import { useToast } from '../context/FeedbackContext.jsx';
import { Button, Card, ErrorState, Skeleton } from '../components/ui.jsx';

export default function InvoiceView() {
  const { id } = useParams();
  const toast = useToast();
  const { data, loading, error, reload } = useQuery(`/sales/${id}`);

  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>;
  if (loading || !data) return <Skeleton className="mx-auto h-[32rem] max-w-3xl" />;

  const s = data.data;
  const b = data.business;
  const accent = b.invoice?.accentColor || '#0B7A57';
  const cancelled = s.status === 'cancelled';
  const summary = `Invoice ${s.invoiceNo} from ${b.name}\nDate: ${fmtDate(s.date)}\nTotal: ${bdt(s.total)}\nPaid: ${bdt(s.paid)}${s.due > 0 && !cancelled ? `\nBaki: ${bdt(s.due)}` : ''}\nThank you!`;
  const wa = `https://wa.me/${s.customerPhone ? '88' + s.customerPhone : ''}?text=${encodeURIComponent(summary)}`;

  async function copy() {
    try { await navigator.clipboard.writeText(summary); toast.success('Invoice summary copied'); }
    catch { toast.error('Could not copy. Select the text and copy it yourself.'); }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ title: s.invoiceNo, text: summary }); } catch { /* cancelled */ } }
    else window.open(wa, '_blank', 'noopener');
  }

  return (
    <>
      <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-2 print:hidden">
        <Link to="/invoices" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-ink-soft hover:bg-white"><FiArrowLeft /> Invoices</Link>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" icon={FiCopy} onClick={copy}>Copy</Button>
          <Button variant="secondary" icon={FiShare2} onClick={share}>Share</Button>
          <Button icon={FiPrinter} onClick={() => window.print()}>Print / Save PDF</Button>
        </div>
      </div>

      <article className="relative mx-auto max-w-3xl overflow-hidden rounded-xl border border-line bg-white p-6 sm:p-10 print:rounded-none print:border-0 print:p-0" aria-label={`Invoice ${s.invoiceNo}`}>
        <div className="absolute inset-x-0 top-0 h-1.5 print:h-1" style={{ background: accent }} aria-hidden />
        {cancelled && <div className="pointer-events-none absolute right-8 top-24 -rotate-12 rounded-lg border-4 border-due-600 px-4 py-1 font-display text-3xl font-bold text-due-600 opacity-70">CANCELLED</div>}

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: accent }}>{b.name}</h1>
            {b.address && <p className="mt-1 max-w-xs text-[15px] text-ink-soft">{b.address}</p>}
            {b.phone && <p className="text-[15px] text-ink-soft">{b.phone}</p>}
            {b.email && <p className="text-[15px] text-ink-soft">{b.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-ink-mute">Invoice</p>
            <p className="font-display text-xl font-bold">{s.invoiceNo}</p>
            <p className="mt-1 text-[15px] text-ink-soft">{fmtDate(s.date)}</p>
            <p className="text-sm text-ink-mute">{fmtTime(s.date)}</p>
          </div>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-ink-mute">Billed to</p>
            <p className="font-semibold">{s.customerName}</p>
            {s.customerPhone && <p className="text-[15px] text-ink-soft">{s.customerPhone}</p>}
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-ink-mute">Payment method</p>
            <p className="font-semibold">{methodLabel(s.paymentMethod)}</p>
          </div>
        </section>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-[15px]">
            <thead>
              <tr className="border-b-2 text-sm text-ink-mute" style={{ borderColor: accent }}>
                <th className="py-2 pr-2 font-medium">Item</th><th className="px-2 py-2 text-right font-medium">Qty</th><th className="px-2 py-2 text-right font-medium">Price</th><th className="py-2 pl-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {s.items.map((it, i) => (
                <tr key={i} className="border-b border-line/70">
                  <td className="py-3 pr-2"><p className="font-medium">{it.name}</p><p className="text-xs text-ink-mute">{it.sku}</p></td>
                  <td className="num px-2 py-3 text-right">{num(it.qty)} {it.unit}</td>
                  <td className="num px-2 py-3 text-right">{bdt(it.unitPrice)}</td>
                  <td className="num py-3 pl-2 text-right font-medium">{bdt(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <dl className="w-full max-w-xs space-y-2 text-[15px]">
            <div className="flex justify-between"><dt className="text-ink-mute">Subtotal</dt><dd className="num">{bdt(s.subtotal)}</dd></div>
            {s.discount > 0 && <div className="flex justify-between"><dt className="text-ink-mute">Discount</dt><dd className="num">-{bdt(s.discount)}</dd></div>}
            <div className="flex justify-between border-t border-line pt-2 text-lg font-bold"><dt>Total</dt><dd className="num">{bdt(s.total)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-mute">Paid</dt><dd className="num">{bdt(s.paid)}</dd></div>
            <div className={`flex justify-between rounded-lg px-3 py-2 font-semibold ${s.due > 0 && !cancelled ? 'bg-due-50 text-due-700' : 'bg-brand-50 text-brand-800'}`}><dt>{s.due > 0 && !cancelled ? 'Baki (due)' : 'Balance'}</dt><dd className="num">{bdt(cancelled ? 0 : s.due)}</dd></div>
          </dl>
        </div>

        {s.note && <p className="mt-6 text-[15px] text-ink-soft"><span className="text-ink-mute">Note: </span>{s.note}</p>}
        <footer className="mt-10 border-t border-line pt-4 text-center text-sm text-ink-mute">
          {b.invoice?.footerNote && <p>{b.invoice.footerNote}</p>}
          {b.invoice?.terms && <p className="mt-1">{b.invoice.terms}</p>}
        </footer>
      </article>
    </>
  );
}
