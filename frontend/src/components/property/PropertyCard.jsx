import { Link } from 'react-router-dom';
import { BedDouble, Compass, GitCompareArrows, Heart, MapPin, Maximize } from 'lucide-react';
import PropertyArt from './PropertyArt';
import { StatusBadge } from '../ui/Badge';
import useShortlist from '../../hooks/useShortlist';
import { cn, formatPrice } from '../../lib/utils';

export default function PropertyCard({ property: p, view = 'grid', index = 0, compare, onToggleCompare, compareDisabled }) {
  const { isShortlisted, toggle } = useShortlist();
  const saved = isShortlisted(p.id);
  const list = view === 'list';

  return (
    <article
      className={cn('card card-hover group animate-fade-up overflow-hidden', list && 'sm:flex')}
      style={{ animationDelay: `${Math.min(index, 9) * 60}ms` }}
    >
      <div className={cn('relative overflow-hidden bg-sunken', list ? 'aspect-[16/10] sm:aspect-auto sm:w-72 sm:shrink-0' : 'aspect-[16/10]')}>
        <Link to={`/properties/${p.id}`} className="block h-full w-full transition-transform duration-700 group-hover:scale-105" tabIndex={-1} aria-hidden="true">
          <PropertyArt property={p} />
        </Link>
        <div className="absolute left-3 top-3 flex gap-2">
          <StatusBadge status={p.status} className="bg-surface/90 backdrop-blur" />
          {p.featured && <span className="rounded-full bg-brand px-3 py-1 text-xs font-bold text-on-brand">Featured</span>}
        </div>
        <button
          onClick={() => toggle(p)}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-surface/90 shadow transition-transform duration-200 hover:scale-110 active:scale-90"
          aria-label={saved ? 'Remove from shortlist' : 'Add to shortlist'}
          aria-pressed={saved}
        >
          <Heart size={18} className={cn('transition-colors', saved ? 'fill-brand text-brand' : 'text-ink')} />
        </button>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/properties/${p.id}`} className="min-w-0">
            <h3 className="font-display text-lg font-semibold leading-snug transition-colors group-hover:text-brand">{p.title}</h3>
          </Link>
        </div>
        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
          <MapPin size={15} className="shrink-0" />
          <span className="truncate">
            {p.location}, {p.city} <span aria-hidden="true">·</span> {p.area.toLocaleString('en-IN')} sq ft
          </span>
        </p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-semibold text-muted">
          <span className="inline-flex items-center gap-1.5"><Compass size={15} /> {p.facing}</span>
          {p.bedrooms > 0 && <span className="inline-flex items-center gap-1.5"><BedDouble size={15} /> {p.bedrooms} BHK</span>}
          <span className="inline-flex items-center gap-1.5"><Maximize size={15} /> {p.type}</span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="font-display text-xl font-semibold text-brand">{formatPrice(p.price, p.listingType)}</p>
          {onToggleCompare && (
            <label className={cn('inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-muted transition hover:text-ink', compareDisabled && !compare && 'cursor-not-allowed opacity-50')}>
              <input type="checkbox" className="h-4 w-4 accent-[rgb(var(--c-brand))]" checked={!!compare} disabled={compareDisabled && !compare} onChange={() => onToggleCompare(p)} />
              <GitCompareArrows size={14} /> Compare
            </label>
          )}
        </div>
      </div>
    </article>
  );
}
