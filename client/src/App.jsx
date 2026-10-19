
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
    <>
      <style>{`
        .hisab-demo-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 12px;
          overflow: hidden;
          overscroll-behavior: none;
          background: rgb(2 6 23 / 60%);
          backdrop-filter: blur(6px);
        }

        .hisab-demo-card {
          width: min(100%, 490px);
          max-height: calc(100dvh - 24px);
          flex: 0 1 auto;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: none;
          -ms-overflow-style: none;
          border: 1px solid #d1fae5;
          border-radius: 24px;
          background: white;
          box-shadow: 0 25px 60px rgb(0 0 0 / 25%);
        }

        .hisab-demo-card::-webkit-scrollbar,
        .hisab-demo-card *::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        .hisab-demo-card,
        .hisab-demo-card * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }

        .hisab-demo-header {
          flex: 0 0 auto;
          padding: 22px 28px 20px;
        }

        .hisab-demo-body {
          flex: 0 0 auto;
          min-width: 0;
          padding: 20px 28px 22px;
        }

        @media (max-height: 700px) {
          .hisab-demo-overlay {
            padding: 8px;
          }

          .hisab-demo-card {
            max-height: calc(100dvh - 16px);
            width: min(100%, 540px);
            border-radius: 20px;
          }

          .hisab-demo-header {
            padding: 14px 22px 12px;
          }

          .hisab-demo-body {
            padding: 12px 22px 14px;
          }

          .hisab-demo-icon {
            width: 38px !important;
            height: 38px !important;
            margin-bottom: 8px !important;
          }

          .hisab-demo-title {
            margin-top: 8px !important;
            font-size: 23px !important;
            line-height: 1.15 !important;
          }

          .hisab-demo-description {
            margin-top: 5px !important;
            font-size: 12px !important;
            line-height: 17px !important;
          }

          .hisab-demo-notice {
            margin-bottom: 10px !important;
            padding: 9px 11px !important;
          }

          .hisab-demo-field {
            margin-bottom: 9px !important;
          }

          .hisab-demo-label {
            margin-bottom: 4px !important;
          }

          .hisab-demo-input {
            padding: 5px 8px 5px 10px !important;
          }

          .hisab-demo-warning {
            margin-top: 10px !important;
            padding: 7px 10px !important;
          }

          .hisab-demo-submit {
            margin-top: 10px !important;
            padding: 10px 14px !important;
          }

          .hisab-demo-footer {
            margin-top: 8px !important;
          }
        }

        @media (max-height: 520px) {
          .hisab-demo-overlay {
            padding: 5px;
          }

          .hisab-demo-card {
            max-height: calc(100dvh - 10px);
            width: min(100%, 580px);
            border-radius: 16px;
          }

          .hisab-demo-header {
            padding: 9px 18px 8px;
          }

          .hisab-demo-body {
            padding: 8px 18px 9px;
          }

          .hisab-demo-icon {
            display: none !important;
          }

          .hisab-demo-title {
            margin-top: 5px !important;
            font-size: 20px !important;
          }

          .hisab-demo-description {
            font-size: 11px !important;
            line-height: 15px !important;
          }

          .hisab-demo-notice {
            margin-bottom: 7px !important;
            padding: 6px 9px !important;
          }

          .hisab-demo-field {
            margin-bottom: 6px !important;
          }

          .hisab-demo-warning {
            margin-top: 7px !important;
            padding: 5px 8px !important;
          }

          .hisab-demo-submit {
            margin-top: 7px !important;
            padding: 8px 12px !important;
          }

          .hisab-demo-footer {
            margin-top: 5px !important;
          }
        }

        @media (max-width: 420px) {
          .hisab-demo-overlay {
            padding: 8px;
          }

          .hisab-demo-card {
            width: 100%;
            border-radius: 18px;
          }

          .hisab-demo-header {
            padding-left: 16px;
            padding-right: 16px;
          }

          .hisab-demo-body {
            padding-left: 16px;
            padding-right: 16px;
          }
        }
      `}</style>

      <div
        className="hisab-demo-overlay"
        onClick={() => setShow(false)}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-modal-title"
          className="hisab-demo-card"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Green header */}
          <div className="hisab-demo-header relative overflow-hidden bg-emerald-800 text-white">
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
              <div className="hisab-demo-icon mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-inner sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl">
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
                className="hisab-demo-title mt-3 text-xl font-bold tracking-tight sm:mt-4 sm:text-3xl"
              >
                Explore HisabFlow
              </h2>

              <p className="hisab-demo-description mt-1.5 max-w-sm text-xs leading-5 text-emerald-100 sm:mt-2 sm:text-sm sm:leading-6">
                Take a look around your digital shop management system. No need
                to create a new account.
              </p>
            </div>
          </div>

          {/* Modal body */}
          <div className="hisab-demo-body">
            <div className="hisab-demo-notice mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 sm:mb-5 sm:gap-3 sm:rounded-2xl sm:p-4">
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
            <div className="hisab-demo-field mb-3 sm:mb-4">
              <label className="hisab-demo-label mb-1.5 block text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">
                Demo email
              </label>

              <div className="hisab-demo-input flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-3 transition focus-within:border-emerald-500 sm:p-2 sm:pl-3">
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
            <div className="hisab-demo-field">
              <label className="hisab-demo-label mb-1.5 block text-xs font-semibold text-slate-700 sm:mb-2 sm:text-sm">
                Demo password
              </label>

              <div className="hisab-demo-input flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-3 transition focus-within:border-emerald-500 sm:p-2 sm:pl-3">
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

            <div className="hisab-demo-warning mt-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-[10px] leading-4 text-amber-900 sm:mt-6 sm:rounded-xl sm:py-3 sm:text-xs sm:leading-5">
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
              className="hisab-demo-submit mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-900/10 transition duration-200 hover:-translate-y-0.5 hover:bg-emerald-800 active:translate-y-0 sm:mt-5 sm:px-5 sm:py-3.5 sm:text-sm"
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

            <p className="hisab-demo-footer mt-3 text-center text-[10px] text-slate-400 sm:mt-4 sm:text-xs">
              Powered by <span className="font-semibold text-emerald-800">HisabFlow</span>
            </p>
          </div>
        </div>
      </div>
    </>
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
