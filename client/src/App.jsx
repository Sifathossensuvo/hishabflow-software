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

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
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
