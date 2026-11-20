import { useState } from 'react';
import { CalendarClock, CalendarDays, Check, CheckCheck, XCircle } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Tabs from '../../components/ui/Tabs';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import RescheduleModal from '../../components/shared/RescheduleModal';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { VISIT_STATUSES } from '../../lib/constants';
import Pagination from '../../components/ui/Pagination';
import SearchInput from '../../components/ui/SearchInput';
import useServerList from '../../hooks/useServerList';
import { fmtDate, fmtTime } from '../../lib/utils';

export default function AgentVisits({ all = false }) {
  const { user } = useAuth();
  const data = useData();
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [resched, setResched] = useState(null);

  const list = useServerList('/site-visits', { filters: { status: tab }, search: q, limit: 12, sort: 'date', dir: 'desc', collection: 'siteVisits' });
  const rows = list.items;
  const setStatus = (v, status) => data.update('siteVisits', v.id, { status }).then((ok) => ok && toast(`Visit ${v.ref} marked ${status.toLowerCase()}.`));

  return (
    <>
      <PageHeader title="Site visits" subtitle="Confirm, reschedule and complete property visits requested by customers." />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onChange={setTab} items={[{ key: 'all', label: 'All' }, ...VISIT_STATUSES.map((s) => ({ key: s, label: s }))]} />
        <SearchInput className="w-full lg:w-72" value={q} onChange={setQ} placeholder="Search visits" />
      </div>
      <DataTable
        rows={rows}
        loading={list.loading}
        sort={list.sort}
        dir={list.dir}
        onSort={list.onSort}
        empty={<EmptyState icon={CalendarDays} title="No site visits" message="Requests from customers appear here." />}
        columns={[
          { key: 'when', sort: 'date', header: 'Date and time', render: (v) => <div><p className="font-bold">{fmtDate(v.date)}</p><p className="text-xs text-muted">{fmtTime(v.time)}</p></div> },
          { key: 'property', header: 'Property', render: (v) => <span className="block max-w-[15rem] truncate text-sm font-semibold">{data.property(v.propertyId)?.title || '-'}</span> },
          { key: 'customer', header: 'Customer', render: (v) => <div><p className="text-sm font-semibold">{data.user(v.customerId)?.name || 'Guest'}</p><p className="text-xs text-muted">{data.user(v.customerId)?.phone}</p></div> },
          ...(all ? [{ key: 'agent', header: 'Assigned agent', render: (v) => (
            <select className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-bold" value={v.agentId || ''} onChange={(e) => { data.update('siteVisits', v.id, { agentId: e.target.value }).then((ok) => ok && toast('Visit reassigned.')); }} aria-label="Assign agent">
              {data.usersByRole('agent').map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          ) }] : []),
          { key: 'note', header: 'Note', render: (v) => <span className="block max-w-[14rem] truncate text-sm text-muted">{v.note || '-'}</span> },
          { key: 'status', sort: 'status', header: 'Status', render: (v) => <StatusBadge status={v.status} /> },
          {
            key: 'a', header: '', className: 'text-right',
            render: (v) => {
              if (['Completed', 'Cancelled'].includes(v.status)) return null;
              return (
                <div className="flex justify-end gap-1">
                  {v.status === 'Requested' && <button className="btn btn-primary btn-sm" onClick={() => setStatus(v, 'Scheduled')}><Check size={15} /> Confirm</button>}
                  {v.status === 'Scheduled' && <button className="btn btn-primary btn-sm" onClick={() => setStatus(v, 'Completed')}><CheckCheck size={15} /> Complete</button>}
                  <button className="btn-icon h-9 w-9" title="Reschedule" onClick={() => setResched(v)}><CalendarClock size={17} /></button>
                  <button className="btn-icon h-9 w-9" title="Cancel visit" onClick={() => setStatus(v, 'Cancelled')}><XCircle size={17} /></button>
                </div>
              );
            },
          },
        ]}
      />
      <Pagination page={list.page} pages={list.pages} total={list.total} limit={list.limit} onPage={list.setPage} noun="visits" />
      <RescheduleModal open={!!resched} item={resched} kind="visit" onClose={() => setResched(null)} onSave={(p) => data.update('siteVisits', resched.id, p).then((ok) => ok && toast('Visit rescheduled.'))} />
    </>
  );
}
