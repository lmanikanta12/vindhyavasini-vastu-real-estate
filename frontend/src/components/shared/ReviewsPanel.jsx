import { useEffect, useState } from 'react';
import { MessageSquareQuote } from 'lucide-react';
import EmptyState from '../ui/EmptyState';
import Pagination from '../ui/Pagination';
import { Stars } from '../ui/Stars';
import { api } from '../../lib/api';
import { fmtDate } from '../../lib/utils';

export default function ReviewsPanel({ targetId, title = 'Customer reviews' }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ items: [], total: 0, pages: 1, avg: 0 });

  useEffect(() => {
    let live = true;
    api(`/reviews/staff/${targetId}?page=${page}&limit=5`).then((r) => live && setState((s) => ({ ...s, items: r.items, total: r.total, pages: r.pages }))).catch(() => {});
    return () => { live = false; };
  }, [targetId, page]);

  useEffect(() => {
    let live = true;
    api('/reviews/summary').then((r) => live && setState((s) => ({ ...s, avg: r.summary?.[targetId]?.avg || 0 }))).catch(() => {});
    return () => { live = false; };
  }, [targetId]);

  return (
    <section className="card mt-6 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        {state.total > 0 && <span className="flex items-center gap-2 text-sm font-bold"><Stars value={state.avg} /> {state.avg.toFixed(1)} <span className="font-normal text-muted">from {state.total} review{state.total > 1 ? 's' : ''}</span></span>}
      </div>
      {state.items.length === 0 ? (
        <EmptyState icon={MessageSquareQuote} title="No reviews yet" message="Customers can rate you after a completed booking." />
      ) : (
        <>
          <ul className="divide-y divide-line">
            {state.items.map((x) => (
              <li key={x.id} className="py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2"><Stars value={x.rating} size={15} /><span className="text-sm font-bold">{x.customerName}</span></span>
                  <span className="text-xs text-muted">{fmtDate(x.createdAt)} · {x.kind === 'consultation' ? 'Consultation' : 'Site visit'}</span>
                </div>
                {x.comment && <p className="mt-1.5 text-sm leading-relaxed">{x.comment}</p>}
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={state.pages} total={state.total} limit={5} onPage={setPage} noun="reviews" />
        </>
      )}
    </section>
  );
}
