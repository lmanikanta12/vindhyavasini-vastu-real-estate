import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import Tabs from '../../components/ui/Tabs';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import ConsultationDetailModal from '../../components/shared/ConsultationDetailModal';
import Avatar from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { CONSULT_STATUSES } from '../../lib/constants';
import Pagination from '../../components/ui/Pagination';
import useServerList from '../../hooks/useServerList';
import { fmtDate, fmtTime, money } from '../../lib/utils';

export default function ConsultantRequests({ all = false }) {
  const { user } = useAuth();
  const data = useData();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);

  const list = useServerList('/consultations', { filters: { status: tab }, search: q, limit: 12, sort: 'date', dir: 'desc', collection: 'consultations' });
  const rows = list.items;

  return (
    <>
      <PageHeader title={all ? 'Consultations' : 'Consultation requests'} subtitle="Confirm bookings, review customer details and floor plans, then record notes and recommendations." />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onChange={setTab} items={[{ key: 'all', label: 'All' }, ...CONSULT_STATUSES.map((s) => ({ key: s, label: s }))]} />
        <SearchInput className="w-full lg:w-72" value={q} onChange={setQ} placeholder="Search consultations" />
      </div>
      <DataTable
        rows={rows}
        loading={list.loading}
        sort={list.sort}
        dir={list.dir}
        onSort={list.onSort}
        onRowClick={(c) => setOpen(c.id)}
        empty={<EmptyState icon={ClipboardList} title="No consultations" message="Bookings will appear here." />}
        columns={[
          { key: 'customer', header: 'Customer', render: (c) => <div className="flex items-center gap-3"><Avatar name={data.user(c.customerId)?.name || '?'} size="sm" /><div><p className="font-bold">{data.user(c.customerId)?.name}</p><p className="text-xs text-muted">{c.ref}</p></div></div> },
          { key: 'service', header: 'Service', render: (c) => <span className="text-sm">{data.service(c.serviceId)?.name}</span> },
          { key: 'property', header: 'Property', render: (c) => <span className="text-sm">{c.propertyType}<span className="block text-xs text-muted">{c.direction} facing</span></span> },
          ...(all ? [{ key: 'consultant', header: 'Consultant', render: (c) => <span className="text-sm">{data.user(c.consultantId)?.name || '-'}</span> }] : []),
          { key: 'when', sort: 'date', header: 'Date and time', render: (c) => <div><p className="text-sm font-semibold">{fmtDate(c.date)}</p><p className="text-xs text-muted">{fmtTime(c.time)}</p></div> },
          { key: 'fee', sort: 'fee', header: 'Fee', render: (c) => <span className="font-bold text-brand">{money(c.fee)}</span> },
          { key: 'status', sort: 'status', header: 'Status', render: (c) => <StatusBadge status={c.status} /> },
        ]}
      />
      <Pagination page={list.page} pages={list.pages} total={list.total} limit={list.limit} onPage={list.setPage} noun="consultations" />
      {open && <ConsultationDetailModal consultationId={open} role={all ? 'admin' : 'consultant'} onClose={() => setOpen(null)} />}
    </>
  );
}
