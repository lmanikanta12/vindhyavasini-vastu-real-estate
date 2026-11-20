import { useState } from 'react';
import { Eye, EyeOff, MessageSquareQuote } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import SearchInput from '../../components/ui/SearchInput';
import DataTable from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { Stars } from '../../components/ui/Stars';
import { Select } from '../../components/ui/Field';
import useServerList from '../../hooks/useServerList';
import { useData } from '../../context/DataContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/utils';

export default function AdminReviews() {
  const data = useData();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [rating, setRating] = useState('');
  const [hidden, setHidden] = useState('');
  const list = useServerList('/reviews', { filters: { kind, rating, hidden }, search: q, limit: 15, sort: 'createdAt', dir: 'desc' });

  const toggle = async (x) => {
    try {
      await api(`/reviews/${x.id}`, { method: 'PATCH', body: { hidden: !x.hidden } });
      toast(x.hidden ? 'Review is visible again.' : 'Review hidden from the website.');
      list.reload();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <PageHeader title="Reviews" subtitle="Ratings left by customers after completed visits and consultations. Hide a review that is abusive or untrue." />
      <section className="card mb-5 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Filters">
        <div>
          <span className="label">Search</span>
          <SearchInput value={q} onChange={setQ} placeholder="Name, reference, comment" />
        </div>
        <Select label="Type" value={kind} onChange={(e) => setKind(e.target.value)} options={[{ value: '', label: 'All' }, { value: 'consultation', label: 'Consultations' }, { value: 'visit', label: 'Site visits' }]} />
        <Select label="Stars" value={rating} onChange={(e) => setRating(e.target.value)} options={[{ value: '', label: 'Any' }, ...[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` }))]} />
        <Select label="Visibility" value={hidden} onChange={(e) => setHidden(e.target.value)} options={[{ value: '', label: 'All' }, { value: 'false', label: 'Visible' }, { value: 'true', label: 'Hidden' }]} />
      </section>
      <DataTable
        rows={list.items}
        loading={list.loading}
        sort={list.sort}
        dir={list.dir}
        onSort={list.onSort}
        empty={<EmptyState icon={MessageSquareQuote} title="No reviews found" message="Reviews appear here after customers rate a completed booking." />}
        columns={[
          { key: 'createdAt', sort: 'createdAt', header: 'Date', render: (x) => <span className="whitespace-nowrap text-sm font-semibold">{fmtDate(x.createdAt)}</span> },
          { key: 'rating', sort: 'rating', header: 'Rating', render: (x) => <Stars value={x.rating} size={15} /> },
          { key: 'target', header: 'For', render: (x) => <div><p className="text-sm font-bold">{data.user(x.targetId)?.name || 'Staff'}</p><p className="text-xs text-muted">{x.kind === 'consultation' ? 'Consultation' : 'Site visit'} · {x.bookingRef}</p></div> },
          { key: 'customerName', header: 'By', render: (x) => <span className="text-sm">{x.customerName}</span> },
          { key: 'comment', header: 'Comment', render: (x) => <span className="block max-w-[26rem] text-sm text-muted">{x.comment || '-'}</span> },
          { key: 'hidden', header: 'Status', render: (x) => <Badge tone={x.hidden ? 'fire' : 'air'}>{x.hidden ? 'Hidden' : 'Visible'}</Badge> },
          { key: 'actions', header: '', render: (x) => <button className="btn btn-ghost btn-sm border border-line" onClick={() => toggle(x)}>{x.hidden ? <><Eye size={15} /> Show</> : <><EyeOff size={15} /> Hide</>}</button> },
        ]}
      />
      <Pagination page={list.page} pages={list.pages} total={list.total} limit={list.limit} onPage={list.setPage} noun="reviews" />
    </>
  );
}
