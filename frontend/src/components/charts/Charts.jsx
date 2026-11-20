import { useId } from 'react';

export const CHART_COLORS = {
  brand: 'rgb(var(--c-brand))',
  water: 'rgb(var(--c-water))',
  fire: 'rgb(var(--c-fire))',
  air: 'rgb(var(--c-air))',
  muted: 'rgb(var(--c-muted) / 0.55)',
};
const ORDER = ['brand', 'water', 'fire', 'air', 'muted'];
const colorAt = (i, c) => CHART_COLORS[c] || CHART_COLORS[ORDER[i % ORDER.length]];

export function BarChart({ data, height = 200, format = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-2 sm:gap-3" style={{ height: height + 44 }}>
      {data.map((d, i) => (
        <div key={d.label} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
          <span className="text-[11px] font-bold text-muted opacity-0 transition group-hover:opacity-100">{format(d.value)}</span>
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-[44px] origin-bottom animate-grow-up rounded-t-lg transition-opacity group-hover:opacity-80"
              style={{ height: `${Math.max(3, (d.value / max) * 100)}%`, background: colorAt(i, d.color), animationDelay: `${i * 70}ms` }}
              title={`${d.label}: ${format(d.value)}`}
            />
          </div>
          <span className="w-full truncate text-center text-[11px] font-semibold text-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({ data, size = 170, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 52;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 140 140" className="-rotate-90">
          <circle cx="70" cy="70" r={r} fill="none" stroke="rgb(var(--c-sunken))" strokeWidth="18" />
          {data.map((d, i) => {
            const len = (d.value / total) * circ;
            const el = (
              <circle
                key={d.label}
                cx="70"
                cy="70"
                r={r}
                fill="none"
                stroke={colorAt(i, d.color)}
                strokeWidth="18"
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-offset}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-semibold">{centerValue ?? total}</span>
          <span className="text-[11px] font-bold text-muted">{centerLabel || 'Total'}</span>
        </div>
      </div>
      <ul className="grid w-full min-w-0 grid-cols-2 gap-x-6 gap-y-2">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: colorAt(i, d.color) }} />
              <span className="truncate font-semibold">{d.label}</span>
            </span>
            <span className="font-bold text-muted">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AreaChart({ data, height = 190, color = 'brand', format = (v) => v }) {
  const gid = useId().replace(/:/g, '');
  const w = 400;
  const h = 140;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const pts = data.map((d, i) => [i * step, h - (d.value / max) * (h - 14) - 4]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const stroke = CHART_COLORS[color];
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ height }} className="w-full overflow-visible">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={w} y1={h * g} y2={h * g} stroke="rgb(var(--c-line))" strokeDasharray="3 5" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={`url(#${gid})`} className="animate-fade-in" />
        <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" pathLength="1" strokeDasharray="1" style={{ '--len': 1 }} className="animate-draw" />
      </svg>
      <div className="mt-2 flex justify-between text-[11px] font-semibold text-muted">
        {data.map((d) => (
          <span key={d.label} title={`${d.label}: ${format(d.value)}`}>
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function HBars({ data, format = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="space-y-3.5">
      {data.map((d, i) => (
        <li key={d.label}>
          <div className="mb-1.5 flex justify-between text-[13px]">
            <span className="font-bold">{d.label}</span>
            <span className="font-semibold text-muted">{format(d.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-sunken">
            <div className="h-full origin-left animate-grow-right rounded-full" style={{ width: `${(d.value / max) * 100}%`, background: colorAt(i, d.color), animationDelay: `${i * 90}ms` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
