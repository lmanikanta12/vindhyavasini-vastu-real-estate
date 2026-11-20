import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Check, MessageSquare } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Tabs from '../../components/ui/Tabs';
import SiteVisitModal from '../../components/property/SiteVisitModal';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ENQUIRY_STATUSES } from '../../lib/constants';
import { cn, fmtDate } from '../../lib/utils';

const FLOW = ENQUIRY_STATUSES.filter((s) => s !== 'Closed');

export default function CustomerEnquiries() {
  const { user } = useAuth();
  const data = useData();
  const [tab, setTab] = useState('all');
  const [visitFor, setVisitFor] = useState(null);

  const mine = data.db.enquiries.filter((e) => e.customerId === user.id);
  const shown = mine.filter((e) => tab === 'all' || (tab === 'open' ? !['Completed', 'Closed'].includes(e.status) : ['Completed', 'Closed'].includes(e.status)));

  return (
    <>
      <PageHeader title="My enquiries" subtitle="Follow the progress of every property enquiry you have sent." />
      <Tabs className="mb-5" value={tab} onChange={setTab} items={[{ key: 'all', label: 'All', count: mine.length }, { key: 'open', label: 'In progress', count: mine.filter((e) => !['Completed', 'Closed'].includes(e.status)).length }, { key: 'done', label: 'Finished', count: mine.filter((e) => ['Completed', 'Closed'].includes(e.status)).length }]} />

      {shown.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No enquiries here" message="Enquiries you send from a property page appear in this list." action={<Link to="/properties" className="btn btn-primary btn-sm">Browse properties</Link>} />
      ) : (
        <div className="space-y-4">
          {shown.map((e, i) => {
            const p = data.property(e.propertyId);
            const agent = data.user(e.assignedTo);
            const idx = FLOW.indexOf(e.status);
            const last = e.notes[e.notes.length - 1];
            return (
              <article key={e.id} className="card animate-fade-up p-5" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {p ? <Link to={`/properties/${p.id}`} className="font-display text-lg font-semibold hover:text-brand">{p.title}</Link> : <p className="font-display text-lg font-semibold">General enquiry</p>}
                    <p className="text-sm text-muted">{e.ref} · Sent {fmtDate(e.createdAt)}{agent && ` · Agent: ${agent.name}`}</p>
                  </div>
                  <StatusBadge status={e.status} />
                </div>

                {e.status !== 'Closed' && (
                  <ol className="mt-5 flex items-center" aria-label="Enquiry progress">
                    {FLOW.map((s, n) => (
                      <li key={s} className={cn('flex items-center', n < FLOW.length - 1 && 'flex-1')}>
                        <span className="flex flex-col items-center gap-1.5">
                          <span className={cn('flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors', n <= idx ? 'border-brand bg-brand text-on-brand' : 'border-line text-muted')}>{n < idx ? <Check size={14} /> : n + 1}</span>
                          <span className={cn('text-[11px] font-bold', n <= idx ? 'text-ink' : 'text-muted')}>{s}</span>
                        </span>
                        {n < FLOW.length - 1 && <span className={cn('mx-2 mb-5 h-0.5 flex-1 rounded', n < idx ? 'bg-brand' : 'bg-line')} />}
                      </li>
                    ))}
                  </ol>
                )}

                <p className="mt-4 rounded-xl bg-sunken/70 p-3 text-sm"><span className="font-bold">Your message: </span>{e.message}</p>
                {last && <p className="mt-2 text-sm text-muted"><span className="font-bold text-ink">Latest update: </span>{last.text} <span className="text-xs">({fmtDate(last.at)})</span></p>}

                {p && !['Closed', 'Completed'].includes(e.status) && (
                  <div className="mt-4"><button className="btn btn-outline btn-sm" onClick={() => setVisitFor(p)}><CalendarCheck size={16} /> Request site visit</button></div>
                )}
              </article>
            );
          })}
        </div>
      )}
      <SiteVisitModal open={!!visitFor} onClose={() => setVisitFor(null)} property={visitFor} />
    </>
  );
}
