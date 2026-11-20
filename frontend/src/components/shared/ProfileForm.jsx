import { useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import Avatar from '../ui/Avatar';
import { Input, Textarea, Toggle } from '../ui/Field';
import { WEEKDAYS } from '../../lib/constants';
import { cn, passwordProblem } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import MyDataCard from './MyDataCard';
import { ROLES } from '../../lib/constants';

export default function ProfileForm() {
  const { user, changePassword } = useAuth();
  const data = useData();
  const toast = useToast();
  const [f, setF] = useState({
    name: user.name, phone: user.phone, city: user.city || '', address: user.address || '',
    bio: user.bio || '', workingDays: user.workingDays || [1, 2, 3, 4, 5], workHours: user.workHours || '9:30 AM - 6:30 PM', specialization: user.specialization || '', experience: user.experience || '',
    prefs: user.prefs || { email: true },
  });
  const [pw, setPw] = useState({ current: '', next: '' });
  const [pwErr, setPwErr] = useState('');
  const staff = user.role === 'agent' || user.role === 'consultant';

  const save = async (e) => {
    e.preventDefault();
    const rec = await data.update('users', user.id, { ...f, experience: Number(f.experience) || 0 });
    if (rec) toast('Profile saved.');
  };

  const changePw = async (e) => {
    e.preventDefault();
    const problem = passwordProblem(pw.next);
    if (problem) return setPwErr(problem);
    const res = await changePassword(pw.current, pw.next);
    if (!res.ok) return setPwErr(res.error);
    setPw({ current: '', next: '' });
    setPwErr('');
    toast('Password updated. A confirmation was emailed to you.');
  };

  return (
    <>
      <PageHeader title="Profile" subtitle="Manage your contact information and notification preferences." />
      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={save} className="card space-y-5 p-5 sm:p-6 lg:col-span-2">
          <div className="flex items-center gap-4">
            <Avatar name={f.name} size="xl" />
            <div>
              <p className="font-display text-xl font-semibold">{user.name}</p>
              <p className="text-sm text-muted">{ROLES[user.role].label} · {user.email}</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
            <Input label="Phone" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <Input label="City" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
            <Input label="Email" value={user.email} disabled hint="Email is your login and cannot be changed here." />
            <Input wrapperClass="sm:col-span-2" label="Address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
            {staff && (
              <>
                {user.role === 'consultant' && <Input label="Specialization" value={f.specialization} onChange={(e) => setF({ ...f, specialization: e.target.value })} />}
                <Input label="Experience (years)" type="number" min="0" value={f.experience} onChange={(e) => setF({ ...f, experience: e.target.value })} />
                <Textarea wrapperClass="sm:col-span-2" label="About" rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
                {user.role === 'agent' && (
                  <div className="sm:col-span-2">
                    <span className="label">Working days and hours</span>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {WEEKDAYS.map((d, i) => (
                        <button type="button" key={d} aria-pressed={f.workingDays.includes(i)} onClick={() => setF({ ...f, workingDays: f.workingDays.includes(i) ? f.workingDays.filter((x) => x !== i) : [...f.workingDays, i].sort() })} className={cn('chip', f.workingDays.includes(i) && 'chip-active')}>{d}</button>
                      ))}
                    </div>
                    <Input value={f.workHours} onChange={(e) => setF({ ...f, workHours: e.target.value })} placeholder="e.g. 9:30 AM - 6:30 PM" />
                  </div>
                )}
              </>
            )}
          </div>
          <div className="space-y-4 rounded-xl border border-line p-4">
            <p className="text-sm font-bold">Email notifications</p>
            <Toggle label="Email reminders" description="Appointment reminders and follow-up updates by email" checked={f.prefs.email} onChange={(v) => setF({ ...f, prefs: { ...f.prefs, email: v } })} />
            <p className="text-xs text-muted">Important updates (payments, confirmations, OTP codes) are always emailed. This switch controls reminders and other optional emails.</p>
          </div>
          <button className="btn btn-primary" type="submit"><Save size={17} /> Save profile</button>
        </form>

        <form onSubmit={changePw} className="card h-fit space-y-4 p-5 sm:p-6">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold"><KeyRound size={19} className="text-brand" /> Change password</h3>
          <Input label="Current password" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
          <Input label="New password" type="password" hint="8+ characters with a letter and a number." value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} error={pwErr} />
          <button className="btn btn-outline w-full" type="submit" disabled={!pw.current || !pw.next}>Update password</button>
        </form>
      </div>
      {user.role === 'customer' && <MyDataCard />}
    </>
  );
}
