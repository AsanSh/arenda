import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthorized = localStorage.getItem('whatsapp_authorized') === 'true';
  const { user, loading } = useUser();

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  // Показываем загрузку пока данные пользователя не загружены
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-slate-600">Загрузка данных пользователя...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
