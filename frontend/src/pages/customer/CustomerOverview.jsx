import { Link } from 'react-router-dom';
import { ArrowRight, Bookmark, CalendarDays, CreditCard, MessageSquare, Search, Sparkles } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import EmptyState from '../../components/ui/EmptyState';
import PropertyArt from '../../components/property/PropertyArt';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { fmtDate, fmtTime, formatPrice, isUpcoming, money, sortByDateAsc } from '../../lib/utils';

export default function CustomerOverview() {
  const { user } = useAuth();
  const data = useData();
  const { db } = data;

  const shortlist = (db.shortlists[user.id] || []).map((id) => data.property(id)).filter(Boolean);
  const enquiries = db.enquiries.filter((e) => e.customerId === user.id);
  const openEnq = enquiries.filter((e) => !['Completed', 'Closed'].includes(e.status));
  const pending = db.payments.filter((p) => p.customerId === user.id && p.status === 'Pending');

  const upcoming = [
    ...db.siteVisits.filter((v) => v.customerId === user.id && !['Cancelled', 'Completed'].includes(v.status)).map((v) => ({ ...v, kind: 'Site visit', title: data.property(v.propertyId)?.title || 'Property visit' })),
    ...db.consultations.filter((c) => c.customerId === user.id && !['Cancelled', 'Completed'].includes(c.status)).map((c) => ({ ...c, kind: 'Vastu consultation', title: data.service(c.serviceId)?.name || 'Consultation' })),
  ].filter((a) => isUpcoming(a.date, a.time)).sort(sortByDateAsc);

  return (
    <>
      <PageHeader
        title={`Welcome, ${user.name.split(' ')[0]}`}
        subtitle="Here is what is happening with your property search and consultations."
        actions={
          <>
            <Link to="/properties" className="btn btn-primary btn-sm"><Search size={16} /> Browse properties</Link>
            <Link to="/vastu/book" className="btn btn-outline btn-sm"><Sparkles size={16} /> Book Vastu</Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard index={0} icon={Bookmark} label="Shortlisted" value={shortlist.length} hint="Saved properties" />
        <StatCard index={1} icon={MessageSquare} label="Open enquiries" value={openEnq.length} tone="water" hint={`${enquiries.length} in total`} />
        <StatCard index={2} icon={CalendarDays} label="Upcoming appointments" value={upcoming.length} tone="air" hint="Visits and consultations" />
        <StatCard index={3} icon={CreditCard} label="Pending payments" value={money(pending.reduce((s, p) => s + p.amount, 0))} tone="fire" hint={`${pending.length} awaiting payment`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <section className="card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Upcoming appointments</h2><Link to="/customer/appointments" className="text-sm font-bold text-brand hover:underline">View all</Link></div>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Nothing scheduled" message="Request a site visit or book a Vastu consultation." />
          ) : (
            <ul className="divide-y divide-line">
              {upcoming.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center gap-4 py-3.5">
                  <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <span className="text-[11px] font-bold uppercase">{new Date(`${a.date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</span>
                    <span className="font-display text-xl font-semibold leading-none">{new Date(`${a.date}T00:00:00`).getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{a.title}</p>
                    <p className="text-sm text-muted">{a.kind} · {fmtTime(a.time)}</p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Recent enquiries</h2><Link to="/customer/enquiries" className="text-sm font-bold text-brand hover:underline">View all</Link></div>
          {enquiries.length === 0 ? (
            <EmptyState icon={MessageSquare} title="No enquiries yet" message="Enquire on any listing to start a conversation." />
          ) : (
            <ul className="space-y-3">
              {enquiries.slice(0, 4).map((e) => (
                <li key={e.id} className="rounded-xl border border-line p-3.5">
                  <div className="flex items-start justify-between gap-2"><p className="line-clamp-1 text-sm font-bold">{data.property(e.propertyId)?.title || 'General enquiry'}</p><StatusBadge status={e.status} /></div>
                  <p className="mt-1 text-xs text-muted">{e.ref} · {fmtDate(e.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {shortlist.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-semibold">Your shortlist</h2><Link to="/customer/shortlist" className="inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline">Manage <ArrowRight size={15} /></Link></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {shortlist.slice(0, 3).map((p) => (
              <Link key={p.id} to={`/properties/${p.id}`} className="card card-hover flex items-center gap-4 p-3">
                <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl"><PropertyArt property={p} /></div>
                <div className="min-w-0"><p className="truncate font-display font-semibold">{p.title}</p><p className="truncate text-xs text-muted">{p.location}, {p.city}</p><p className="mt-1 font-bold text-brand">{formatPrice(p.price, p.listingType)}</p></div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
