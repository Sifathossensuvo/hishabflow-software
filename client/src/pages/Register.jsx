import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/FeedbackContext.jsx';
import { isBDPhone, isEmail } from '../lib/validators.js';
import { Button, Input } from '../components/ui.jsx';
import AuthLayout from '../components/AuthLayout.jsx';

export default function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({ businessName: '', name: '', phone: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: undefined, form: undefined })); };

  async function submit(e) {
    e.preventDefault();
    const err = {};
    if (!f.businessName.trim()) err.businessName = 'Enter your shop or business name';
    if (!f.name.trim()) err.name = 'Enter your name';
    if (f.phone && !isBDPhone(f.phone)) err.phone = 'Enter a valid mobile number, like 017XXXXXXXX';
    if (!isEmail(f.email)) err.email = 'Enter a valid email address';
    if (f.password.length < 8) err.password = 'Use at least 8 characters';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      await register({ ...f, businessName: f.businessName.trim(), name: f.name.trim(), email: f.email.trim() });
      toast.success('Your account is ready. Add your first product to begin.');
      nav('/products', { replace: true });
    } catch (ex) {
      if (ex.field) setErrors({ [ex.field]: ex.message });
      else setErrors({ form: ex.message });
    } finally { setBusy(false); }
  }

  return (
    <AuthLayout title="Create your free account" subtitle="It takes about a minute.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.form && <div className="rounded-lg bg-due-50 px-3.5 py-3 text-sm text-due-700" role="alert">{errors.form}</div>}
        <Input label="Shop / business name" value={f.businessName} onChange={set('businessName')} error={errors.businessName} autoComplete="organization" required />
        <Input label="Your name" value={f.name} onChange={set('name')} error={errors.name} autoComplete="name" required />
        <Input label="Mobile number" type="tel" inputMode="tel" placeholder="017XXXXXXXX" value={f.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel" hint="Optional" />
        <Input label="Email" type="email" inputMode="email" value={f.email} onChange={set('email')} error={errors.email} autoComplete="email" required />
        <Input label="Password" type="password" value={f.password} onChange={set('password')} error={errors.password} autoComplete="new-password" hint="At least 8 characters" required />
        <Button type="submit" size="lg" className="w-full" loading={busy}>Create account</Button>
      </form>
      <p className="mt-6 text-center text-[15px] text-ink-mute">Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link></p>
    </AuthLayout>
  );
}
