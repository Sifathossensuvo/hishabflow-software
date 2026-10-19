
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
    const timer = setTimeout(() => setShow(true), 1750);
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
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4"
      onClick={() => setShow(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-modal-title"
        className="relative my-auto flex max-h-[calc(100dvh-1rem)] w-full max-w-md flex-col overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-emerald-100 bg-white shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Green header */}
        <div className="relative shrink-0 overflow-hidden bg-emerald-800 px-5 pb-5 pt-5 text-white sm:px-8 sm:pb-7 sm:pt-7">
          <div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full border-[24px] border-white/5" />
          <div className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-emerald-600/30" />

          <button
            type="button"
            onClick={() => setShow(false)}
            aria-label="Close demo account modal"
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xl text-white transition hover:bg-white/20 sm:right-4 sm:top-4 sm:h-9 sm:w-9"
          >
            ×
          </button>

          <div className="relative">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-inner sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-6 w-6 sm:h-8 sm:w-8"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <path d="M8 9h8M8 13h5M8 17h3" />
              </svg>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-700 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-emerald-50 sm:px-3 sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-emerald-300" />
              FREE DEMO ACCESS
            </span>

            <h2
              id="demo-modal-title"
              className="mt-3 text-xl font-bold tracking-tight sm:mt-4 sm:text-3xl"
            >
              Explore HisabFlow
            </h2>

            <p className="mt-1.5 max-w-sm text-xs leading-5 text-emerald-100 sm:mt-2 sm:text-sm sm:leading-6">
              Take a look around your digital shop management system. No need
              to create a new account.
            </p>
          </div>
        </div>

        {/* Modal body */}
        <div className="min-w-0 px-4 py-4 sm:px-8 sm:py-7">
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 sm:mb-5 sm:gap-3 sm:rounded-2xl sm:p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 sm:h-9 sm:w-9 sm:rounded-xl">
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
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-950 sm:text-sm">
                Your demo account is ready
              </p>
              <p className="mt-1 text-[11px] leading-4 text-emerald-800 sm:text-xs sm:leading-5">
                Use the credentials below to explore the available features.
              </p>
            </div>
          </div>

          {/* Demo email */}
          <div className="mb-3 sm:mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">
              Demo email
            </label>
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-3 transition focus-within:border-emerald-500 sm:p-2 sm:pl-3">
              <span className="min-w-0 flex-1 break-all py-1 text-xs font-medium text-slate-800 sm:text-sm">
                {demoEmail}
              </span>
              <button
                type="button"
                onClick={() => copyText(demoEmail, 'email')}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-2 text-[11px] font-bold text-emerald-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 sm:gap-1.5 sm:px-3 sm:text-xs"
              >
                {copied === 'email' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Demo password */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">
              Demo password
            </label>
            <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-3 transition focus-within:border-emerald-500 sm:p-2 sm:pl-3">
              <span className="min-w-0 flex-1 break-all py-1 text-xs font-medium text-slate-800 sm:text-sm">
                {demoPassword}
              </span>
              <button
                type="button"
                onClick={() => copyText(demoPassword, 'password')}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-2 text-[11px] font-bold text-emerald-800 shadow-sm ring-1 ring-slate-200 transition hover:bg-emerald-50 sm:gap-1.5 sm:px-3 sm:text-xs"
              >
                {copied === 'password' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[10px] leading-4 text-amber-900 sm:mt-6 sm:rounded-xl sm:py-3 sm:text-xs sm:leading-5">
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
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-900/10 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-800 active:translate-y-0 sm:mt-5 sm:px-5 sm:py-3.5 sm:text-sm"
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

          <p className="mt-3 text-center text-[10px] text-slate-400 sm:mt-4 sm:text-xs">
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
