import { Link } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Card } from './ui.jsx';

const COPY = {
  suppliers: { title: 'Supplier management', body: 'Keep supplier details, record purchases that add to stock, and track what you still owe each supplier.', plan: 'Pro' },
  aiInsights: { title: 'AI business insights', body: 'Plain-language tips about your best sellers, items about to run out, and unusual expenses.', plan: 'Pro' },
  forecasting: { title: 'Sales forecast', body: 'See an estimate of the next 7 days of sales based on your recent history.', plan: 'Business' },
  profitLoss: { title: 'Profit & loss', body: 'See profit after expenses, day by day and for any date range.', plan: 'Pro' },
  analytics: { title: 'Product performance', body: 'Find which products earn the most revenue and profit.', plan: 'Pro' },
  staff: { title: 'Staff accounts', body: 'Give your staff their own login so they can make sales without seeing your profit.', plan: 'Pro' },
  branches: { title: 'Multiple branches', body: 'Run more than one shop from the same account.', plan: 'Business' },
  backup: { title: 'Backup', body: 'Download a complete copy of your business data any time.', plan: 'Pro' },
  export: { title: 'Excel export', body: 'Download your sales, expenses, products and customers as a file you can open in Excel.', plan: 'Pro' },
};

// A calm, in-page explanation instead of a popup. Wraps content, or replaces a whole page.
export default function PlanGate({ feature, children, inline = false }) {
  const { can } = useAuth();
  if (can(feature)) return children;
  const c = COPY[feature] || { title: 'This feature', body: '', plan: 'Pro' };
  return (
    <Card className={inline ? 'p-5' : 'mx-auto mt-6 max-w-xl p-8 text-center'}>
      <div className={inline ? 'flex items-start gap-4' : ''}>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-600 ${inline ? '' : 'mx-auto mb-4'}`}><FiLock aria-hidden /></span>
        <div>
          <h2 className="text-lg font-bold">{c.title} is on the {c.plan} plan</h2>
          <p className="mt-1.5 text-[15px] text-ink-mute">{c.body}</p>
          <Link to="/settings?tab=subscription" className="mt-4 inline-block"><Button variant="soft">See {c.plan} plan</Button></Link>
        </div>
      </div>
    </Card>
  );
}

export function LockedHint({ feature }) {
  const c = COPY[feature];
  return <span className="inline-flex items-center gap-1 text-xs text-gold-600"><FiLock aria-hidden /> {c?.plan || 'Pro'}</span>;
}
