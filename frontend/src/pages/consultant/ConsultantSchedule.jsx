import { useMemo, useState } from 'react';
import { CalendarOff, Save } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { TIME_SLOTS, VISIT_SLOTS, WEEKDAYS } from '../../lib/constants';
import { addDays, cn, fmtDate, fmtTime, todayISO } from '../../lib/utils';

export default function ConsultantSchedule({ consultantId, agent = false }) {
  const { user } = useAuth();
  const data = useData();
  const toast = useToast();
  const target = consultantId ? data.user(consultantId) : user;
  const SLOTS = agent ? VISIT_SLOTS : TIME_SLOTS;
  const [av, setAv] = useState(target.availability || (agent ? { days: [1, 2, 3, 4, 5, 6], slots: [...VISIT_SLOTS], blocked: [] } : { days: [1, 2, 3, 4, 5], slots: [...TIME_SLOTS], blocked: [] }));
  const [block, setBlock] = useState('');

  const toggle = (key, val) => setAv((a) => ({ ...a, [key]: a[key].includes(val) ? a[key].filter((x) => x !== val) : [...a[key], val] }));
  const save = () => data.update('users', target.id, { availability: av }).then((ok) => ok && toast('Availability saved.'));

  const agenda = useMemo(
    () => Array.from({ length: 14 }, (_, i) => {
      const date = addDays(i);
      const items = (agent
        ? data.db.siteVisits.filter((v) => v.agentId === target.id && v.date === date && v.status !== 'Cancelled').map((v) => ({ ...v, title: data.property(v.propertyId)?.title || 'Site visit' }))
        : data.db.consultations.filter((c) => c.consultantId === target.id && c.date === date && c.status !== 'Cancelled').map((c) => ({ ...c, title: data.service(c.serviceId)?.name })))
        .sort((a, b) => a.time.localeCompare(b.time));
      const dow = new Date(`${date}T00:00:00`).getDay();
      return { date, items, off: !av.days.includes(dow) || av.blocked.includes(date) };
    }),
    [data.db.consultations, data.db.siteVisits, target.id, av, agent]
  );

  return (
    <>
      <PageHeader title={agent ? 'My schedule' : 'Schedule and availability'} subtitle={agent ? 'Set your working days, working hours and days off. Customers can only request site visits when you are available.' : 'Choose the days and slots customers can book. Changes apply to new bookings.'} actions={<button className="btn btn-primary" onClick={save} disabled={av.days.length === 0 || av.slots.length === 0}><Save size={17} /> Save availability</button>} />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold">Working days</h2>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d, i) => <button key={d} onClick={() => toggle('days', i)} aria-pressed={av.days.includes(i)} className={cn('chip', av.days.includes(i) && 'chip-active')}>{d}</button>)}
            </div>
          </section>
          <section className="card p-5">
            <h2 className="mb-1 text-lg font-semibold">{agent ? 'Working hours (visit times)' : 'Time slots'}</h2>
            {agent && <p className="mb-3 text-xs text-muted">Pick the start times you take site visits.</p>}
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((t) => <button key={t} onClick={() => toggle('slots', t)} aria-pressed={av.slots.includes(t)} className={cn('chip', av.slots.includes(t) && 'chip-active')}>{fmtTime(t)}</button>)}
            </div>
          </section>
          <section className="card p-5">
            <h2 className="mb-4 text-lg font-semibold">Blocked dates</h2>
            <div className="flex gap-2">
              <input type="date" className="input" min={todayISO()} value={block} onChange={(e) => setBlock(e.target.value)} aria-label="Date to block" />
              <button className="btn btn-outline" disabled={!block || av.blocked.includes(block)} onClick={() => { setAv((a) => ({ ...a, blocked: [...a.blocked, block].sort() })); setBlock(''); }}>Block</button>
            </div>
            <ul className="mt-4 space-y-2">
              {av.blocked.length === 0 && <li className="text-sm text-muted">No blocked dates.</li>}
              {av.blocked.map((d) => (
                <li key={d} className="flex items-center justify-between rounded-lg bg-sunken px-3 py-2 text-sm font-semibold"><span className="inline-flex items-center gap-2"><CalendarOff size={15} className="text-brand" /> {fmtDate(d)}</span><button className="text-xs font-bold text-brand hover:underline" onClick={() => toggle('blocked', d)}>Remove</button></li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card p-5 lg:col-span-3">
          <h2 className="mb-4 text-lg font-semibold">Next 14 days</h2>
          <ul className="divide-y divide-line">
            {agenda.map((d) => {
              const dt = new Date(`${d.date}T00:00:00`);
              return (
                <li key={d.date} className="flex gap-4 py-3">
                  <div className={cn('flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl', d.off ? 'bg-sunken text-muted' : 'bg-brand-soft text-brand')}>
                    <span className="text-[10px] font-bold uppercase">{dt.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                    <span className="font-display text-xl font-semibold leading-none">{dt.getDate()}</span>
                  </div>
                  <div className="min-w-0 flex-1 self-center">
                    {d.items.length === 0 ? <p className="text-sm text-muted">{d.off ? 'Not available' : agent ? 'Open for visits' : 'Open for booking'}</p> : d.items.map((c) => (
                      <div key={c.id} className="mb-1.5 flex flex-wrap items-center gap-2 text-sm last:mb-0"><span className="font-bold">{fmtTime(c.time)}</span><span className="truncate">{c.title} · {data.user(c.customerId)?.name || 'Guest'}</span><StatusBadge status={c.status} /></div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
