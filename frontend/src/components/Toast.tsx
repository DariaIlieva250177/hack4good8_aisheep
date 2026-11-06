import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import './Toast.css';
import { GlassLayer } from './glass/GlassButton';

interface ToastOptions {
  message: string;
  action?: { label: string; onClick: () => void };
  /** ms; defaults to 3000, or 5000 when there is an action */
  duration?: number;
}

const ToastContext = createContext<(t: ToastOptions) => void>(() => undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
  const timer = useRef<number>(undefined);

  const show = useCallback((t: ToastOptions) => {
    window.clearTimeout(timer.current);
    setToast({ ...t, key: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), t.duration ?? (t.action ? 5000 : 3000));
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {toast && (
          <div className="toast glass" key={toast.key}>
            <span>{toast.message}</span>
            {toast.action && (
              <button
                type="button"
                className="toast__action glass-host"
                onClick={() => {
                  toast.action!.onClick();
                  setToast(null);
                }}
              >
                <GlassLayer radius={16} tone="primary" />
                <span>{toast.action.label}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
