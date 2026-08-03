import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (message: string, type?: Toast['type']) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto remove after 4.5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Dynamic Multi-Toast Stack Overlay */}
      <div 
        id="toast-global-container" 
        className="fixed top-[4.5rem] right-4 sm:right-8 z-[99999] flex flex-col gap-3 w-full max-w-sm pointer-events-none select-text"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            id={`toast-item-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-[#020203]/95 backdrop-blur-xl shadow-2xl transition-all duration-300 animate-in slide-in-from-right-10 duration-200 ${
              toast.type === 'success' ? 'border-emerald-500/30 text-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.1)]' :
              toast.type === 'error' ? 'border-red-500/30 text-red-300 shadow-[0_0_30px_rgba(239,68,68,0.1)]' :
              toast.type === 'warning' ? 'border-amber-500/30 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.1)]' :
              'border-purple-500/30 text-purple-300 shadow-[0_0_30px_rgba(168,85,247,0.15)]'
            }`}
          >
            {/* Context Sensitive Vector Icon */}
            <div className="shrink-0 mt-0.5 select-none">
              {toast.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400" />}
              {toast.type === 'error' && <AlertCircle size={16} className="text-red-400" />}
              {toast.type === 'warning' && <AlertTriangle size={16} className="text-amber-400" />}
              {toast.type === 'info' && <Info size={16} className="text-purple-400" />}
            </div>
            
            {/* Toast Message Layout */}
            <div className="flex-1 text-[11.5px] leading-relaxed font-semibold">
              {toast.message}
            </div>

            {/* Close Toggle */}
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-white/40 hover:text-white transition-colors cursor-pointer select-none"
              title="Dismiss toast"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
