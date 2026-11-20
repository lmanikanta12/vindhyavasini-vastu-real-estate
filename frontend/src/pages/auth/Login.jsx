import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import AuthShell from './AuthShell';
import { Input } from '../../components/ui/Field';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ROLES } from '../../lib/constants';

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from;
  const [f, setF] = useState({ email: loc.state?.email || '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from && user.role === 'customer' ? from : ROLES[user.role].home} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const res = await login(f.email, f.password);
    setBusy(false);
    if (res.ok) {
      toast(`Welcome back, ${res.user.name.split(' ')[0]}.`);
      navigate(from && res.user.role === 'customer' ? from : ROLES[res.user.role].home, { replace: true });
    } else if (res.code === 'EMAIL_NOT_VERIFIED') {
      toast('Please verify your email first. We sent you a code.', 'info');
      navigate('/verify-email', { state: { email: f.email.trim().toLowerCase(), from } });
    } else setError(res.error);
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to manage your properties, enquiries and consultations." footer={<>New to Vindhyavasini Vastu and Real Estate? <Link to="/register" state={{ from }} className="font-bold text-brand hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Input label="Email" type="email" autoComplete="email" value={f.email} onChange={(e) => { setF({ ...f, email: e.target.value }); setError(''); }} required />
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="pw">Password</label>
            <Link to="/forgot-password" state={{ email: f.email }} className="mb-1.5 text-xs font-bold text-brand hover:underline">Forgot password?</Link>
          </div>
          <div className="relative">
            <input id="pw" className="input pr-11" type={show ? 'text' : 'password'} autoComplete="current-password" value={f.password} onChange={(e) => { setF({ ...f, password: e.target.value }); setError(''); }} required />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        {error && <p className="animate-fade-in rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400" role="alert">{error}</p>}
        <button className="btn btn-primary w-full py-3" type="submit" disabled={busy || !f.email || !f.password}>
          {busy ? <><Loader2 size={18} className="animate-spin" /> Logging in</> : 'Log in'}
        </button>
      </form>
    </AuthShell>
  );
}
