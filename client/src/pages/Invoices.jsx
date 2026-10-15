import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFileText, FiPrinter } from 'react-icons/fi';
import { bdt, daysAgo, fmtDate, ymd } from '../lib/format.js';
import { useDebounced, useQuery } from '../lib/useQuery.js';
import { Badge, Button, Card, DataTable, DateRange, Empty, PageHeader, Pagination, SearchBox } from '../components/ui.jsx';

export default function Invoices() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const [range, setRange] = useState({ from: daysAgo(29), to: ymd() });
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useQuery('/sales', { q: dq, ...range, page, limit: 20 });

  const columns = [
    { key: 'inv', header: 'Invoice', render: (s) => <span className="font-medium">{s.invoiceNo}</span> },
    { key: 'date', header: 'Date', render: (s) => <span className="text-ink-soft">{fmtDate(s.date)}</span> },
    { key: 'cust', header: 'Customer', render: (s) => s.customerName },
    { key: 'total', header: 'Amount', align: 'right', mobile: 'amount', render: (s) => bdt(s.total) },
    { key: 'status', header: 'Status', render: (s) => (s.status === 'cancelled' ? <Badge>Cancelled</Badge> : s.due > 0 ? <Badge tone="due">Baki {bdt(s.due)}</Badge> : <Badge tone="brand">Paid</Badge>) },
    { key: 'actions', header: '', align: 'right', render: (s) => <Button variant="ghost" size="icon" icon={FiPrinter} onClick={() => nav(`/invoices/${s._id}`)} aria-label={`Open ${s.invoiceNo}`} /> },
  ];

  return (
    <>
      <PageHeader title="Invoices" subtitle="Open an invoice to print it, save it as PDF, or send it to your customer." />
      <Card>
        <div className="space-y-3 border-b border-line p-4">
          <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Invoice no or customer" className="md:w-80" />
          <DateRange from={range.from} to={range.to} onChange={(r) => { setRange(r); setPage(1); }} />
        </div>
        <DataTable columns={columns} rows={data?.data} loading={loading} error={error} onRetry={reload} onRowClick={(s) => nav(`/invoices/${s._id}`)}
          empty={<Empty icon={FiFileText} title="No invoices found" body="An invoice is created automatically with every sale." />} />
        <Pagination meta={data?.meta} onPage={setPage} />
      </Card>
    </>
  );
}
