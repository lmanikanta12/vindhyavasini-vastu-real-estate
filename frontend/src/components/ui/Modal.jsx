import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

const SIZES = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };

export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  const dirty = useRef(false);
  useEffect(() => { dirty.current = false; }, [open]);

  // Clicking outside or pressing Esc asks first when the person has typed something, so nothing is lost by accident.
  const softClose = useCallback(() => {
    if (dirty.current && !window.confirm('Close this window? What you typed will be lost.')) return;
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && softClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, softClose]);

  if (!open) return null;

  return createPortal(
    <div className="no-print fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-ink/60" onClick={softClose} />
      <div onInput={() => { dirty.current = true; }} onChange={() => { dirty.current = true; }} className={cn('relative flex max-h-[92vh] w-full animate-scale-in flex-col overflow-clip rounded-t-3xl border border-line bg-surface shadow-lift sm:rounded-3xl', SIZES[size])}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold leading-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-icon -mr-2 -mt-1 shrink-0" aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>
        <div className="relative flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line bg-sunken/40 px-5 py-3.5 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
