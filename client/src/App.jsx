
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppShell from './components/AppShell.jsx';
import { Spinner } from './components/ui.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import Inventory from './pages/Inventory.jsx';
import Sales from './pages/Sales.jsx';
import NewSale from './pages/NewSale.jsx';
import Customers from './pages/Customers.jsx';
import CustomerDetail from './pages/CustomerDetail.jsx';
import Expenses from './pages/Expenses.jsx';
import Suppliers from './pages/Suppliers.jsx';
import SupplierDetail from './pages/SupplierDetail.jsx';
import Reports from './pages/Reports.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoiceView from './pages/InvoiceView.jsx';
import Insights from './pages/Insights.jsx';
import Settings from './pages/Settings.jsx';
import { useEffect, useState } from 'react';

function Splash() {
  return <div className="flex h-dvh items-center justify-center text-brand-600"><Spinner className="h-8 w-8" /></div>;
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  return user ? <Navigate to="/" replace /> : children;
}

// Staff can sell and look up customers, but not see money-out, suppliers or settings.
function Roles({ allow, children }) {
  const { user } = useAuth();
  if (allow.includes(user.role)) return children;
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <h2 className="text-xl font-bold">This page is for the owner or manager</h2>
      <p className="mt-2 text-ink-mute">Ask the owner if you need access.</p>
    </div>
  );
}

const OM = ['owner', 'manager'];

// Demo Account Modal
function DemoAccountModal() {
  const [show, setShow] = useState(false);
  const [copied, setCopied] = useState('');

  // Replace these with your actual, working demo account credentials.
  const demoEmail = 'demo@hisabflow.com';
  const demoPassword = 'Demo@12345';

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  async function copyText(text, field) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      window.prompt('Copy this text:', text);
    }
  }

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm"
      onClick={() => setShow(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
        className="relative my-auto w-full max-w-md overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Green header */}
        <div className="relative overflow-hidden bg-emerald-800 px-6 pb-7 pt-7 text-white sm:px-8">
          <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[24px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-emerald-600/30" />

          <button
            type="button"
            onClick={() => setShow(false)}
            aria-label="Close demo account modal"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20"
          >
            ×
          </button>

          <div className="relative">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-8 w-8"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <path d="M8 9h8M8 13h5M8 17h3" />
              </svg>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-700 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-50">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              FREE DEMO ACCESS
            </span>

            <h2
              id="demo-modal-title"
              className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl"
            >
              Explore HisabFlow
            </h2>

            <p className="mt-2 max-w-sm text-sm leading-6 text-emerald-100">
              Take a look around your digital shop management system. No need
              to create a new account.
            </p>
          </div>
        </div>

        {/* Modal body */}
        <div className="px-6 py-6 sm:px-8 sm:py-7">
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="m5 12 4 4L19 6" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950">
                Your demo account is ready
              </p>
              <p className="mt-1 text-xs leading-5 text-emerald-800">
                Use the credentials below to explore the available features.
              </p>
            </div>
          </div>

          {/* Demo email */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Demo email
            </label>
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 pl-3 transition focus-within:border-emerald-500">
              <span className="min-w-0 flex-1 break-all py-1 text-sm font-medium text-slate-800">
                {demoEmail}
              </span>
              <button
                type="button"
                onClick={() => copyText(demoEmail, 'email')}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50"
              >
                {copied === 'email' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Demo password */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Demo password
            </label>
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2 pl-3 transition focus-within:border-emerald-500">
              <span className="min-w-0 flex-1 break-all py-1 text-sm font-medium text-slate-800">
                {demoPassword}
              </span>
              <button
                type="button"
                onClick={() => copyText(demoPassword, 'password')}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-bold text-emerald-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50"
              >
                {copied === 'password' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-900">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="mt-0.5 h-4 w-4 shrink-0"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 11v5M12 7h.01" />
            </svg>
            <p>
              Demo access is for exploring the project. Please don't add
              personal or sensitive information.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShow(false)}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/10 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-800 active:translate-y-0"
          >
            Got it, let's explore
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            Powered by <span className="font-semibold text-emerald-800">HisabFlow</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><><Login /><DemoAccountModal /></></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route element={<Protected><AppShell /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="inventory" element={<Roles allow={OM}><Inventory /></Roles>} />
        <Route path="sales" element={<Sales />} />
        <Route path="sales/new" element={<NewSale />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="expenses" element={<Roles allow={OM}><Expenses /></Roles>} />
        <Route path="suppliers" element={<Roles allow={OM}><Suppliers /></Roles>} />
        <Route path="suppliers/:id" element={<Roles allow={OM}><SupplierDetail /></Roles>} />
        <Route path="reports" element={<Reports />} />
        <Route path="suppliers/:id" element={<Roles allow={OM}><SupplierDetail /></Roles>} />
        <Route path="reports" element={<Roles allow={OM}><Reports /></Roles>} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/:id" element={<InvoiceView />} />
        <Route path="insights" element={<Roles allow={OM}><Insights /></Roles>} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
