import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';
import PropertyArt from './PropertyArt';
import { cn, imgUrl } from '../../lib/utils';

function Lightbox({ images, start, title, onClose }) {
  const [i, setI] = useState(start);
  const touch = useRef(null);
  const closeRef = useRef(null);
  const total = images.length;
  const go = useCallback((d) => setI((n) => (n + d + total) % total), [total]);

  useEffect(() => {
    const prevFocus = document.activeElement;
    closeRef.current?.focus();
    const key = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
      prevFocus?.focus?.();
    };
  }, [go, onClose]);

  const onTouchEnd = (e) => {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="fixed inset-0 z-[120] flex flex-col bg-black/95 animate-fade-in" role="dialog" aria-modal="true" aria-label={`${title} photo viewer`}>
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="min-w-0 truncate text-sm font-bold">{title} <span className="ml-2 font-normal text-white/70" aria-live="polite">{i + 1} / {total}</span></p>
        <button ref={closeRef} onClick={onClose} className="rounded-full p-2 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white" aria-label="Close viewer"><X size={24} /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-16" onTouchStart={(e) => { touch.current = e.touches[0].clientX; }} onTouchEnd={onTouchEnd} onClick={(e) => e.target === e.currentTarget && onClose()}>
        {total > 1 && <button onClick={() => go(-1)} className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white backdrop-blur transition hover:bg-white/30 sm:left-4" aria-label="Previous photo"><ChevronLeft size={26} /></button>}
        <img key={i} src={imgUrl(images[i], 1800)} alt={`${title}, photo ${i + 1} of ${total}`} className="max-h-full max-w-full animate-fade-in select-none object-contain" draggable={false} referrerPolicy="no-referrer" />
        {total > 1 && <button onClick={() => go(1)} className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white backdrop-blur transition hover:bg-white/30 sm:right-4" aria-label="Next photo"><ChevronRight size={26} /></button>}
      </div>
      {total > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 py-3">
          {images.map((src, n) => (
            <button key={n} onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`} aria-current={n === i} className={cn('h-14 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition', n === i ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100')}>
              <img src={imgUrl(src, 200)} alt="" className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PropertyGallery({ property }) {
  const images = property.images || [];
  const [i, setI] = useState(0);
  const [full, setFull] = useState(false);
  const total = images.length;
  const idx = Math.min(i, Math.max(0, total - 1));
  const step = (d) => setI((n) => (Math.min(n, total - 1) + d + total) % total);

  if (!total) {
    return <div className="aspect-[16/10] overflow-hidden rounded-3xl border border-line bg-sunken sm:aspect-[16/9]"><PropertyArt property={property} width={1400} /></div>;
  }

  return (
    <div>
      <div className="group relative aspect-[16/10] overflow-hidden rounded-3xl border border-line bg-sunken sm:aspect-[16/9]">
        <button onClick={() => setFull(true)} className="block h-full w-full cursor-zoom-in" aria-label={`Open photo ${idx + 1} of ${total} full screen`}>
          <PropertyArt key={idx} property={property} image={images[idx]} width={1400} className="animate-fade-in" />
        </button>
        {total > 1 && (
          <>
            <button onClick={() => step(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white opacity-90 backdrop-blur transition hover:bg-black/65 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" aria-label="Previous photo"><ChevronLeft size={22} /></button>
            <button onClick={() => step(1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white opacity-90 backdrop-blur transition hover:bg-black/65 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100" aria-label="Next photo"><ChevronRight size={22} /></button>
          </>
        )}
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white backdrop-blur">{idx + 1} / {total}</span>
        <button onClick={() => setFull(true)} className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition hover:bg-black/75"><Maximize2 size={14} /> Full screen</button>
      </div>
      {total > 1 && (
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
          {images.map((src, n) => (
            <button key={n} onClick={() => setI(n)} aria-label={`Show photo ${n + 1}`} aria-current={n === idx} className={cn('h-16 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition', idx === n ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100')}>
              <img src={imgUrl(src, 240)} alt={`Thumbnail ${n + 1}`} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
            </button>
          ))}
        </div>
      )}
      {full && <Lightbox images={images} start={idx} title={property.title} onClose={() => setFull(false)} />}
    </div>
  );
}
