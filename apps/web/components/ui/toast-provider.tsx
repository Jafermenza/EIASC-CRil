'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type Toast = { id: number; title: string; message: string; type: 'success' | 'error' | 'warning' | 'info' };
type ToastContextValue = { push: (toast: Omit<Toast, 'id'>) => void };
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setItems((current) => [...current.slice(-3), { ...toast, id }]);
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 5000);
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return <ToastContext.Provider value={value}>{children}<div className="toast-region" aria-live="polite" aria-atomic="false">{items.map((item) => <div className={`toast ${item.type}`} key={item.id}><div className="notification-icon" aria-hidden="true">{item.type === 'success' ? '✓' : item.type === 'error' ? '!' : item.type === 'warning' ? '!' : 'i'}</div><div><strong>{item.title}</strong><p>{item.message}</p></div><button type="button" aria-label="Dismiss notification" onClick={() => setItems((current) => current.filter((x) => x.id !== item.id))}>×</button></div>)}</div></ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}
