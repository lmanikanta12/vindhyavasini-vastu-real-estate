import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CalendarDays, Eye, MapPin, Sparkles, Star, XCircle } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Tabs from '../../components/ui/Tabs';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import RescheduleModal from '../../components/shared/RescheduleModal';
import ConsultationDetailModal from '../../components/shared/ConsultationDetailModal';
import ReviewModal from '../../components/shared/ReviewModal';
import { Stars } from '../../components/ui/Stars';
import { api } from '../../lib/api';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { fmtDate, fmtTime, isUpcoming, money, sortByDateAsc } from '../../lib/utils';

export default function CustomerAppointments() {
  const { user } = useAuth();
  const data = useData();
  const toast = useToast();
  const [kind, setKind] = useState('visits');
  const [when, setWhen] = useState('upcoming');
  const [resched, setResched] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [rate, setRate] = useState(null);
  const [reviewed, setReviewed] = useState({});

  useEffect(() => {
    api('/reviews/mine').then((r) => setReviewed(Object.fromEntries(r.items.map((x) => [`${x.kind}:${x.bookingId}`, x.rating])))).catch(() => {});
  }, []);

  const visits = data.db.siteVisits.filter((v) => v.customerId === user.id);
  const consults = data.db.consultations.filter((c) => c.customerId === user.id);
  const base = kind === 'visits' ? visits : consults;
  const isActive = (a) => !['Cancelled', 'Completed'].includes(a.status) && isUpcoming(a.date, a.time);
  const list = base.filter((a) => (when === 'all' ? true : when === 'upcoming' ? isActive(a) : !isActive(a))).sort((a, b) => (when === 'upcoming' ? sortByDateAsc(a, b) : sortByDateAsc(b, a)));
  const coll = kind === 'visits' ? 'siteVisits' : 'consultations';

  return (
    <>
      <PageHeader title="Appointments" subtitle="Your site visits and Vastu consultations. Reschedule or cancel before the appointment." actions={<Link to="/vastu/book" className="btn btn-primary btn-sm"><Sparkles size={16} /> Book Vastu</Link>} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={kind} onChange={setKind} items={[{ key: 'visits', label: 'Site visits', count: visits.length }, { key: 'consults', label: 'Vastu consultations', count: consults.length }]} />
        <Tabs value={when} onChange={setWhen} items={[{ key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }, { key: 'all', label: 'All' }]} />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No appointments" message={kind === 'visits' ? 'Request a visit from any property page.' : 'Book a consultation with one of our Vastu experts.'} action={<Link to={kind === 'visits' ? '/properties' : '/vastu/book'} className="btn btn-primary btn-sm">{kind === 'visits' ? 'Browse properties' : 'Book a consultation'}</Link>} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((a, i) => {
            const d = new Date(`${a.date}T00:00:00`);
            const title = kind === 'visits' ? data.property(a.propertyId)?.title || 'Property visit' : data.service(a.serviceId)?.name || 'Consultation';
            const sub = kind === 'visits' ? data.property(a.propertyId) && `${data.property(a.propertyId).location}, ${data.property(a.propertyId).city}` : `with ${data.user(a.consultantId)?.name || 'a consultant'}`;
            const editable = !['Cancelled', 'Completed'].includes(a.status) && isUpcoming(a.date, a.time);
            return (
              <article key={a.id} className="card animate-fade-up flex gap-4 p-4 sm:p-5" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <span className="text-[11px] font-bold uppercase">{d.toLocaleDateString('en-IN', { month: 'short' })}</span>
                  <span className="font-display text-2xl font-semibold leading-none">{d.getDate()}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-semibold leading-snug">{title}</h3>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">{kind === 'visits' && <MapPin size={14} />}{sub}</p>
                  <p className="mt-1 text-sm font-semibold">{fmtDate(a.date)} · {fmtTime(a.time)}{kind === 'consults' && <span className="ml-2 font-bold text-brand">{money(a.fee)}</span>}</p>
                  <p className="text-xs text-muted">Ref {a.ref}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {kind === 'consults' && <button className="btn btn-ghost btn-sm border border-line" onClick={() => setDetail(a.id)}><Eye size={15} /> {a.status === 'Completed' ? 'View recommendations' : 'Details'}</button>}
                    {a.status === 'Completed' && (reviewed[`${kind === 'visits' ? 'visit' : 'consultation'}:${a.id}`]
                      ? <span className="flex items-center gap-2 text-sm text-muted">Your rating <Stars value={reviewed[`${kind === 'visits' ? 'visit' : 'consultation'}:${a.id}`]} size={15} /></span>
                      : <button className="btn btn-outline btn-sm" onClick={() => setRate(a)}><Star size={15} /> Rate this {kind === 'visits' ? 'visit' : 'consultation'}</button>)}
                    {editable && <button className="btn btn-outline btn-sm" onClick={() => setResched(a)}><CalendarClock size={15} /> Reschedule</button>}
                    {editable && <button className="btn btn-ghost btn-sm text-muted" onClick={() => setCancel(a)}><XCircle size={15} /> Cancel</button>}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <RescheduleModal open={!!resched} item={resched} kind={kind === 'visits' ? 'visit' : 'consult'} onClose={() => setResched(null)} onSave={(patch) => data.update(coll, resched.id, patch).then((ok) => ok && toast('New time sent for confirmation.'))} />
      <ConfirmDialog open={!!cancel} onClose={() => setCancel(null)} danger title="Cancel this appointment?" message={`${cancel?.ref} on ${cancel ? fmtDate(cancel.date) : ''} will be cancelled.`} confirmLabel="Cancel appointment" onConfirm={() => data.update(coll, cancel.id, { status: 'Cancelled' }).then((ok) => ok && toast('Appointment cancelled.'))} />
      <ReviewModal open={!!rate} kind={kind === 'visits' ? 'visit' : 'consultation'} booking={rate} personName={rate ? data.user(kind === 'visits' ? rate.agentId : rate.consultantId)?.name : ''} onClose={() => setRate(null)} onDone={(rv) => setReviewed((m) => ({ ...m, [`${rv.kind}:${rate.id}`]: rv.rating }))} />
      {detail && <ConsultationDetailModal consultationId={detail} role="customer" onClose={() => setDetail(null)} />}
    </>
  );
}
