import { STATUS_TONE } from '../../lib/constants';
import { cn } from '../../lib/utils';

const TONES = {
  air: 'border-air/60 bg-air/20',
  fire: 'border-fire/60 bg-fire/20',
  water: 'border-water/70 bg-water/25',
  brand: 'border-brand/50 bg-brand/15',
  muted: 'border-line bg-sunken text-muted',
};

export default function Badge({ children, tone = 'muted', className }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-bold text-ink', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }) {
  return (
    <Badge tone={STATUS_TONE[status] || 'muted'} className={className}>
      {status}
    </Badge>
  );
}
