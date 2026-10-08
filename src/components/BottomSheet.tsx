import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  fullHeight?: boolean;
}

export function BottomSheet({ open, onClose, title, children, fullHeight = false }: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />
      <div
        className={`relative bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl animate-slide-up flex flex-col ${
          fullHeight ? 'h-[90vh]' : 'max-h-[85vh]'
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full absolute left-1/2 -translate-x-1/2 top-2" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-2">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mt-2"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 pt-3" style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))' }}>{children}</div>
      </div>
    </div>
  );
}
