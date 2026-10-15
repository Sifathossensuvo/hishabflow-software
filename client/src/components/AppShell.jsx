import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { FiBarChart2, FiBell, FiBox, FiFileText, FiHome, FiLayers, FiLock, FiLogOut, FiMenu, FiPlus, FiSettings, FiShoppingCart, FiTrendingDown, FiTruck, FiUsers, FiZap } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { useQuery } from '../lib/useQuery.js';
import { cn } from '../lib/format.js';
import Logo from './Logo.jsx';
import { Badge, Modal } from './ui.jsx';

const NAV = [
  { to: '/', key: 'dashboard', icon: FiHome, end: true },
  { to: '/sales', key: 'sales', icon: FiShoppingCart },
  { to: '/products', key: 'products', icon: FiBox },
  { to: '/customers', key: 'customers', icon: FiUsers },
  { to: '/inventory', key: 'inventory', icon: FiLayers, roles: ['owner', 'manager'] },
  { to: '/expenses', key: 'expenses', icon: FiTrendingDown, roles: ['owner', 'manager'] },
  { to: '/suppliers', key: 'suppliers', icon: FiTruck, roles: ['owner', 'manager'], feature: 'suppliers' },
  { to: '/reports', key: 'reports', icon: FiBarChart2, roles: ['owner', 'manager'] },
  { to: '/invoices', key: 'invoices', icon: FiFileText },
  { to: '/insights', key: 'insights', icon: FiZap, roles: ['owner', 'manager'], feature: 'aiInsights' },
  { to: '/settings', key: 'settings', icon: FiSettings },
];

function useOutside(ref, onOut) {
  useEffect(() => {
    const h = (e) => ref.current && !ref.current.contains(e.target) && onOut();
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onOut]);
}

function Bell() {
  const { can, business } = useAuth();
  const enabled = can('lowStockAlerts') && business.notifications?.lowStock !== false;
  const { data } = useQuery('/inventory/alerts', {}, { enabled });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  if (!enabled) return null;
  const items = data?.data || [];
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2.5 text-ink-soft hover:bg-mist" aria-label={`Alerts${items.length ? `, ${items.length} items` : ''}`} aria-expanded={open}>
        <FiBell className="h-5 w-5" />
        {items.length > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-due-600 px-1 text-[10px] font-semibold text-white">{items.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border border-line bg-white shadow-pop">
          <p className="border-b border-line px-4 py-3 font-semibold">Stock alerts</p>
          {items.length === 0 ? <p className="px-4 py-6 text-center text-sm text-ink-mute">All products have enough stock.</p> : (
            <ul className="max-h-80 divide-y divide-line/70 overflow-y-auto">
              {items.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                  <span className="truncate">{a.name}</span>
                  <Badge tone={a.level === 'out' ? 'due' : 'gold'}>{a.level === 'out' ? 'Out of stock' : `${a.stock} ${a.unit} left`}</Badge>
                </li>
              ))}
            </ul>
          )}
          <Link to="/inventory" onClick={() => setOpen(false)} className="block border-t border-line px-4 py-3 text-center text-sm font-medium text-brand-700 hover:bg-mist">Open inventory</Link>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, business, logout, plan } = useAuth();
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();
  useOutside(ref, () => setOpen(false));
  const initial = (user.name || '?').trim().charAt(0).toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-mist" aria-label="Account menu" aria-expanded={open}>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 font-semibold text-white">{initial}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-line bg-white shadow-pop">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-semibold">{user.name}</p>
            <p className="truncate text-sm text-ink-mute">{business.name}</p>
            <div className="mt-2 flex gap-1.5"><Badge tone="brand">{plan.name}</Badge><Badge>{user.role}</Badge></div>
          </div>
          <div className="p-2">
            <button onClick={() => setLang(lang === 'en' ? 'bn' : 'en')} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-[15px] hover:bg-mist">
              <span>Language</span><span className="font-medium text-brand-700">{lang === 'en' ? 'বাংলা' : 'English'}</span>
            </button>
            <button onClick={() => { setOpen(false); nav('/settings'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[15px] hover:bg-mist"><FiSettings /> {t('settings')}</button>
            <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[15px] text-due-600 hover:bg-due-50"><FiLogOut /> {t('logout')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell() {
  const { user, can, plan } = useAuth();
  const { t, lang } = useLang();
  const loc = useLocation();
  const [more, setMore] = useState(false);
  useEffect(() => { setMore(false); window.scrollTo(0, 0); }, [loc.pathname]);

  const items = NAV.filter((n) => !n.roles || n.roles.includes(user.role));
  const linkCls = ({ isActive }) => cn('group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors', isActive ? 'bg-brand-50 text-brand-800' : 'text-ink-soft hover:bg-mist hover:text-ink');

  const tabs = [
    { to: '/', key: 'home', icon: FiHome, end: true },
    { to: '/products', key: 'products', icon: FiBox },
    null,
    { to: '/customers', key: 'customers', icon: FiUsers },
  ];

  return (
    <div className="min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-white px-3 py-5 print:hidden lg:flex">
        <Link to="/" className="mb-6 px-3"><Logo /></Link>
        <nav className="flex-1 space-y-0.5 overflow-y-auto" aria-label="Main">
          {items.map(({ to, key, icon: Icon, end, feature }) => (
            <NavLink key={to} to={to} end={end} className={linkCls}>
              <Icon className="h-[18px] w-[18px]" aria-hidden />
              <span className="flex-1">{t(key)}</span>
              {feature && !can(feature) && <FiLock className="h-3.5 w-3.5 text-gold-600" aria-label="Paid plan" />}
            </NavLink>
          ))}
        </nav>
        <Link to="/settings?tab=subscription" className="mt-4 rounded-xl border border-line p-3 hover:bg-mist">
          <p className="text-sm text-ink-mute">Your plan</p>
          <p className="font-semibold">{plan.name}{plan.price > 0 && <span className="font-normal text-ink-mute"> · ৳{plan.price}/mo</span>}</p>
        </Link>
      </aside>

      <div className="lg:pl-60">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-line bg-white/90 px-4 pt-[env(safe-area-inset-top)] backdrop-blur print:hidden sm:px-6">
          <Link to="/" className="lg:hidden"><Logo /></Link>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1">
            <Link to="/sales/new" className="mr-1 hidden h-10 items-center gap-2 rounded-lg bg-brand-600 px-4 text-[15px] font-medium text-white hover:bg-brand-700 sm:inline-flex"><FiPlus /> {t('newSale')}</Link>
            <Bell />
            <UserMenu />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pt-7 lg:pb-12 print:max-w-none print:p-0" key={lang}>
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] print:hidden lg:hidden" aria-label="Main">
        <ul className="mx-auto grid max-w-md grid-cols-5 items-end">
          {tabs.map((tab, i) => tab ? (
            <li key={tab.to}>
              <NavLink to={tab.to} end={tab.end} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-xs font-medium', isActive ? 'text-brand-700' : 'text-ink-mute')}>
                <tab.icon className="h-5 w-5" aria-hidden />{t(tab.key)}
              </NavLink>
            </li>
          ) : (
            <li key="new" className="flex justify-center">
              <Link to="/sales/new" className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-pop active:bg-brand-800" aria-label={t('newSale')}><FiPlus className="h-7 w-7" /></Link>
            </li>
          ))}
          <li>
            <button onClick={() => setMore(true)} className="flex w-full flex-col items-center gap-0.5 py-2 text-xs font-medium text-ink-mute"><FiMenu className="h-5 w-5" aria-hidden />{t('more')}</button>
          </li>
        </ul>
      </nav>

      <Modal open={more} onClose={() => setMore(false)} title="Menu">
        <div className="grid grid-cols-3 gap-2">
          {items.map(({ to, key, icon: Icon, feature }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn('relative flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-sm font-medium', isActive ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-line text-ink-soft')}>
              <Icon className="h-5 w-5" aria-hidden />{t(key)}
              {feature && !can(feature) && <FiLock className="absolute right-2 top-2 h-3 w-3 text-gold-600" aria-label="Paid plan" />}
            </NavLink>
          ))}
        </div>
      </Modal>
    </div>
  );
}
