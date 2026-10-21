'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const recentMessagesRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, title?: string, duration = 3500) => {
    if (!message || typeof message !== 'string') return;
    const trimmedMsg = message.trim();
    if (!trimmedMsg) return;

    // Rate-limiting / deduplication: Don't repeat the exact same message within 2.5 seconds
    const now = Date.now();
    const lastSeen = recentMessagesRef.current.get(trimmedMsg);
    if (lastSeen && now - lastSeen < 2500) {
      return;
    }
    recentMessagesRef.current.set(trimmedMsg, now);

    // Garbage-collect old keys from recentMessagesRef
    if (recentMessagesRef.current.size > 50) {
      for (const [k, v] of recentMessagesRef.current.entries()) {
        if (now - v > 10000) recentMessagesRef.current.delete(k);
      }
    }

    const id = `toast-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, type, message: trimmedMsg, title, duration };

    // Limit to max 3 toasts at any time to prevent layout cascades
    setToasts((prev) => [...prev.slice(-2), newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  // Stable memoized toast interface so useEffect dependencies never cause infinite re-render loops
  const toast = useMemo(() => ({
    success: (message: string, title?: string) => addToast('success', message, title, 3500),
    error: (message: string, title?: string) => addToast('error', message, title, 4500),
    warning: (message: string, title?: string) => addToast('warning', message, title, 4000),
    info: (message: string, title?: string) => addToast('info', message, title, 3500),
  }), [addToast]);

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'error':
        return <AlertCircle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'info':
      default:
        return <Info size={16} className="text-sky-600 dark:text-sky-400 shrink-0" />;
    }
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800/80 text-slate-800 dark:text-slate-100 shadow-lg shadow-emerald-950/10';
      case 'error':
        return 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800/80 text-slate-800 dark:text-slate-100 shadow-lg shadow-rose-950/10';
      case 'warning':
        return 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800/80 text-slate-800 dark:text-slate-100 shadow-lg shadow-amber-950/10';
      case 'info':
      default:
        return 'bg-white dark:bg-slate-900 border-sky-200 dark:border-sky-800/80 text-slate-800 dark:text-slate-100 shadow-lg shadow-sky-950/10';
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl border text-xs transition-all duration-200 animate-slideUp ${getToastStyles(
              t.type
            )}`}
          >
            {getToastIcon(t.type)}
            <div className="flex-1 min-w-0">
              {t.title && <div className="font-bold text-slate-900 dark:text-white mb-0.5">{t.title}</div>}
              <div className="text-slate-600 dark:text-slate-300 leading-relaxed break-words">{t.message}</div>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}
