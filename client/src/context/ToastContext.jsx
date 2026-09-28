import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback((message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    if (duration > 0) setTimeout(() => remove(id), duration);
    return id;
  }, [remove]);

  const api = { push, remove, success: (m, d) => push(m, 'success', d), error: (m, d) => push(m, 'error', d), info: (m, d) => push(m, 'info', d) };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`animate-slide-up card flex items-start gap-3 p-4 ${
              t.type === 'success' ? 'border-emerald-200 bg-emerald-50/80'
              : t.type === 'error' ? 'border-rose-200 bg-rose-50/80'
              : 'border-violet-200 bg-violet-50/80'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />}
            <p className="text-sm text-navy-700 flex-1">{t.message}</p>
            <button onClick={() => remove(t.id)} className="text-navy-400 hover:text-navy-600 -mr-1 -mt-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
