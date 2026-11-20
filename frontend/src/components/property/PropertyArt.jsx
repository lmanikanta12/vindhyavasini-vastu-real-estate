import { useState } from 'react';
import { cn, imgUrl } from '../../lib/utils';

const SCHEMES = [
  { sky: '--c-fire', wall: '--c-surface', roof: '--c-brand', ground: '--c-air' },
  { sky: '--c-water', wall: '--c-surface', roof: '--c-brand-deep', ground: '--c-air' },
  { sky: '--c-brand', wall: '--c-space', roof: '--c-brand-deep', ground: '--c-fire' },
  { sky: '--c-air', wall: '--c-surface', roof: '--c-brand', ground: '--c-fire' },
];
const rgb = (v, a = 1) => `rgb(var(${v}) / ${a})`;

function Scene({ kind, s }) {
  const wall = rgb(s.wall);
  const roof = rgb(s.roof);
  const win = rgb('--c-water', 0.9);
  const door = rgb('--c-brand-deep');
  if (kind === 'plot') {
    return (
      <g>
        <polygon points="40,180 360,180 320,120 80,120" fill={rgb(s.ground, 0.55)} />
        <polygon points="40,180 360,180 345,200 55,200" fill={rgb(s.ground, 0.85)} />
        {[70, 120, 170, 220, 270, 320].map((x) => (
          <rect key={x} x={x - 2} y="150" width="4" height="26" rx="1" fill={door} opacity=".7" />
        ))}
        <path d="M70 160 H330" stroke={door} strokeWidth="2" opacity=".6" />
        <path d="M200 60 l26 -34 l26 34 z" fill={rgb('--c-fire')} opacity=".9" />
      </g>
    );
  }
  if (kind === 'apartment' || kind === 'office') {
    return (
      <g>
        <rect x="120" y="42" width="160" height="150" rx="6" fill={wall} />
        <rect x="108" y="36" width="184" height="12" rx="4" fill={roof} />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={140 + c * 46} y={62 + r * 30} width="26" height="18" rx="3" fill={win} />)
        )}
        <rect x="186" y="164" width="28" height="28" rx="3" fill={door} />
        <rect x="60" y="100" width="48" height="92" rx="5" fill={rgb(s.wall, 0.8)} />
        <rect x="292" y="120" width="44" height="72" rx="5" fill={rgb(s.wall, 0.8)} />
      </g>
    );
  }
  if (kind === 'shop') {
    return (
      <g>
        <rect x="80" y="82" width="240" height="110" rx="6" fill={wall} />
        <path d="M70 82 H330 L318 56 H82 Z" fill={roof} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={82 + i * 39} y="56" width="19.5" height="26" fill={rgb('--c-surface', 0.35)} />
        ))}
        <rect x="100" y="106" width="100" height="62" rx="4" fill={win} />
        <rect x="224" y="106" width="64" height="86" rx="4" fill={door} />
      </g>
    );
  }

  return (
    <g>
      <rect x="110" y="96" width="180" height="96" rx="5" fill={wall} />
      <path d="M92 100 L200 40 L308 100 Z" fill={roof} />
      <rect x="132" y="116" width="40" height="30" rx="4" fill={win} />
      <rect x="228" y="116" width="40" height="30" rx="4" fill={win} />
      <rect x="182" y="140" width="36" height="52" rx="4" fill={door} />
      <rect x="260" y="60" width="16" height="30" fill={roof} />
      <circle cx="68" cy="150" r="26" fill={rgb(s.ground, 0.95)} />
      <rect x="64" y="160" width="8" height="32" fill={door} opacity=".7" />
      <circle cx="334" cy="156" r="20" fill={rgb(s.ground, 0.8)} />
    </g>
  );
}

function kindOf(p) {
  if (!p) return 'house';
  if (p.category === 'Plot') return 'plot';
  if (/apartment|studio|penthouse/i.test(p.type)) return 'apartment';
  if (/office/i.test(p.type)) return 'office';
  if (/shop|showroom|warehouse/i.test(p.type)) return 'shop';
  return 'house';
}

export default function PropertyArt({ property, className, image, width = 800 }) {
  const photo = image ?? property?.images?.[0];
  const [failed, setFailed] = useState(null);
  if (photo && failed !== photo) {
    return (
      <img
        src={imgUrl(photo, width)}
        alt={property?.title || 'Property'}
        className={cn('h-full w-full object-cover', className)}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailed(photo)}
      />
    );
  }
  const s = SCHEMES[(property?.art ?? 0) % SCHEMES.length];
  return (
    <svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" className={cn('h-full w-full', className)} role="img" aria-label={property?.title || 'Property illustration'}>
      <rect width="400" height="220" fill={rgb(s.sky, 0.38)} />
      <circle cx="334" cy="46" r="24" fill={rgb('--c-fire', 0.95)} />
      <rect y="186" width="400" height="34" fill={rgb(s.ground, 0.9)} />
      <Scene kind={kindOf(property)} s={s} />
    </svg>
  );
}
