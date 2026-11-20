import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { Building2, CalendarDays, IndianRupee, MessageSquare, Users } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import { AreaChart, DonutChart, HBars } from '../../components/charts/Charts';
import { StatusBadge } from '../../components/ui/Badge';
import { useData } from '../../context/DataContext';
import { ENQUIRY_STATUSES } from '../../lib/constants';
import { fmtDate, fmtTime, isUpcoming, money, sortByDateAsc } from '../../lib/utils';

export default function AdminOverview() {
  const data = useData();
  const { db } = data;

  const [ov, setOv] = useState(null);
  useEffect(() => { api('/reports/overview').then((r) => setOv(r.overview)).catch(() => {}); }, [data.version]);
  const o = ov || { users: 0, customers: 0, listings: 0, availableListings: 0, openLeads: 0, unassigned: 0, visits: 0, visitsOpen: 0, consultations: 0, consultationsOpen: 0, revenue: 0, pending: 0, propertyStatus: {}, enquiryStatus: {}, enquiriesByMonth: [], staff: [] };
  const trend = o.enquiriesByMonth;

  const upcoming = [
    ...db.consultations.filter((c) => ['Requested', 'Confirmed'].includes(c.status) && isUpcoming(c.date, c.time)).map((c) => ({ id: c.id, date: c.date, time: c.time, status: c.status, kind: 'Vastu consultation', title: data.service(c.serviceId)?.name, who: data.user(c.customerId)?.name, staff: data.user(c.consultantId)?.name })),
    ...db.siteVisits.filter((v) => ['Requested', 'Scheduled'].includes(v.status) && isUpcoming(v.date, v.time)).map((v) => ({ id: v.id, date: v.date, time: v.time, status: v.status, kind: 'Site visit', title: data.property(v.propertyId)?.title, who: data.user(v.customerId)?.name, staff: data.user(v.agentId)?.name })),
  ].sort(sortByDateAsc);
  const staff = o.staff;
  const unassigned = o.unassigned;
  const propStatus = ['Available', 'Reserved', 'Sold', 'Rented'].map((st) => ({ label: st, value: o.propertyStatus[st] || 0 }));

  return (
    <>
      <PageHeader title="Administration overview" subtitle="Activity across properties, leads, consultations and revenue." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        <StatCard index={0} icon={Users} label="Users" value={o.users} hint={`${o.customers} customers`} />
        <StatCard index={1} icon={Building2} tone="water" label="Listings" value={o.listings} hint={`${o.availableListings} available`} />
        <StatCard index={2} icon={MessageSquare} tone="fire" label="Open leads" value={o.openLeads} />
        <StatCard index={3} icon={CalendarDays} tone="air" label="Site visits" value={o.visits} hint={`${o.visitsOpen} upcoming`} />
        <StatCard index={4} icon={CalendarDays} tone="water" label="Consultations" value={o.consultations} hint={`${o.consultationsOpen} upcoming`} />
        <StatCard index={5} icon={IndianRupee} label="Revenue" value={money(o.revenue)} hint={`${money(o.pending)} pending`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="mb-1 text-xl font-semibold">Enquiries per month</h2>
          <p className="mb-5 text-sm text-muted">Last six months</p>
          {trend.length ? <AreaChart data={trend} /> : <p className="py-10 text-center text-sm text-muted">Loading...</p>}
        </section>
        <section className="card p-5">
          <h2 className="mb-5 text-xl font-semibold">Property status</h2>
          <DonutChart data={propStatus} centerLabel="Listings" />
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-5 text-xl font-semibold">Lead pipeline</h2>
          <HBars data={ENQUIRY_STATUSES.map((st) => ({ label: st, value: o.enquiryStatus[st] || 0 }))} />
        </section>
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">Recent enquiries</h2><Link to="/admin/enquiries" className="text-sm font-bold text-brand hover:underline">View all</Link></div>
          <ul className="divide-y divide-line">
            {[...db.enquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5).map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1"><p className="truncate font-bold">{e.contact.name}</p><p className="truncate text-sm text-muted">{data.property(e.propertyId)?.title || 'General enquiry'} · {fmtDate(e.createdAt)}</p></div>
                <StatusBadge status={e.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-semibold">Upcoming appointments</h2><Link to="/admin/appointments" className="text-sm font-bold text-brand hover:underline">Manage</Link></div>
          {upcoming.length === 0 ? <p className="py-6 text-center text-sm text-muted">No upcoming appointments.</p> : (
            <ul className="divide-y divide-line">
              {upcoming.slice(0, 6).map((a) => (
                <li key={a.kind + a.id} className="flex items-center gap-3 py-3">
                  <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-brand-soft text-brand">
                    <span className="text-[10px] font-bold uppercase">{new Date(`${a.date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short' })}</span>
                    <span className="font-display text-lg font-semibold leading-none">{new Date(`${a.date}T00:00:00`).getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{a.title}</p><p className="truncate text-xs text-muted">{a.kind} · {fmtTime(a.time)} · {a.who} with {a.staff}</p></div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="card p-5">
          <div className="mb-1 flex items-center justify-between"><h2 className="text-xl font-semibold">Staff assignments</h2><Link to="/admin/staff" className="text-sm font-bold text-brand hover:underline">Staff</Link></div>
          <p className="mb-3 text-sm text-muted">{unassigned > 0 ? <><b className="text-brand">{unassigned} open enquiries</b> still need an agent.</> : 'All open enquiries are assigned.'}</p>
          <ul className="divide-y divide-line">
            {staff.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0"><span className="block truncate font-bold">{s.name}</span><span className="text-xs text-muted">{s.role === 'agent' ? 'Agent' : 'Consultant'}</span></span>
                <span className="shrink-0 text-right text-xs text-muted"><b className="text-ink">{s.open}</b> {s.role === 'agent' ? 'open leads' : 'active bookings'}<br /><b className="text-ink">{s.appts}</b> {s.role === 'agent' ? 'visits pending' : 'confirmed'}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
