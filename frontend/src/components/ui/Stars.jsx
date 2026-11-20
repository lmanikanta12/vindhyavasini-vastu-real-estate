import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Stars({ value = 0, size = 16, className }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? 'fill-fire text-fire' : 'text-line'} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onMouseEnter={() => setHover(n)} onClick={() => onChange(n)} className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand">
          <Star size={32} className={n <= shown ? 'fill-fire text-fire' : 'text-line'} />
        </button>
      ))}
    </div>
  );
}

export function RatingBadge({ rating, className }) {
  if (!rating?.count) return <span className={cn('text-xs text-muted', className)}>No reviews yet</span>;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-bold', className)}>
      <Star size={13} className="fill-fire text-fire" /> {rating.avg.toFixed(1)} <span className="font-normal text-muted">({rating.count})</span>
    </span>
  );
}
