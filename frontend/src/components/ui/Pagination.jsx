import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

const windowed = (page, pages) => {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => { if (i && n - sorted[i - 1] > 1) out.push('gap'); out.push(n); });
  return out;
};

export default function Pagination({ page, pages, total, limit, onPage, noun = 'results' }) {
  if (!total) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  const btn = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold transition disabled:opacity-40';
  return (
    <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted">Showing <b className="text-ink">{from}-{to}</b> of <b className="text-ink">{total}</b> {noun}</p>
      {pages > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button className={cn(btn, 'border border-line hover:bg-sunken')} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={17} /></button>
          {windowed(page, pages).map((n, i) => n === 'gap'
            ? <span key={`g${i}`} className="px-1 text-muted">...</span>
            : <button key={n} onClick={() => onPage(n)} aria-current={n === page ? 'page' : undefined} className={cn(btn, n === page ? 'bg-brand text-on-brand' : 'border border-line hover:bg-sunken')}>{n}</button>)}
          <button className={cn(btn, 'border border-line hover:bg-sunken')} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={17} /></button>
        </nav>
      )}
    </div>
  );
}
