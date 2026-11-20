import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import EmptyState from './EmptyState';
import { cn } from '../../lib/utils';

export default function DataTable({ columns, rows, empty, onRowClick, rowKey = 'id', sort, dir, onSort, loading }) {
  if (!rows.length && !loading) return empty || <EmptyState title="Nothing to show" message="No records match your filters." />;

  return (
    <div className={cn('card overflow-hidden transition-opacity', loading && 'opacity-60')} aria-busy={loading || undefined}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-sunken/60">
              {columns.map((c) => {
                const active = c.sort && sort === c.sort;
                const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <th key={c.key} aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : undefined} className={cn('whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted', c.className)}>
                    {c.sort && onSort ? (
                      <button type="button" onClick={() => onSort(c.sort)} className={cn('inline-flex items-center gap-1.5 font-bold uppercase tracking-wider transition hover:text-ink', active && 'text-brand')}>
                        {c.header}<Icon size={13} className={active ? '' : 'opacity-50'} />
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row[rowKey]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={{ animationDelay: `${Math.min(i, 12) * 30}ms` }}
                className={cn('animate-fade-in border-b border-line/70 last:border-0 transition-colors', onRowClick && 'cursor-pointer hover:bg-sunken/60')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3.5 align-middle', c.className)}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && loading && <p className="p-8 text-center text-sm text-muted">Loading...</p>}
      </div>
    </div>
  );
}
