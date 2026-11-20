import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, HardHat } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/ui/EmptyState';
import Tabs from '../../components/ui/Tabs';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { CONSTRUCTION_STATUSES } from '../../lib/constants';
import { cn, fmtDate, money } from '../../lib/utils';

const FLOW = CONSTRUCTION_STATUSES.filter((s) => s !== 'Closed');
const isDone = (r) => ['Completed', 'Closed'].includes(r.status);

export default function CustomerConstruction() {
  const { user } = useAuth();
  const data = useData();
  const [tab, setTab] = useState('all');
  const mine = data.db.constructionRequests.filter((r) => r.customerId === user.id);
  const shown = mine.filter((r) => tab === 'all' || (tab === 'open' ? !isDone(r) : isDone(r)));

  return (
    <>
      <PageHeader title="Construction" subtitle="Follow the status of your construction requests." actions={<Link to="/construction#request" className="btn btn-primary btn-sm">New request</Link>} />
      <Tabs className="mb-5" value={tab} onChange={setTab} items={[{ key: 'all', label: 'All', count: mine.length }, { key: 'open', label: 'In progress', count: mine.filter((r) => !isDone(r)).length }, { key: 'done', label: 'Finished', count: mine.filter(isDone).length }]} />

      {shown.length === 0 ? (
        <EmptyState icon={HardHat} title="No construction requests" message="Requests you send from the Construction page appear here." action={<Link to="/construction" className="btn btn-primary btn-sm">Go to Construction</Link>} />
      ) : (
        <div className="space-y-4">
          {shown.map((r, i) => {
            const staff = data.user(r.assignedTo);
            const idx = FLOW.indexOf(r.status);
            const last = r.notes[r.notes.length - 1];
            return (
              <article key={r.id} className="card animate-fade-up p-5" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold">{r.type}</p>
                    <p className="text-sm text-muted">{r.ref} · {r.location} · Sent {fmtDate(r.createdAt)}{staff && ` · Assigned: ${staff.name}`}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                {r.status !== 'Closed' && (
                  <ol className="mt-5 flex items-center" aria-label="Construction progress">
                    {FLOW.map((s, n) => (
                      <li key={s} className={cn('flex items-center', n < FLOW.length - 1 && 'flex-1')}>
                        <span className="flex flex-col items-center gap-1.5">
                          <span className={cn('flex h-7 w-7 items-center justify-center rounded-full border-2 text-xs font-bold', n <= idx ? 'border-brand bg-brand text-on-brand' : 'border-line text-muted')}>{n < idx ? <Check size={14} /> : n + 1}</span>
                          <span className={cn('text-center text-[11px] font-bold', n <= idx ? 'text-ink' : 'text-muted')}>{s}</span>
                        </span>
                        {n < FLOW.length - 1 && <span className={cn('mx-2 mb-5 h-0.5 flex-1 rounded', n < idx ? 'bg-brand' : 'bg-line')} />}
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                  <p><span className="text-muted">Plot size: </span>{r.plotSize || '-'}</p>
                  <p><span className="text-muted">Budget: </span>{r.budget || '-'}</p>
                  <p><span className="text-muted">Quote: </span>{r.quote ? <b>{money(r.quote)}</b> : 'Not shared yet'}</p>
                </div>
                {last && <p className="mt-3 rounded-xl bg-sunken/60 p-3 text-sm"><b>Latest update:</b> {last.text}</p>}
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
