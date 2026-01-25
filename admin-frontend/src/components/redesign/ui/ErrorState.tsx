import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Произошла ошибка',
  message = 'Не удалось загрузить данные. Пожалуйста, попробуйте еще раз.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center
        py-12 px-4 text-center
        ${className}
      `}
    >
      <AlertCircle className="w-12 h-12 md:w-16 md:h-16 text-red-500 mb-4" />
      <h3 className="text-lg md:text-xl font-semibold text-slate-900 mb-2">
        {title}
      </h3>
      <p className="text-sm md:text-base text-slate-600 mb-6 max-w-md">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="
            px-4 py-2 bg-indigo-600 text-white rounded-lg
            hover:bg-indigo-700 transition-colors
            font-medium text-sm md:text-base
            min-h-[44px] min-w-[120px]
            flex items-center gap-2
          "
        >
          <RefreshCw className="w-4 h-4" />
          Попробовать снова
        </button>
      )}
    </div>
  );
}
