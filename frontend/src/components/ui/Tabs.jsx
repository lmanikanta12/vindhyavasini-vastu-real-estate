import { cn } from '../../lib/utils';

export default function Tabs({ items, value, onChange, className }) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-1', className)} role="tablist">
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button key={it.key} role="tab" aria-selected={active} onClick={() => onChange(it.key)} className={cn('chip shrink-0', active && 'chip-active')}>
            {it.label}
            {it.count !== undefined && (
              <span className={cn('rounded-full px-1.5 text-[11px] font-bold', active ? 'bg-brand/20' : 'bg-sunken')}>{it.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
