import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthShell from './AuthShell';
import { Input } from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ROLES } from '../../lib/constants';
import { passwordProblem } from '../../lib/utils';

export default function Register() {
  const { user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const from = useLocation().state?.from;
  const [f, setF] = useState({ name: '', email: '', phone: '', password: '', confirm: '', accept: false });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={ROLES[user.role].home} replace />;

  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    const err = {};
    if (f.name.trim().length < 2) err.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) err.email = 'Enter a valid email address.';
    if (f.phone.replace(/\D/g, '').length < 10) err.phone = 'Enter a valid phone number.';
    const pw = passwordProblem(f.password);
    if (pw) err.password = pw;
    if (f.confirm !== f.password) err.confirm = 'Passwords do not match.';
    if (!f.accept) err.accept = 'Please accept the Terms, Privacy Policy and Disclaimer to continue.';
    setErrors(err);
    if (Object.keys(err).length) return;
    setBusy(true);
    const res = await register(f);
    setBusy(false);
    if (!res.ok) return setErrors({ email: res.error });
    toast('We sent a 6-digit code to your email.', 'info');
    navigate('/verify-email', { state: { email: res.email, from, fresh: true } });
  };

  return (
    <AuthShell title="Create your account" subtitle="Shortlist properties, request visits and book Vastu consultations." footer={<>Already registered? <Link to="/login" state={{ from }} className="font-bold text-brand hover:underline">Log in</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Full name" autoComplete="name" value={f.name} onChange={set('name')} error={errors.name} required />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Email" type="email" autoComplete="email" value={f.email} onChange={set('email')} error={errors.email} required />
          <Input label="Phone" type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} error={errors.phone} required />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Password" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} error={errors.password} hint="8+ characters with a letter and a number." required />
          <Input label="Confirm password" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} error={errors.confirm} required />
        </div>
        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <input type="checkbox" className="mt-0.5 h-4.5 w-4.5 shrink-0 accent-[rgb(var(--c-brand))]" checked={f.accept} onChange={(e) => setF((x) => ({ ...x, accept: e.target.checked }))} aria-describedby={errors.accept ? 'accept-err' : undefined} aria-invalid={!!errors.accept} />
            <span>I agree to the <Link to="/terms" target="_blank" className="font-bold text-brand underline">Terms &amp; Conditions</Link> and <Link to="/privacy" target="_blank" className="font-bold text-brand underline">Privacy Policy</Link>, and I have read the <Link to="/disclaimer" target="_blank" className="font-bold text-brand underline">Disclaimer</Link> that Vastu guidance is not a guarantee of any result.</span>
          </label>
          {errors.accept && <p id="accept-err" className="mt-1.5 text-xs font-semibold text-red-600 dark:text-red-400">{errors.accept}</p>}
        </div>
        <button className="btn btn-primary w-full py-3" type="submit" disabled={busy}>
          {busy ? <><Loader2 size={18} className="animate-spin" /> Sending code</> : 'Create account'}
        </button>
        <p className="text-center text-xs text-muted">We will email you a 6-digit code to confirm your address.</p>
      </form>
    </AuthShell>
  );
}
