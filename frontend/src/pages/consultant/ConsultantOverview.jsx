import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, CheckCircle2, ClipboardList, Hourglass } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import ReviewsPanel from '../../components/shared/ReviewsPanel';
import ConsultationDetailModal from '../../components/shared/ConsultationDetailModal';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { fmtDate, fmtTime, isUpcoming, sortByDateAsc, todayISO } from '../../lib/utils';

export default function ConsultantOverview() {
  const { user } = useAuth();
  const data = useData();
  const [open, setOpen] = useState(null);

  const mine = data.db.consultations.filter((c) => c.consultantId === user.id);
  const requested = mine.filter((c) => c.status === 'Requested');
  const upcoming = mine.filter((c) => c.status === 'Confirmed' && isUpcoming(c.date, c.time)).sort(sortByDateAsc);
  const today = mine.filter((c) => c.date === todayISO() && !['Cancelled'].includes(c.status));
  const done = mine.filter((c) => c.status === 'Completed');

  const row = (c) => (
    <li key={c.id}>
      <button onClick={() => setOpen(c.id)} className="flex w-full items-center gap-4 py-3.5 text-left transition hover:bg-sunken/60 sm:px-2">
        <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-soft text-brand">
          <span className="text-[10px] font-bold uppercase">{new Date(`${c.date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</span>
          <span className="font-display text-lg font-semibold leading-none">{new Date(`${c.date}T00:00:00`).getDate()}</span>
        </div>
        <div className="min-w-0 flex-1"><p className="truncate font-bold">{data.service(c.serviceId)?.name}</p><p className="truncate text-sm text-muted">{data.user(c.customerId)?.name} · {fmtTime(c.time)} · {c.propertyType}</p></div>
        <StatusBadge status={c.status} />
      </button>
    </li>
  );

  return (
    <>
      <PageHeader title={`Namaste, ${user.name.replace(/^(Dr\.|Acharya)\s+/, '').split(' ')[0]}`} subtitle="Consultation requests, today's schedule and completed work." actions={<Link to="/consultant/schedule" className="btn btn-outline btn-sm">Edit availability</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} icon={Hourglass} tone="fire" label="Awaiting confirmation" value={requested.length} />
        <StatCard index={1} icon={CalendarCheck} tone="air" label="Upcoming" value={upcoming.length} hint="Confirmed sessions" />
        <StatCard index={2} icon={ClipboardList} tone="water" label="Today" value={today.length} />
        <StatCard index={3} icon={CheckCircle2} label="Completed" value={done.length} hint={`${mine.length} total`} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">New requests</h2><Link to="/consultant/requests" className="text-sm font-bold text-brand hover:underline">View all</Link></div>
          {requested.length ? <ul className="divide-y divide-line">{requested.map(row)}</ul> : <EmptyState icon={Hourglass} title="No pending requests" />}
        </section>
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">Upcoming sessions</h2><Link to="/consultant/schedule" className="text-sm font-bold text-brand hover:underline">Schedule</Link></div>
          {upcoming.length ? <ul className="divide-y divide-line">{upcoming.slice(0, 5).map(row)}</ul> : <EmptyState icon={CalendarCheck} title="Nothing confirmed yet" />}
        </section>
      </div>
      <ReviewsPanel targetId={user.id} />
      {open && <ConsultationDetailModal consultationId={open} role="consultant" onClose={() => setOpen(null)} />}
    </>
  );
}
