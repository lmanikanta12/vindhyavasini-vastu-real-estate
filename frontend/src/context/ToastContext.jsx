import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = { success: CheckCircle2, info: Info, error: TriangleAlert };
const TONES = { success: 'text-air', info: 'text-water', error: 'text-red-500' };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, type = 'success') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div key={t.id} className="pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-lift">
              <Icon size={20} className={`mt-0.5 shrink-0 ${TONES[t.type]}`} />
              <p className="flex-1 text-sm font-semibold text-ink">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-muted transition hover:text-ink" aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext).toast;
