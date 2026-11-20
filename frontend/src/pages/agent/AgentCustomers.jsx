import { useState } from 'react';
import { Mail, Phone, Users } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import EmptyState from '../../components/ui/EmptyState';
import Avatar from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { fmtDate } from '../../lib/utils';

export default function AgentCustomers() {
  const { user } = useAuth();
  const data = useData();
  const [q, setQ] = useState('');

  const ids = new Set([
    ...data.db.enquiries.filter((e) => e.assignedTo === user.id && e.customerId).map((e) => e.customerId),
    ...data.db.siteVisits.filter((v) => v.agentId === user.id).map((v) => v.customerId),
  ]);
  const customers = [...ids].map((id) => data.user(id)).filter(Boolean).filter((c) => [c.name, c.email, c.city].join(' ').toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader title="Customers" subtitle="People you have worked with through enquiries and site visits." />
      <SearchInput className="mb-5 max-w-sm" value={q} onChange={setQ} placeholder="Search customers" />
      {customers.length === 0 ? <EmptyState icon={Users} title="No customers yet" /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {customers.map((c, i) => {
            const enq = data.db.enquiries.filter((e) => e.customerId === c.id && e.assignedTo === user.id);
            const vis = data.db.siteVisits.filter((v) => v.customerId === c.id && v.agentId === user.id);
            const saved = (data.db.shortlists[c.id] || []).length;
            return (
              <div key={c.id} className="card card-hover animate-fade-up p-5" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center gap-3"><Avatar name={c.name} size="lg" /><div className="min-w-0"><p className="truncate font-display text-lg font-semibold">{c.name}</p><p className="text-xs text-muted">Customer since {fmtDate(c.joined)}</p></div></div>
                <div className="mt-4 space-y-1.5 text-sm"><p className="flex items-center gap-2"><Phone size={15} className="text-brand" /> {c.phone}</p><p className="flex items-center gap-2 break-all"><Mail size={15} className="shrink-0 text-brand" /> {c.email}</p></div>
                <div className="mt-4 grid grid-cols-3 divide-x divide-line rounded-xl bg-sunken/70 py-2.5 text-center">
                  {[['Enquiries', enq.length], ['Visits', vis.length], ['Saved', saved]].map(([l, n]) => <div key={l}><p className="font-display text-xl font-semibold">{n}</p><p className="text-[11px] font-bold text-muted">{l}</p></div>)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
