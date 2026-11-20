import { cn } from '../../lib/utils';

const TONES = {
  brand: 'bg-brand/15 text-brand',
  water: 'bg-water/25 text-ink',
  fire: 'bg-fire/25 text-ink',
  air: 'bg-air/25 text-ink',
};

export default function StatCard({ icon: Icon, label, value, hint, tone = 'brand', index = 0 }) {
  return (
    <div className="card card-hover animate-fade-up p-5" style={{ animationDelay: `${index * 70}ms` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-muted">{label}</p>
          <p className="mt-1.5 font-display text-3xl font-semibold leading-none">{value}</p>
        </div>
        {Icon && (
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
            <Icon size={21} />
          </span>
        )}
      </div>
      {hint && <p className="mt-3 text-xs text-muted">{hint}</p>}
    </div>
  );
}
