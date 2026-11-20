import { useEffect, useState } from 'react';
import { CalendarCheck } from 'lucide-react';
import Modal from '../ui/Modal';
import { Input, Select, Textarea } from '../ui/Field';
import LoginPrompt from '../shared/LoginPrompt';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import useVisitSlots from '../../hooks/useVisitSlots';
import { addDays, fmtDate, fmtTime } from '../../lib/utils';

export default function SiteVisitModal({ open, onClose, property }) {
  const { user } = useAuth();
  const data = useData();
  const toast = useToast();
  const [form, setForm] = useState({ date: addDays(1), time: '', note: '' });
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (open) {
      setDone(null);
      setForm({ date: addDays(1), time: '', note: '' });
    }
  }, [open]);

  const isCustomer = user?.role === 'customer';
  const av = useVisitSlots({ propertyId: property?.id, date: form.date, enabled: open && isCustomer && !done });

  useEffect(() => {
    if (av.loaded) setForm((f) => (av.slots.includes(f.time) ? f : { ...f, time: av.slots[0] || '' }));
  }, [av.slots, av.loaded]);

  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const rec = await data.add('siteVisits', { propertyId: property.id, date: form.date, time: form.time, note: form.note.trim() });
    setBusy(false);
    if (!rec) return;
    setDone(rec);
    toast('Site visit requested. The agent will confirm it shortly.');
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={done ? 'Site visit requested' : 'Request a site visit'}
      subtitle={!done && property ? property.title : undefined}
      footer={
        done || !isCustomer ? (
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        ) : (
          <>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" form="visit-form" className="btn btn-primary" disabled={!form.time || av.loading}>Request visit</button>
          </>
        )
      }
    >
      {!user && <LoginPrompt message="Log in to request a site visit and track it from your dashboard." />}
      {user && !isCustomer && <LoginPrompt staff />}
      {isCustomer && done && (
        <div className="flex flex-col items-center py-6 text-center">
          <span className="mb-4 flex h-16 w-16 animate-scale-in items-center justify-center rounded-full bg-air/25 text-air"><CalendarCheck size={32} /></span>
          <p className="font-display text-xl font-semibold">{fmtDate(done.date)} at {fmtTime(done.time)}</p>
          <p className="mt-2 max-w-sm text-sm text-muted">Reference <b className="text-ink">{done.ref}</b>. The agent will confirm the visit. You can reschedule from My appointments.</p>
        </div>
      )}
      {isCustomer && !done && (
        <form id="visit-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Input label="Preferred date" type="date" min={addDays(1)} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          <Select label="Preferred time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder={av.loading ? 'Checking availability...' : 'No time available'} options={av.slots.map((t) => ({ value: t, label: fmtTime(t) }))} hint={av.agent ? `Times when ${av.agent} is available` : undefined} />
          {av.loaded && !av.loading && av.slots.length === 0 && <p className="sm:col-span-2 text-sm font-semibold text-brand" role="status">{av.reason || 'No free visit times on this date. Please pick another day.'}</p>}
          <Textarea wrapperClass="sm:col-span-2" label="Note for the agent" hint="Optional: number of visitors, access needs" rows={3} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </form>
      )}
    </Modal>
  );
}
