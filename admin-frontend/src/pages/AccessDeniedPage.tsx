import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-6">
          <ShieldX className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">Доступ запрещён</h1>
        <p className="text-slate-600 mb-6">
          У вас нет прав для просмотра этого раздела. Обратитесь к администратору, если считаете, что это ошибка.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
