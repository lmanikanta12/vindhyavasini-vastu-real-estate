import { useState } from 'react';
import { cn } from '../../lib/utils';

const BG = { brand: 'bg-brand', water: 'bg-water', fire: 'bg-fire', air: 'bg-air', space: 'bg-space border border-line' };

/** Real photograph for a Vastu element (Unsplash). Falls back to the element colour if the photo cannot load. */
export default function ElementImage({ el, size = 160, className, style }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span title={el.name} style={style} className={cn('block', BG[el.color], className)} />;
  return (
    <img
      src={`https://images.unsplash.com/${el.photo}?auto=format&fit=crop&w=${size}&h=${size}&q=70`}
      alt={el.name}
      title={el.name}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={style}
      className={cn('block object-cover', className)}
    />
  );
}
