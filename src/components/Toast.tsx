import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastId = 0;
const listeners: ((toast: Toast) => void)[] = [];

export function showToast(message: string, type: ToastType = 'success') {
  const toast = { id: ++toastId, message, type };
  listeners.forEach((fn) => fn(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 2500);
    };
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return createPortal(
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4 safe-area-top">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg animate-slide-up bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
        >
          {toast.type === 'success' && <CheckCircle size={20} className="text-success-500 shrink-0" />}
          {toast.type === 'error' && <AlertCircle size={20} className="text-error-500 shrink-0" />}
          {toast.type === 'info' && <Info size={20} className="text-primary-500 shrink-0" />}
          <span className="text-sm font-medium text-gray-900 dark:text-white">{toast.message}</span>
        </div>
      ))}
    </div>,
    document.body
  );
}
