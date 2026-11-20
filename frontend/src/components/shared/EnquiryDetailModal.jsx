import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Mail, MessageSquarePlus, Phone } from 'lucide-react';
import Modal from '../ui/Modal';
import { StatusBadge } from '../ui/Badge';
import { Input, Select, Textarea } from '../ui/Field';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { ENQUIRY_STATUSES } from '../../lib/constants';
import useVisitSlots from '../../hooks/useVisitSlots';
import { addDays, fmtDate, fmtTime } from '../../lib/utils';

export default function EnquiryDetailModal({ enquiryId, onClose, canAssign = false }) {
  const { user } = useAuth();
  const data = useData();
  const toast = useToast();
  const e = data.enquiry(enquiryId);
  const [note, setNote] = useState('');
  const [priv, setPriv] = useState(false);
  const [visit, setVisit] = useState({ open: false, date: addDays(2), time: '' });
  const visitAgent = e?.assignedTo || user.id;
  const av = useVisitSlots({ agentId: visitAgent, date: visit.date, enabled: !!e && visit.open });
  useEffect(() => {
    if (av.loaded) setVisit((v) => (av.slots.includes(v.time) ? v : { ...v, time: av.slots[0] || '' }));
  }, [av.slots, av.loaded]);

  if (!e) return null;
  const property = data.property(e.propertyId);
  const agents = data.usersByRole('agent');

  const addNote = async () => {
    if (!note.trim()) return;
    if (!(await data.addEnquiryNote(e.id, note.trim(), priv))) return;
    setNote('');
    setPriv(false);
    toast('Follow-up note saved.');
  };

  const scheduleVisit = async () => {

    const rec = await data.add('siteVisits', {
      propertyId: e.propertyId,
      enquiryId: e.id,
      customerId: e.customerId,
      agentId: e.assignedTo || user.id,
      date: visit.date,
      time: visit.time,
      note: `From enquiry ${e.ref}${e.customerId ? '' : ` (${e.contact.name})`}`,
    });
    if (!rec) return;
    setVisit((v) => ({ ...v, open: false }));
    toast('Site visit scheduled and the customer was notified.');
  };

  return (
    <Modal open onClose={onClose} size="lg" title={e.contact.name} subtitle={`${e.ref} · received ${fmtDate(e.createdAt)}`} footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <a className="inline-flex items-center gap-2 font-semibold hover:text-brand" href={`tel:${e.contact.phone}`}><Phone size={16} className="text-brand" /> {e.contact.phone}</a>
            <a className="inline-flex items-center gap-2 font-semibold hover:text-brand" href={`mailto:${e.contact.email}`}><Mail size={16} className="text-brand" /> {e.contact.email}</a>
          </div>

          <div className="rounded-xl border border-line bg-sunken/50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Property</p>
            {property ? (
              <Link to={`/properties/${property.id}`} className="mt-1 block font-display text-lg font-semibold hover:text-brand">{property.title}</Link>
            ) : (
              <p className="mt-1 font-semibold">General enquiry</p>
            )}
            {property && <p className="text-sm text-muted">{property.location}, {property.city} · {property.ref}</p>}
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Message</p>
            <p className="mt-1 text-sm leading-relaxed">{e.message}</p>
          </div>
          {e.requirements && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Customer requirements</p>
              <p className="mt-1 text-sm leading-relaxed">{e.requirements}</p>
            </div>
          )}

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Follow-up notes</p>
            {e.notes.length === 0 && <p className="text-sm text-muted">No notes yet.</p>}
            <ol className="space-y-3 border-l-2 border-line pl-4">
              {e.notes.map((n) => (
                <li key={n.id} className="relative">
                  <span className="absolute -left-[22px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand" />
                  <p className="text-sm">{n.text}</p>
                  <p className="text-xs text-muted">{n.by} · {fmtDate(n.at)}{n.private && <span className="ml-2 rounded-full bg-sunken px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink">Private</span>}</p>
                </li>
              ))}
            </ol>
            <div className="mt-4 flex gap-2">
              <Textarea wrapperClass="flex-1" rows={2} placeholder="Add a follow-up note..." value={note} onChange={(ev) => setNote(ev.target.value)} />
              <button className="btn btn-outline self-end" onClick={addNote} disabled={!note.trim()}><MessageSquarePlus size={17} /> Add</button>
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={priv} onChange={(ev) => setPriv(ev.target.checked)} /> Private, staff only (the customer will not see this note)
            </label>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="card space-y-4 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Status</span>
              <StatusBadge status={e.status} />
            </div>
            <Select label="Update status" value={e.status} onChange={(ev) => { data.update('enquiries', e.id, { status: ev.target.value }).then((ok) => ok && toast('Status updated.')); }} options={ENQUIRY_STATUSES} />
            {canAssign ? (
              <Select label="Assigned to" value={e.assignedTo || ''} placeholder="Unassigned" onChange={(ev) => { data.update('enquiries', e.id, { assignedTo: ev.target.value || null }).then((ok) => ok && toast('Enquiry assigned.')); }} options={agents.map((a) => ({ value: a.id, label: a.name }))} />
            ) : (
              <p className="text-sm text-muted">Assigned to <b className="text-ink">{data.user(e.assignedTo)?.name || 'Unassigned'}</b></p>
            )}
          </div>

          {property && (
            <div className="card p-4">
              {!visit.open ? (
                <button className="btn btn-outline w-full" onClick={() => setVisit((v) => ({ ...v, open: true }))}><CalendarPlus size={17} /> Schedule site visit</button>
              ) : (
                <div className="space-y-3">
                  <Input label="Visit date" type="date" min={addDays(0)} value={visit.date} onChange={(ev) => setVisit({ ...visit, date: ev.target.value })} />
                  <Select label="Time" value={visit.time} onChange={(ev) => setVisit({ ...visit, time: ev.target.value })} placeholder={av.loading ? 'Checking availability...' : 'No time available'} options={av.slots.map((t) => ({ value: t, label: fmtTime(t) }))} hint={av.agent ? `Times when ${av.agent} is available` : undefined} />
                  {av.loaded && !av.loading && av.slots.length === 0 && <p className="text-sm font-semibold text-brand" role="status">{av.reason || 'No free visit times on this date. Please pick another day.'}</p>}
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm flex-1" onClick={() => setVisit({ ...visit, open: false })}>Cancel</button>
                    <button className="btn btn-primary btn-sm flex-1" onClick={scheduleVisit} disabled={!visit.time}>Confirm</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
