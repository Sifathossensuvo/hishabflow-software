import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiCheck, FiDownload, FiEdit2, FiPlus } from 'react-icons/fi';
import { api, setToken } from '../lib/api.js';
import { bdt, fmtDate, num } from '../lib/format.js';
import { isBDPhone, isEmail } from '../lib/validators.js';
import { useQuery } from '../lib/useQuery.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLang } from '../context/LangContext.jsx';
import { useConfirm, useToast } from '../context/FeedbackContext.jsx';
import PlanGate from '../components/PlanGate.jsx';
import { Badge, Button, Card, Empty, ErrorState, Input, Modal, PageHeader, Select, Skeleton, Switch, Textarea } from '../components/ui.jsx';

const TABS = [
  { id: 'business', label: 'Business' }, { id: 'invoice', label: 'Invoice' }, { id: 'account', label: 'Account' },
  { id: 'subscription', label: 'Subscription' }, { id: 'notifications', label: 'Notifications' },
  { id: 'team', label: 'Team', owner: true }, { id: 'branches', label: 'Branches', owner: true }, { id: 'data', label: 'Backup', owner: true },
];

function Section({ title, children, desc }) {
  return <Card className="max-w-2xl p-5 sm:p-6"><h2 className="text-lg font-bold">{title}</h2>{desc && <p className="mt-1 text-[15px] text-ink-mute">{desc}</p>}<div className="mt-5">{children}</div></Card>;
}

function BusinessTab() {
  const { business, refresh, isOwner } = useAuth();
  const { lang, setLang } = useLang();
  const toast = useToast();
  const [f, setF] = useState({ name: business.name, phone: business.phone || '', email: business.email || '', address: business.address || '', language: lang });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: undefined })); };

  async function save(e) {
    e.preventDefault();
    const err = {};
    if (!f.name.trim()) err.name = 'Enter your business name';
    if (f.email && !isEmail(f.email)) err.email = 'Enter a valid email address';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try { await api.put('/settings/business', f); setLang(f.language); await refresh(); toast.success('Business details saved'); }
    catch (ex) { if (ex.field) setErrors({ [ex.field]: ex.message }); else toast.error(ex.message); }
    finally { setBusy(false); }
  }

  return (
    <Section title="Business profile" desc="This appears on your invoices.">
      <form onSubmit={save} className="space-y-4" noValidate>
        <Input label="Business name" value={f.name} onChange={set('name')} error={errors.name} disabled={!isOwner} required />
        <div className="grid gap-4 sm:grid-cols-2"><Input label="Phone" value={f.phone} onChange={set('phone')} disabled={!isOwner} /><Input label="Email" type="email" value={f.email} onChange={set('email')} error={errors.email} disabled={!isOwner} /></div>
        <Textarea label="Address" rows={2} value={f.address} onChange={set('address')} disabled={!isOwner} maxLength={300} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Language" value={f.language} onChange={set('language')}><option value="en">English (with Bangla terms)</option><option value="bn">বাংলা</option></Select>
          <Input label="Currency" value="BDT (৳) Bangladeshi Taka" disabled readOnly />
        </div>
        {isOwner && <Button type="submit" loading={busy}>Save changes</Button>}
      </form>
    </Section>
  );
}

function InvoiceTab() {
  const { business, refresh, can, isOwner } = useAuth();
  const toast = useToast();
  const custom = can('customInvoice');
  const inv = business.invoice || {};
  const [f, setF] = useState({ prefix: inv.prefix || 'INV', footerNote: inv.footerNote || '', terms: inv.terms || '', accentColor: inv.accentColor || '#0B7A57' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: undefined })); };

  async function save(e) {
    e.preventDefault();
    if (custom && !/^[A-Za-z0-9]{1,8}$/.test(f.prefix)) return setErrors({ prefix: 'Use 1 to 8 letters or numbers' });
    setBusy(true);
    try { await api.put('/settings/invoice', f); await refresh(); toast.success('Invoice settings saved'); }
    catch (ex) { toast.error(ex.message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Section title="Invoice settings" desc="Every sale creates a simple invoice you can print or share.">
        <form onSubmit={save} className="space-y-4" noValidate>
          <Input label="Footer message" value={f.footerNote} onChange={set('footerNote')} maxLength={200} disabled={!isOwner} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Invoice number prefix" value={f.prefix} onChange={set('prefix')} error={errors.prefix} disabled={!custom || !isOwner} hint={custom ? `Next invoice: ${f.prefix.toUpperCase()}-${String(inv.nextNumber || 1).padStart(5, '0')}` : 'Pro plan'} />
            <div>
              <label htmlFor="accent" className="mb-1.5 block text-sm font-medium text-ink-soft">Invoice color</label>
              <input id="accent" type="color" value={f.accentColor} onChange={set('accentColor')} disabled={!custom || !isOwner} className="h-11 w-full cursor-pointer rounded-lg border border-line bg-white p-1 disabled:cursor-not-allowed disabled:opacity-50" />
              {!custom && <p className="mt-1.5 text-sm text-ink-mute">Pro plan</p>}
            </div>
          </div>
          <Textarea label="Terms (printed at the bottom)" rows={2} value={f.terms} onChange={set('terms')} maxLength={300} disabled={!custom || !isOwner} hint={custom ? undefined : 'Pro plan'} />
          {isOwner && <Button type="submit" loading={busy}>Save invoice settings</Button>}
        </form>
      </Section>
      {!custom && <div className="max-w-2xl"><PlanGate feature="customInvoice" inline /></div>}
    </div>
  );
}

function AccountTab() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user.name, phone: user.phone || '', currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: undefined })); };

  async function save(e) {
    e.preventDefault();
    const err = {};
    if (!f.name.trim()) err.name = 'Enter your name';
    if (f.phone && !isBDPhone(f.phone)) err.phone = 'Enter a valid mobile number, like 017XXXXXXXX';
    if (f.newPassword) {
      if (f.newPassword.length < 8) err.newPassword = 'Use at least 8 characters';
      if (!f.currentPassword) err.currentPassword = 'Enter your current password';
    }
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      const res = await api.put('/settings/account', f);
      if (res.token) setToken(res.token);
      await refresh();
      setF((s) => ({ ...s, currentPassword: '', newPassword: '' }));
      toast.success(res.token ? 'Saved. You were signed out of other devices.' : 'Account saved');
    } catch (ex) { if (ex.field) setErrors({ [ex.field]: ex.message }); else toast.error(ex.message); }
    finally { setBusy(false); }
  }

  return (
    <Section title="Your account">
      <form onSubmit={save} className="space-y-4" noValidate>
        <Input label="Name" value={f.name} onChange={set('name')} error={errors.name} />
        <div className="grid gap-4 sm:grid-cols-2"><Input label="Mobile number" value={f.phone} onChange={set('phone')} error={errors.phone} /><Input label="Email" value={user.email} disabled readOnly hint="Email cannot be changed" /></div>
        <div className="border-t border-line pt-4">
          <p className="mb-3 font-medium">Change password</p>
          <div className="grid gap-4 sm:grid-cols-2"><Input label="Current password" type="password" autoComplete="current-password" value={f.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} /><Input label="New password" type="password" autoComplete="new-password" value={f.newPassword} onChange={set('newPassword')} error={errors.newPassword} hint="At least 8 characters" /></div>
        </div>
        <Button type="submit" loading={busy}>Save account</Button>
      </form>
    </Section>
  );
}

const PLAN_TEXT = {
  free: ['Up to 100 products', 'Basic inventory and stock history', 'Sales, customers and baki tracking', 'Daily sales dashboard', 'Basic expenses', 'Simple invoices', 'Cash, bKash, Nagad and bank tracking'],
  pro: ['Everything in Free', 'Unlimited products', 'Advanced analytics', 'Profit and loss reports', 'Custom invoices', 'Up to 5 staff accounts', 'Supplier management', 'Low-stock alerts', 'Excel export and PDF printing', 'Backup download', 'AI business insights'],
  business: ['Everything in Pro', 'Multiple branches', 'Advanced staff roles', 'AI sales forecast', ['Branch-wise analytics', true], ['Advanced inventory', true], ['Advanced billing', true], ['Business notifications', true], 'Priority support'],
};

function SubscriptionTab() {
  const { plan, business, refresh, isOwner } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useQuery('/settings');
  const plans = useQuery('/settings/plans');
  const [busy, setBusy] = useState('');
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>;
  if (loading || plans.loading || !plans.data) return <Skeleton className="h-96" />;
  const usage = data.usage;

  async function choose(p) {
    const down = p.price < plan.price;
    const ok = await confirm({ title: `Switch to ${p.name}?`, message: down ? 'You will lose access to the paid features of your current plan. Your data is kept.' : `${p.name} costs ${bdt(p.price)} per month. Online payment is not connected in this version, so the plan changes right away for testing.`, confirmText: `Switch to ${p.name}`, cancelText: 'Not now', danger: down });
    if (!ok) return;
    setBusy(p.id);
    try { await api.post('/settings/subscription', { plan: p.id }); await refresh(); toast.success(`You are on the ${p.name} plan`); }
    catch (ex) { toast.error(ex.message); } finally { setBusy(''); }
  }

  return (
    <>
      <p className="mb-4 text-[15px] text-ink-soft">You are on the <strong>{plan.name}</strong> plan{business.planExpiresAt && plan.id !== 'free' ? `, renews ${fmtDate(business.planExpiresAt)}` : ''}. {usage.products} of {plan.productLimit ?? 'unlimited'} products used.</p>
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.data.data.map((p) => {
          const current = p.id === plan.id;
          return (
            <Card key={p.id} className={`flex flex-col p-5 ${current ? 'border-brand-600 ring-1 ring-brand-600' : ''}`}>
              <div className="flex items-center justify-between"><h3 className="text-xl font-bold">{p.name}</h3>{current && <Badge tone="brand">Current plan</Badge>}</div>
              <p className="mt-2"><span className="num font-display text-3xl font-bold">{p.price === 0 ? '৳0' : bdt(p.price)}</span><span className="text-ink-mute">{p.price ? ' / month' : ' forever'}</span></p>
              <ul className="mb-5 mt-4 flex-1 space-y-2.5">
                {PLAN_TEXT[p.id].map((t) => {
                  const [text, soon] = Array.isArray(t) ? t : [t, false];
                  return <li key={text} className="flex items-start gap-2 text-[15px]"><FiCheck className="mt-1 h-4 w-4 shrink-0 text-brand-600" aria-hidden /><span>{text}{soon && <Badge className="ml-2">Soon</Badge>}</span></li>;
                })}
              </ul>
              {isOwner && !current && <Button variant={p.price > plan.price ? 'primary' : 'secondary'} loading={busy === p.id} onClick={() => choose(p)}>{p.price > plan.price ? `Upgrade to ${p.name}` : `Switch to ${p.name}`}</Button>}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function NotificationsTab() {
  const { business, refresh, isOwner } = useAuth();
  const toast = useToast();
  const n = business.notifications || {};
  const { can } = useAuth();
  async function toggle(key, value) {
    try { await api.put('/settings/notifications', { ...n, [key]: value }); await refresh(); } catch (ex) { toast.error(ex.message); }
  }
  return (
    <Section title="Notifications" desc="Choose what HisabFlow tells you about.">
      <div className="divide-y divide-line">
        <Switch label="Low-stock alerts" description={can('lowStockAlerts') ? 'Show products that are running out under the bell icon.' : 'Available on the Pro plan.'} checked={n.lowStock !== false} disabled={!isOwner || !can('lowStockAlerts')} onChange={(v) => toggle('lowStock', v)} />
        <Switch label="Baki reminders" description="Remind me about customers who have not paid for a long time. Coming soon." checked={false} disabled onChange={() => {}} />
        <Switch label="Daily summary" description="A short summary of the day by SMS or email. Coming soon." checked={false} disabled onChange={() => {}} />
      </div>
    </Section>
  );
}

function TeamTab() {
  const { plan } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useAuth();
  const { data, loading, error, reload } = useQuery('/settings/team', {}, { enabled: can('staff') });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', role: 'staff' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: undefined })); };

  async function add(e) {
    e.preventDefault();
    const err = {};
    if (!f.name.trim()) err.name = 'Enter a name';
    if (!isEmail(f.email)) err.email = 'Enter a valid email address';
    if (f.phone && !isBDPhone(f.phone)) err.phone = 'Enter a valid mobile number';
    if (f.password.length < 8) err.password = 'Use at least 8 characters';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try { await api.post('/settings/team', f); toast.success('Team member added'); setOpen(false); setF({ name: '', email: '', phone: '', password: '', role: 'staff' }); reload(); }
    catch (ex) { if (ex.field) setErrors({ [ex.field]: ex.message }); else toast.error(ex.message); }
    finally { setBusy(false); }
  }

  async function setActive(u, active) {
    if (!active) {
      const ok = await confirm({ title: `Turn off ${u.name}?`, message: 'They will be signed out and cannot log in. Their past sales stay in your records. You can turn them on again any time.', confirmText: 'Turn off access', danger: true });
      if (!ok) return;
    }
    try { await api.patch(`/settings/team/${u.id}`, { active }); reload(); } catch (ex) { toast.error(ex.message); }
  }

  return (
    <PlanGate feature="staff">
      <Section title="Your team" desc="Staff can make sales and look up customers. They cannot see profit, expenses, suppliers or settings.">
        {error ? <ErrorState error={error} onRetry={reload} compact /> : loading && !data ? <Skeleton className="h-24" /> : (
          <>
            <ul className="divide-y divide-line/70 rounded-xl border border-line">
              {data.data.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0"><p className="truncate font-medium">{u.name} <Badge className="ml-1">{u.role}</Badge>{!u.active && <Badge tone="due" className="ml-1">Off</Badge>}</p><p className="truncate text-sm text-ink-mute">{u.email}</p></div>
                  {u.role !== 'owner' && <Button variant="secondary" size="sm" onClick={() => setActive(u, !u.active)}>{u.active ? 'Turn off' : 'Turn on'}</Button>}
                </li>
              ))}
            </ul>
            <Button className="mt-4" icon={FiPlus} onClick={() => setOpen(true)}>Add team member</Button>
            <p className="mt-2 text-sm text-ink-mute">{data.data.filter((u) => u.role !== 'owner' && u.active).length} of {data.limit} staff accounts used on the {plan.name} plan.</p>
          </>
        )}
      </Section>
      <Modal open={open} onClose={() => setOpen(false)} title="Add team member">
        <form onSubmit={add} className="space-y-4" noValidate>
          <Input label="Name" value={f.name} onChange={set('name')} error={errors.name} autoFocus />
          <Input label="Email (their login)" type="email" value={f.email} onChange={set('email')} error={errors.email} />
          <Input label="Mobile number" value={f.phone} onChange={set('phone')} error={errors.phone} hint="Optional" />
          <Input label="Password" type="password" value={f.password} onChange={set('password')} error={errors.password} autoComplete="new-password" hint="Share this with them. They can change it later." />
          {can('advancedRoles') && <Select label="Role" value={f.role} onChange={set('role')}><option value="staff">Staff: sales and customers only</option><option value="manager">Manager: everything except settings</option></Select>}
          <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" loading={busy}>Add member</Button></div>
        </form>
      </Modal>
    </PlanGate>
  );
}

function BranchesTab() {
  const { can } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useQuery('/settings/branches', {}, { enabled: can('branches') });
  const [form, setForm] = useState(null);
  const [f, setF] = useState({ name: '', address: '', phone: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (form) setF({ name: form.name || '', address: form.address || '', phone: form.phone || '' }); }, [form]);

  async function save(e) {
    e.preventDefault();
    if (!f.name.trim()) return toast.error('Enter the branch name');
    setBusy(true);
    try { if (form._id) await api.put(`/settings/branches/${form._id}`, f); else await api.post('/settings/branches', f); toast.success('Branch saved'); setForm(null); reload(); }
    catch (ex) { toast.error(ex.message); } finally { setBusy(false); }
  }
  async function remove(b) {
    const ok = await confirm({ title: `Remove ${b.name}?`, message: 'The branch is hidden from your list. Past records are kept.', confirmText: 'Remove branch', danger: true });
    if (!ok) return;
    try { await api.del(`/settings/branches/${b._id}`); reload(); } catch (ex) { toast.error(ex.message); }
  }

  return (
    <PlanGate feature="branches">
      <Section title="Branches" desc="Set up each shop location. Choosing a branch while selling and branch-wise reports are coming soon.">
        {error ? <ErrorState error={error} onRetry={reload} compact /> : loading && !data ? <Skeleton className="h-20" /> : data.data.length === 0 ? <Empty title="No branches yet" body="Add your shop locations here." /> : (
          <ul className="divide-y divide-line/70 rounded-xl border border-line">
            {data.data.map((b) => (
              <li key={b._id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0"><p className="truncate font-medium">{b.name}</p><p className="truncate text-sm text-ink-mute">{b.address || 'No address'}</p></div>
                <div className="flex gap-1"><Button variant="ghost" size="icon" icon={FiEdit2} onClick={() => setForm(b)} aria-label={`Edit ${b.name}`} /><Button variant="ghost" size="sm" className="text-due-600" onClick={() => remove(b)}>Remove</Button></div>
              </li>
            ))}
          </ul>
        )}
        <Button className="mt-4" icon={FiPlus} onClick={() => setForm({})}>Add branch</Button>
      </Section>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Edit branch' : 'Add branch'}>
        <form onSubmit={save} className="space-y-4" noValidate>
          <Input label="Branch name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
          <Input label="Address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
          <Input label="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button><Button type="submit" loading={busy}>Save branch</Button></div>
        </form>
      </Modal>
    </PlanGate>
  );
}

function DataTab() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function backup() {
    setBusy(true);
    try { await api.download('/settings/backup', {}, 'hisabflow-backup.json'); toast.success('Backup downloaded'); }
    catch (ex) { toast.error(ex.message); } finally { setBusy(false); }
  }
  return (
    <PlanGate feature="backup">
      <Section title="Backup" desc="Download a complete copy of your products, customers, sales, expenses and stock history. Keep it somewhere safe, like Google Drive.">
        <Button icon={FiDownload} loading={busy} onClick={backup}>Download backup</Button>
      </Section>
    </PlanGate>
  );
}

export default function Settings() {
  const { isOwner } = useAuth();
  const [sp, setSp] = useSearchParams();
  const tabs = TABS.filter((t) => !t.owner || isOwner);
  const tab = tabs.find((t) => t.id === sp.get('tab'))?.id || 'business';
  const View = { business: BusinessTab, invoice: InvoiceTab, account: AccountTab, subscription: SubscriptionTab, notifications: NotificationsTab, team: TeamTab, branches: BranchesTab, data: DataTab }[tab];

  return (
    <>
      <PageHeader title="Settings" />
      <div className="-mx-4 mb-5 overflow-x-auto px-4 scroll-thin" role="tablist" aria-label="Settings sections">
        <div className="flex w-max gap-1.5">
          {tabs.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setSp({ tab: t.id })}
              className={`h-10 whitespace-nowrap rounded-full border px-4 text-[15px] font-medium transition-colors ${tab === t.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-line bg-white text-ink-soft hover:bg-mist'}`}>{t.label}</button>
          ))}
        </div>
      </div>
      <View />
    </>
  );
}
