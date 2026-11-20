import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import Tabs from '../../components/ui/Tabs';
import DataTable from '../../components/ui/DataTable';
import EmptyState from '../../components/ui/EmptyState';
import EnquiryDetailModal from '../../components/shared/EnquiryDetailModal';
import Avatar from '../../components/ui/Avatar';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ENQUIRY_STATUSES } from '../../lib/constants';
import Pagination from '../../components/ui/Pagination';
import useServerList from '../../hooks/useServerList';
import { fmtDate } from '../../lib/utils';

export default function AgentEnquiries({ all = false }) {
  const { user } = useAuth();
  const data = useData();
  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(null);

  const list = useServerList('/enquiries', { filters: { status: tab }, search: q, limit: 12, sort: 'createdAt', dir: 'desc', collection: 'enquiries' });
  const rows = list.items;

  return (
    <>
      <PageHeader title={all ? 'All enquiries' : 'Enquiries and leads'} subtitle="Track every lead from first contact to closure. Open a row for notes and visit scheduling." />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={tab} onChange={setTab} items={[{ key: 'all', label: 'All' }, ...ENQUIRY_STATUSES.map((s) => ({ key: s, label: s }))]} />
        <SearchInput className="w-full lg:w-72" value={q} onChange={setQ} placeholder="Search leads" />
      </div>
      <DataTable
        rows={rows}
        loading={list.loading}
        sort={list.sort}
        dir={list.dir}
        onSort={list.onSort}
        onRowClick={(e) => setOpen(e.id)}
        empty={<EmptyState icon={MessageSquare} title="No leads found" message="New enquiries will appear here." />}
        columns={[
          { key: 'contact', sort: 'ref', header: 'Customer', render: (e) => <div className="flex items-center gap-3"><Avatar name={e.contact.name} size="sm" /><div className="min-w-0"><p className="font-bold">{e.contact.name}</p><p className="text-xs text-muted">{e.ref}</p></div></div> },
          { key: 'property', header: 'Property', render: (e) => <span className="block max-w-[14rem] truncate text-sm">{data.property(e.propertyId)?.title || 'General enquiry'}</span> },
          { key: 'phone', header: 'Contact', render: (e) => <span className="text-sm">{e.contact.phone}</span> },
          ...(all ? [{ key: 'agent', header: 'Assigned to', render: (e) => <span className={e.assignedTo ? 'text-sm' : 'text-sm font-bold text-brand'}>{data.user(e.assignedTo)?.name || 'Unassigned'}</span> }] : []),
          { key: 'createdAt', sort: 'createdAt', header: 'Received', render: (e) => <span className="text-sm">{fmtDate(e.createdAt)}</span> },
          { key: 'status', sort: 'status', header: 'Status', render: (e) => <StatusBadge status={e.status} /> },
        ]}
      />
      <Pagination page={list.page} pages={list.pages} total={list.total} limit={list.limit} onPage={list.setPage} noun="enquiries" />
      {open && <EnquiryDetailModal enquiryId={open} canAssign={all} onClose={() => setOpen(null)} />}
    </>
  );
}
