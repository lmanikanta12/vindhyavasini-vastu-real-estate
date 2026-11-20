import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Check, KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import AuthShell from './AuthShell';
import { Input } from '../../components/ui/Field';
import OtpInput from '../../components/ui/OtpInput';
import useCountdown from '../../hooks/useCountdown';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ROLES } from '../../lib/constants';
import { cn, passwordProblem } from '../../lib/utils';

const STEPS = [['Email', Mail], ['Code', ShieldCheck], ['New password', KeyRound]];

export default function ForgotPassword() {
  const { user, forgotPassword, verifyResetOtp, resetPassword, resendOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(useLocation().state?.email || '');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, restart] = useCountdown(0);

  if (user) return <Navigate to={ROLES[user.role].home} replace />;

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError('');
    await fn();
    setBusy(false);
  };

  const sendCode = (e) => {
    e?.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Enter a valid email address.');
    run(async () => {
      const res = await forgotPassword(email.trim());
      if (!res.ok) return setError(res.error);
      toast('If this email is registered, a 6-digit code is on its way.', 'info');
      restart(res.resendAfterSeconds || 60);
      setOtp('');
      setStep(1);
    });
  };

  const checkCode = () => {
    if (otp.length !== 6) return;
    run(async () => {
      const res = await verifyResetOtp(email.trim(), otp);
      if (!res.ok) { setOtp(''); return setError(res.error); }
      setResetToken(res.resetToken);
      setStep(2);
    });
  };

  const resend = async () => {
    setError('');
    const res = await resendOtp(email.trim(), 'reset');
    if (res.ok) { toast('A new code is on its way.', 'info'); restart(res.resendAfterSeconds || 60); setOtp(''); }
    else { setError(res.error); if (res.data?.retryAfter) restart(res.data.retryAfter); }
  };

  const savePassword = (e) => {
    e.preventDefault();
    const p = passwordProblem(pw.next);
    if (p) return setError(p);
    if (pw.next !== pw.confirm) return setError('Passwords do not match.');
    run(async () => {
      const res = await resetPassword(resetToken, pw.next);
      if (!res.ok) {
        setError(res.error);
        if (res.code === 'RESET_EXPIRED') setStep(0);
        return;
      }
      toast('Password updated. Please log in.');
      navigate('/login', { replace: true, state: { email: email.trim() } });
    });
  };

  const titles = [
    ['Forgot your password?', 'Enter your email and we will send you a 6-digit code.'],
    ['Enter the code', <>We sent a code to <b className="text-ink">{email}</b>. It works for 10 minutes.</>],
    ['Choose a new password', 'Pick something you have not used before.'],
  ];

  return (
    <AuthShell title={titles[step][0]} subtitle={titles[step][1]} footer={<>Remembered it? <Link to="/login" className="font-bold text-brand hover:underline">Back to log in</Link></>}>
      <ol className="mb-7 flex items-center gap-2" aria-label="Progress">
        {STEPS.map(([label, Icon], i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors', i < step ? 'border-brand bg-brand text-on-brand' : i === step ? 'border-brand text-brand' : 'border-line text-muted')}>
              {i < step ? <Check size={17} /> : <Icon size={16} />}
            </span>
            <span className={cn('hidden text-xs font-bold sm:block', i <= step ? 'text-ink' : 'text-muted')}>{label}</span>
            {i < 2 && <span className={cn('h-0.5 flex-1 rounded transition-colors', i < step ? 'bg-brand' : 'bg-line')} />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <form onSubmit={sendCode} className="space-y-4" noValidate>
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(''); }} error={error} required />
          <button className="btn btn-primary w-full py-3" type="submit" disabled={busy || !email}>
            {busy ? <><Loader2 size={18} className="animate-spin" /> Sending</> : 'Send code'}
          </button>
        </form>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <OtpInput value={otp} onChange={(v) => { setOtp(v); setError(''); if (v.length === 6) setTimeout(() => document.getElementById('check-code')?.click(), 50); }} error={!!error} disabled={busy} />
          {error && <p className="animate-fade-in rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400" role="alert">{error}</p>}
          <button id="check-code" className="btn btn-primary w-full py-3" onClick={checkCode} disabled={busy || otp.length !== 6}>
            {busy ? <><Loader2 size={18} className="animate-spin" /> Checking</> : 'Verify code'}
          </button>
          <p className="text-center text-sm text-muted">
            Did not get it?{' '}
            <button className="font-bold text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline" onClick={resend} disabled={left > 0}>
              {left > 0 ? `Resend code in ${left}s` : 'Resend code'}
            </button>
          </p>
          <button className="mx-auto block text-xs font-bold text-muted hover:text-brand" onClick={() => { setStep(0); setError(''); }}>Use a different email</button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={savePassword} className="space-y-4" noValidate>
          <Input label="New password" type="password" autoComplete="new-password" value={pw.next} onChange={(e) => { setPw({ ...pw, next: e.target.value }); setError(''); }} hint="8+ characters with a letter and a number." required />
          <Input label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => { setPw({ ...pw, confirm: e.target.value }); setError(''); }} error={error} required />
          <button className="btn btn-primary w-full py-3" type="submit" disabled={busy || !pw.next || !pw.confirm}>
            {busy ? <><Loader2 size={18} className="animate-spin" /> Saving</> : 'Update password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
