import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/FeedbackContext.jsx';
import { isEmail } from '../lib/validators.js';
import { Button, Input } from '../components/ui.jsx';
import AuthLayout from '../components/AuthLayout.jsx';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const from = useLocation().state?.from || '/';
  const [f, setF] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((s) => ({ ...s, [k]: undefined, form: undefined })); };

  async function submit(e) {
    e.preventDefault();
    const err = {};
    if (!isEmail(f.email)) err.email = 'Enter a valid email address';
    if (!f.password) err.password = 'Enter your password';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    try {
      await login(f.email.trim(), f.password);
      nav(from, { replace: true });
    } catch (ex) {
      if (ex.field) setErrors({ [ex.field]: ex.message });
      else setErrors({ form: ex.message });
      if (ex.code === 'NETWORK') toast.error(ex.message);
    } finally { setBusy(false); }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to see today's hisab.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {errors.form && <div className="rounded-lg bg-due-50 px-3.5 py-3 text-sm text-due-700" role="alert">{errors.form}</div>}
        <Input label="Email" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set('email')} error={errors.email} />
        <Input label="Password" type="password" autoComplete="current-password" value={f.password} onChange={set('password')} error={errors.password} />
        <Button type="submit" size="lg" className="w-full" loading={busy}>Log in</Button>
        {import.meta.env.DEV && (
          <button type="button" className="w-full text-center text-sm text-ink-mute hover:text-brand-700" onClick={() => setF({ email: 'demo@hisabflow.app', password: 'demo1234' })}>
            Fill demo login (run <code>npm run seed</code> first)
          </button>
        )}
      </form>
      <p className="mt-6 text-center text-[15px] text-ink-mute">New to HisabFlow? <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create a free account</Link></p>
    </AuthLayout>
  );
}
