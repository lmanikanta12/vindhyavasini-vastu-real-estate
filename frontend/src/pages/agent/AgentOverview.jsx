import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CalendarDays, MessageSquare, TrendingUp } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import ReviewsPanel from '../../components/shared/ReviewsPanel';
import EnquiryDetailModal from '../../components/shared/EnquiryDetailModal';
import { HBars } from '../../components/charts/Charts';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ENQUIRY_STATUSES } from '../../lib/constants';
import { fmtDate, fmtTime, isUpcoming, sortByDateAsc } from '../../lib/utils';

export default function AgentOverview() {
  const { user } = useAuth();
  const data = useData();
  const { db } = data;
  const [open, setOpen] = useState(null);

  const listings = db.properties.filter((p) => p.agentId === user.id);
  const leads = db.enquiries.filter((e) => e.assignedTo === user.id);
  const visits = db.siteVisits.filter((v) => v.agentId === user.id);
  const upcoming = visits.filter((v) => ['Requested', 'Scheduled'].includes(v.status) && isUpcoming(v.date, v.time)).sort(sortByDateAsc);
  const newLeads = leads.filter((e) => e.status === 'New');
  const closed = leads.filter((e) => ['Completed', 'Closed'].includes(e.status)).length;

  return (
    <>
      <PageHeader title={`Good day, ${user.name.split(' ')[0]}`} subtitle="Your listings, leads and site visits at a glance." actions={<Link to="/agent/listings" className="btn btn-primary btn-sm"><Building2 size={16} /> Manage listings</Link>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} icon={Building2} label="Active listings" value={listings.filter((p) => p.status === 'Available').length} hint={`${listings.length} total`} />
        <StatCard index={1} icon={MessageSquare} tone="water" label="New leads" value={newLeads.length} hint={`${leads.length} assigned`} />
        <StatCard index={2} icon={CalendarDays} tone="air" label="Upcoming visits" value={upcoming.length} />
        <StatCard index={3} icon={TrendingUp} tone="fire" label="Leads closed" value={closed} hint="Completed or closed" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Latest enquiries</h2><Link to="/agent/enquiries" className="text-sm font-bold text-brand hover:underline">All leads</Link></div>
          {leads.length === 0 ? <EmptyState icon={MessageSquare} title="No leads yet" /> : (
            <ul className="divide-y divide-line">
              {leads.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <button onClick={() => setOpen(e.id)} className="flex w-full items-center gap-3 py-3.5 text-left transition hover:bg-sunken/60 sm:px-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold">{e.contact.name}</p>
                      <p className="truncate text-sm text-muted">{data.property(e.propertyId)?.title || 'General enquiry'} · {fmtDate(e.createdAt)}</p>
                    </div>
                    <StatusBadge status={e.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-5 text-xl font-semibold">Lead pipeline</h2>
          <HBars data={ENQUIRY_STATUSES.map((s) => ({ label: s, value: leads.filter((e) => e.status === s).length }))} />
        </section>
      </div>

      <section className="card mt-6 p-5">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Upcoming site visits</h2><Link to="/agent/visits" className="text-sm font-bold text-brand hover:underline">Manage</Link></div>
        {upcoming.length === 0 ? <EmptyState icon={CalendarDays} title="No visits scheduled" /> : (
          <div className="grid gap-3 md:grid-cols-2">
            {upcoming.slice(0, 4).map((v) => (
              <div key={v.id} className="flex items-center gap-4 rounded-xl border border-line p-3.5">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <span className="text-[10px] font-bold uppercase">{new Date(`${v.date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</span>
                  <span className="font-display text-lg font-semibold leading-none">{new Date(`${v.date}T00:00:00`).getDate()}</span>
                </div>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{data.property(v.propertyId)?.title}</p><p className="text-xs text-muted">{data.user(v.customerId)?.name} · {fmtTime(v.time)}</p></div>
                <StatusBadge status={v.status} />
              </div>
            ))}
          </div>
        )}
      </section>
      {open && <EnquiryDetailModal enquiryId={open} onClose={() => setOpen(null)} />}
      <ReviewsPanel targetId={user.id} />
    </>
  );
}
