'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, title?: string, duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastMessage = { id, type, message, title, duration };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: useCallback((message: string, title?: string) => addToast('success', message, title), [addToast]),
    error: useCallback((message: string, title?: string) => addToast('error', message, title, 4500), [addToast]),
    warning: useCallback((message: string, title?: string) => addToast('warning', message, title, 4000), [addToast]),
    info: useCallback((message: string, title?: string) => addToast('info', message, title), [addToast]),
  };

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />;
      case 'error':
        return <AlertCircle size={18} className="text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle size={18} className="text-amber-500 shrink-0" />;
      case 'info':
      default:
        return <Info size={18} className="text-blue-500 shrink-0" />;
    }
  };

  const getToastStyles = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-white border-emerald-200 text-slate-800 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/20';
      case 'error':
        return 'bg-white border-rose-200 text-slate-800 shadow-lg shadow-rose-500/10 ring-1 ring-rose-400/20';
      case 'warning':
        return 'bg-white border-amber-200 text-slate-800 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/20';
      case 'info':
      default:
        return 'bg-white border-blue-200 text-slate-800 shadow-lg shadow-blue-500/10 ring-1 ring-blue-400/20';
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
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border text-xs transition-all duration-300 animate-slideUp ${getToastStyles(
              t.type
            )}`}
          >
            {getToastIcon(t.type)}
            <div className="flex-1 min-w-0">
              {t.title && <div className="font-bold text-slate-900 mb-0.5">{t.title}</div>}
              <div className="text-slate-600 leading-relaxed break-words">{t.message}</div>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
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
