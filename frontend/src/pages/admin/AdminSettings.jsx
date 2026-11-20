import { useState } from 'react';
import { Mail, Save } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import ProfileForm from '../../components/shared/ProfileForm';
import { Input, Select, Toggle } from '../../components/ui/Field';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';

export default function AdminSettings() {
  const data = useData();
  const toast = useToast();
  const [s, setS] = useState(data.db.settings);

  return (
    <>
      <PageHeader title="Settings" subtitle="Business details and appointment reminders." />
      <div className="grid gap-6 lg:grid-cols-2">
        <form className="card space-y-4 p-5 sm:p-6" onSubmit={(e) => { e.preventDefault(); data.updateSettings(s).then((ok) => ok && toast('Settings saved.')); }}>
          <h2 className="text-xl font-semibold">Business details</h2>
          <Input label="Business name" value={s.businessName} onChange={(e) => setS({ ...s, businessName: e.target.value })} />
          <div className="grid gap-4 sm:grid-cols-2"><Input label="Email" value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} /><Input label="Phone" value={s.phone} onChange={(e) => setS({ ...s, phone: e.target.value })} /></div>
          <Input label="Address" value={s.address} onChange={(e) => setS({ ...s, address: e.target.value })} />
          <Input label="Working hours" value={s.hours} onChange={(e) => setS({ ...s, hours: e.target.value })} />
          <div className="space-y-4 rounded-xl border border-line p-4">
            <p className="text-sm font-bold">Appointment reminders</p>
            <Toggle label="Email reminders" checked={s.emailReminders} onChange={(v) => setS({ ...s, emailReminders: v })} />
            <Select label="Send reminder before" value={s.reminderLeadHours} onChange={(e) => setS({ ...s, reminderLeadHours: Number(e.target.value) })} options={[{ value: 2, label: '2 hours' }, { value: 24, label: '24 hours' }, { value: 48, label: '48 hours' }]} />
          </div>
          <button className="btn btn-primary" type="submit"><Save size={17} /> Save settings</button>
        </form>

        <div className="card h-fit space-y-3 p-5 sm:p-6">
          <h2 className="text-xl font-semibold">How reminders work</h2>
          <p className="flex items-start gap-3 text-sm text-muted"><Mail size={18} className="mt-0.5 shrink-0 text-brand" /> Email reminders go to the customer and the staff member before every confirmed appointment and scheduled site visit.</p>
          <p className="text-sm text-muted">Everyone also sees the reminder in their notification bell. Unpaid consultation fees get a gentle email nudge every two days.</p>
        </div>
      </div>
      <div className="mt-10 border-t border-line pt-8"><ProfileForm /></div>
    </>
  );
}
