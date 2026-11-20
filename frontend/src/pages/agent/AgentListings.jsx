import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, Pencil, Plus, Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import Tabs from '../../components/ui/Tabs';
import DataTable from '../../components/ui/DataTable';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import PropertyArt from '../../components/property/PropertyArt';
import PropertyFormModal from '../../components/property/PropertyFormModal';
import { Select } from '../../components/ui/Field';
import { StatusBadge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { PROPERTY_STATUSES } from '../../lib/constants';
import Pagination from '../../components/ui/Pagination';
import useServerList from '../../hooks/useServerList';
import { formatPrice } from '../../lib/utils';

export default function AgentListings({ all = false }) {
  const { user } = useAuth();
  const data = useData();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [form, setForm] = useState({ open: false, item: null });
  const [del, setDel] = useState(null);

  const list = useServerList('/properties', { filters: { category: cat, mine: all ? undefined : 'true' }, search: q, limit: 10, sort: 'createdAt', dir: 'desc', collection: 'properties' });
  const rows = list.items;
  const cats = ['all', 'Residential', 'Commercial', 'Rental', 'Plot'];

  return (
    <>
      <PageHeader
        title={all ? 'Property listings' : 'My listings'}
        subtitle="Add, edit, publish and update availability of properties."
        actions={<button className="btn btn-primary" onClick={() => setForm({ open: true, item: null })}><Plus size={18} /> Add listing</button>}
      />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={cat} onChange={setCat} items={cats.map((c) => ({ key: c, label: c === 'all' ? 'All' : c }))} />
        <SearchInput className="w-full lg:w-72" value={q} onChange={setQ} placeholder="Search listings" />
      </div>

      <DataTable
        rows={rows}
        loading={list.loading}
        sort={list.sort}
        dir={list.dir}
        onSort={list.onSort}
        columns={[
          {
            key: 'title', sort: 'title', header: 'Property',
            render: (p) => (
              <div className="flex items-center gap-3">
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded-lg"><PropertyArt property={p} /></div>
                <div className="min-w-0"><Link to={`/properties/${p.id}`} className="block max-w-[16rem] truncate font-bold hover:text-brand">{p.title}</Link><p className="text-xs text-muted">{p.ref} · {p.location}, {p.city}</p></div>
              </div>
            ),
          },
          { key: 'category', sort: 'category', header: 'Category', render: (p) => <span className="text-sm">{p.category}<span className="block text-xs text-muted">{p.type}</span></span> },
          { key: 'price', sort: 'price', header: 'Price', render: (p) => <span className="font-bold text-brand">{formatPrice(p.price, p.listingType)}</span> },
          ...(all ? [{ key: 'agent', header: 'Agent', render: (p) => <span className="text-sm">{data.user(p.agentId)?.name || '-'}</span> }] : []),
          {
            key: 'status', sort: 'status', header: 'Availability',
            render: (p) => (
              <select className="rounded-lg border border-line bg-surface px-2 py-1.5 text-xs font-bold" value={p.status} onChange={(e) => { const st = e.target.value; data.update('properties', p.id, { status: st }).then((ok) => ok && toast(`${p.ref} marked ${st.toLowerCase()}.`)); }} aria-label="Availability">
                {PROPERTY_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            ),
          },
          { key: 'published', header: 'Visibility', render: (p) => <StatusBadge status={p.published ? 'Published' : 'Draft'} /> },
          {
            key: 'actions', header: '', className: 'text-right',
            render: (p) => (
              <div className="flex justify-end gap-0.5">
                <button className="btn-icon h-9 w-9" title={p.published ? 'Unpublish' : 'Publish'} onClick={() => { data.update('properties', p.id, { published: !p.published }).then((ok) => ok && toast(p.published ? 'Listing hidden from website.' : 'Listing published.')); }}>{p.published ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                <button className="btn-icon h-9 w-9" title="Edit" onClick={() => setForm({ open: true, item: p })}><Pencil size={17} /></button>
                <button className="btn-icon h-9 w-9" title="Delete" onClick={() => setDel(p)}><Trash2 size={17} /></button>
              </div>
            ),
          },
        ]}
      />

      <Pagination page={list.page} pages={list.pages} total={list.total} limit={list.limit} onPage={list.setPage} noun="listings" />
      <PropertyFormModal open={form.open} property={form.item} isAdmin={all} onClose={() => setForm({ open: false, item: null })} />
      <ConfirmDialog open={!!del} onClose={() => setDel(null)} danger title="Delete this listing?" message={`${del?.title} will be permanently removed from the website and your dashboard.`} confirmLabel="Delete listing" onConfirm={() => data.remove('properties', del.id).then((ok) => ok && toast('Listing deleted.'))} />
    </>
  );
}
