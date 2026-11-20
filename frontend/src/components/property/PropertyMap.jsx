import { useState } from 'react';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function PropertyMap({ property: p }) {
  const [type, setType] = useState('m');
  const hasPin = Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat !== null && p.lng !== null;
  const place = hasPin ? `${p.lat},${p.lng}` : [p.address, p.location, p.city].filter(Boolean).join(', ');
  const embed = `https://www.google.com/maps?q=${encodeURIComponent(place)}&z=15&t=${type}&output=embed`;
  const open = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
  const route = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;

  return (
    <section aria-labelledby="map-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="map-title" className="text-2xl font-semibold">Location and surroundings</h2>
        <div className="flex gap-2" role="group" aria-label="Map type">
          {[['m', 'Map'], ['k', 'Satellite']].map(([k, label]) => <button key={k} onClick={() => setType(k)} aria-pressed={type === k} className={cn('chip', type === k && 'chip-active')}>{label}</button>)}
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border border-line bg-sunken">
        <iframe key={embed} title={`Map showing ${p.title}`} src={embed} className="block h-72 w-full border-0 sm:h-96" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="flex items-center gap-2 text-muted"><MapPin size={16} className="text-brand" /> {[p.address, p.location, p.city].filter(Boolean).join(', ')}</p>
        <div className="flex gap-4 font-bold">
          <a href={open} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand hover:underline">Open in Google Maps <ExternalLink size={14} /></a>
          <a href={route} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand hover:underline"><Navigation size={14} /> Directions</a>
        </div>
      </div>
    </section>
  );
}
