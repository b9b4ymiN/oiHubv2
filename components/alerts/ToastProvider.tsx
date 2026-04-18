'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { AlertEvent } from '@/lib/alerts/types';

interface ToastItem {
  event: AlertEvent;
  dismissed: boolean;
  autoDismissAt: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (event: AlertEvent) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToasts() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const MAX_TOASTS = 5;

  const addToast = useCallback((event: AlertEvent) => {
    const autoDismissMs = event.severity === 'critical' ? 10000 : 5000;
    const toast: ToastItem = {
      event,
      dismissed: false,
      autoDismissAt: Date.now() + autoDismissMs,
    };

    setToasts(prev => {
      const updated = [toast, ...prev].slice(0, MAX_TOASTS);
      return updated;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.event.id !== id));
  }, []);

  // Auto-dismiss expired toasts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setToasts(prev => prev.filter(t => !t.dismissed && now < t.autoDismissAt));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for toast events from the alert system
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<AlertEvent>;
      if (customEvent.detail) {
        addToast(customEvent.detail);
      }
    };

    window.addEventListener('alert-toast', handler);
    return () => window.removeEventListener('alert-toast', handler);
  }, [addToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, dismissToast }}>
      {children}
      {/* Toast stack rendered here */}
      <div className="fixed top-20 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map(toast => (
          <ToastCard key={toast.event.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const { event } = toast;
  const severityStyles = {
    critical: 'bg-red-900/90 border-red-500 text-red-100',
    warning: 'bg-yellow-900/90 border-yellow-500 text-yellow-100',
    info: 'bg-blue-900/90 border-blue-500 text-blue-100',
  };

  return (
    <div className={`rounded-lg border p-3 shadow-lg backdrop-blur-sm ${severityStyles[event.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{event.ruleName}</div>
          <div className="text-xs mt-1 opacity-90">{event.symbol} • {event.interval}</div>
          <div className="text-xs mt-1">{event.message}</div>
        </div>
        <button
          onClick={() => onDismiss(event.id)}
          className="text-current opacity-50 hover:opacity-100 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  );
}
