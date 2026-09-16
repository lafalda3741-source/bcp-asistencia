import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, type = 'info', duration = 4000) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, type }]);
      if (duration) setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const api = {
    success: (msg) => push(msg, 'success'),
    error: (msg) => push(msg, 'error'),
    info: (msg) => push(msg, 'info')
  };

  const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
  const COLORS = {
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    info: 'bg-slate-800'
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[999] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              className={`${COLORS[t.type]} text-white rounded-lg shadow-lg px-4 py-3 flex items-start gap-2 animate-[fadeIn_0.15s_ease-out]`}
            >
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="text-sm leading-snug flex-1">{t.message}</p>
              <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}
