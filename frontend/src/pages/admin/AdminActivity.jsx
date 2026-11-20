import { useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { Input, Select } from '../../components/ui/Field';
import useServerList from '../../hooks/useServerList';
import { ROLES } from '../../lib/constants';
import { cn, fmtDate } from '../../lib/utils';

const TYPES = [
  { value: '', label: 'All records' },
  { value: 'auth', label: 'Sign-ins and passwords' },
  { value: 'user', label: 'Users' },
  { value: 'property', label: 'Properties' },
  { value: 'enquiry', label: 'Enquiries' },
  { value: 'construction', label: 'Construction' },
  { value: 'visit', label: 'Site visits' },
  { value: 'consultation', label: 'Consultations' },
  { value: 'payment', label: 'Payments' },
  { value: 'service', label: 'Services' },
  { value: 'review', label: 'Reviews' },
  { value: 'settings', label: 'Settings' },
];

const TONE = { auth: 'bg-water/25', payment: 'bg-air/25', user: 'bg-fire/25', property: 'bg-brand-soft', enquiry: 'bg-fire/25', construction: 'bg-fire/25', visit: 'bg-water/25', consultation: 'bg-air/25', service: 'bg-sunken', settings: 'bg-sunken' };
const nice = (a = '') => { const t = a.replace(/[._]/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
const when = (iso) => {
  const d = new Date(iso);
  return { day: fmtDate(iso), time: d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', second: '2-digit' }) };
};

export default function AdminActivity() {
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [role, setRole] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const list = useServerList('/activity', { filters: { action: type, role, from, to }, search: q, limit: 20, sort: 'createdAt', dir: 'desc' });
  const reset = () => { setQ(''); setType(''); setRole(''); setFrom(''); setTo(''); };
  const filtered = q || type || role || from || to;

  return (
    <>
      <PageHeader title="Activity log" subtitle="Status changes, assignments, payments, listing edits and sign-ins, with who did it and when." actions={filtered && <button className="btn btn-outline btn-sm" onClick={reset}><RotateCcw size={15} /> Clear filters</button>} />
      <section className="card mb-5 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5" aria-label="Filters">
        <div className="sm:col-span-2 lg:col-span-1">
          <span className="label">Search</span>
          <SearchInput value={q} onChange={setQ} placeholder="Name, reference, text" />
        </div>
        <Select label="Record type" value={type} onChange={(e) => setType(e.target.value)} options={TYPES} />
        <Select label="Done by" value={role} onChange={(e) => setRole(e.target.value)} options={[{ value: '', label: 'Anyone' }, ...Object.keys(ROLES).map((r) => ({ value: r, label: ROLES[r].label })), { value: 'system', label: 'System' }]} />
        <Input label="From" type="date" max={to || undefined} value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" min={from || undefined} value={to} onChange={(e) => setTo(e.target.value)} />
      </section>
      <DataTable
        rows={list.items}
        loading={list.loading}
        sort={list.sort}
        dir={list.dir}
        onSort={list.onSort}
        empty={<EmptyState icon={History} title="No activity found" message="Nothing matches these filters yet." />}
        columns={[
          { key: 'createdAt', sort: 'createdAt', header: 'When', render: (a) => { const w = when(a.createdAt); return <div className="whitespace-nowrap"><p className="text-sm font-semibold">{w.day}</p><p className="text-xs text-muted">{w.time}</p></div>; } },
          { key: 'actorName', sort: 'actorName', header: 'Who', render: (a) => <div><p className="text-sm font-bold">{a.actorName}</p><p className="text-xs capitalize text-muted">{a.actorRole}</p></div> },
          { key: 'action', sort: 'action', header: 'Action', render: (a) => <span className={cn('inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold', TONE[a.entityType] || 'bg-sunken')}>{nice(a.action)}</span> },
          { key: 'entityRef', header: 'Record', render: (a) => <span className="break-all text-sm font-semibold">{a.entityRef || '-'}</span> },
          { key: 'summary', header: 'Details', render: (a) => <span className="block max-w-[28rem] text-sm text-muted">{a.summary}</span> },
        ]}
      />
      <Pagination page={list.page} pages={list.pages} total={list.total} limit={list.limit} onPage={list.setPage} noun="log entries" />
    </>
  );
}
