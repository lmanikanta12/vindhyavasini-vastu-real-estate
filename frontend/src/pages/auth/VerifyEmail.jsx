import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import AuthShell from './AuthShell';
import OtpInput from '../../components/ui/OtpInput';
import useCountdown from '../../hooks/useCountdown';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ROLES } from '../../lib/constants';

export default function VerifyEmail() {
  const { user, verifyEmail, resendOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const loc = useLocation();
  const { email, from, fresh } = loc.state || {};
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [left, restart] = useCountdown(fresh ? 60 : 0);

  useEffect(() => { if (otp.length === 6) submit();  }, [otp]);

  if (user) return <Navigate to={ROLES[user.role].home} replace />;
  if (!email) return <Navigate to="/register" replace />;

  async function submit() {
    if (busy || otp.length !== 6) return;
    setBusy(true);
    const res = await verifyEmail(email, otp);
    setBusy(false);
    if (res.ok) {
      toast(`Email verified. Welcome, ${res.user.name.split(' ')[0]}.`);
      navigate(from || ROLES.customer.home, { replace: true });
    } else {
      setError(res.error);
      setOtp('');
    }
  }

  const resend = async () => {
    const res = await resendOtp(email, 'verify');
    if (res.ok) { toast('A new code is on its way.', 'info'); restart(res.resendAfterSeconds || 60); setError(''); setOtp(''); }
    else { setError(res.error); if (res.data?.retryAfter) restart(res.data.retryAfter); }
  };

  return (
    <AuthShell title="Check your email" subtitle={<>We sent a 6-digit code to <b className="text-ink">{email}</b>. It works for 10 minutes.</>} footer={<>Wrong email? <Link to="/register" className="font-bold text-brand hover:underline">Start again</Link></>}>
      <div className="space-y-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"><MailCheck size={26} /></span>
        <OtpInput value={otp} onChange={(v) => { setOtp(v); setError(''); }} error={!!error} disabled={busy} />
        {error && <p className="animate-fade-in rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600 dark:text-red-400" role="alert">{error}</p>}
        <button className="btn btn-primary w-full py-3" onClick={submit} disabled={busy || otp.length !== 6}>
          {busy ? <><Loader2 size={18} className="animate-spin" /> Verifying</> : 'Verify and continue'}
        </button>
        <p className="text-center text-sm text-muted">
          Did not get it?{' '}
          <button className="font-bold text-brand hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline" onClick={resend} disabled={left > 0}>
            {left > 0 ? `Resend code in ${left}s` : 'Resend code'}
          </button>
        </p>
        <p className="text-center text-xs text-muted">Check your spam folder too.</p>
      </div>
    </AuthShell>
  );
}
