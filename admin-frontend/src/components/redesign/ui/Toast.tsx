import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  type: ToastType;
  message: string;
  duration?: number;
  onClose: () => void;
}

const toastConfig: Record<ToastType, { icon: typeof CheckCircle; bg: string; iconColor: string }> = {
  success: {
    icon: CheckCircle,
    bg: 'bg-green-50 border-green-200',
    iconColor: 'text-green-600',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 border-red-200',
    iconColor: 'text-red-600',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-600',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 border-blue-200',
    iconColor: 'text-blue-600',
  },
};

export function Toast({ type, message, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = toastConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed top-4 right-4 md:top-6 md:right-6
        z-50 max-w-sm w-full
        ${config.bg} border rounded-lg shadow-lg
        p-4 flex items-start gap-3
        animate-in slide-in-from-right
        transition-opacity duration-300
      `}
      role="alert"
    >
      <Icon className={`w-5 h-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <p className="flex-1 text-sm font-medium text-slate-900">{message}</p>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="text-slate-400 hover:text-slate-600 transition-colors"
        aria-label="Закрыть"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Array<{ id: string; type: ToastType; message: string }>;
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 md:top-6 md:right-6 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={() => onRemove(toast.id)}
        />
      ))}
    </div>
  );
}
