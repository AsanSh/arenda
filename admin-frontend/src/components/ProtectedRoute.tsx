import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Список разрешённых типов (counterparty.type или user.role). Пусто = не проверять. */
  allowedTypes?: string[];
  /** Раздел для проверки права (например 'contracts'). */
  requiredSection?: string;
  /** Действие для проверки права (например 'view'). */
  requiredAction?: string;
}

export default function ProtectedRoute({
  children,
  allowedTypes,
  requiredSection,
  requiredAction,
}: ProtectedRouteProps) {
  const isAuthorized =
    localStorage.getItem('whatsapp_authorized') === 'true' || !!localStorage.getItem('auth_token');
  const { user, loading, tenantType, hasPermissionSection } = useUser();

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4" />
          <p className="text-slate-600">Загрузка данных пользователя...</p>
        </div>
      </div>
    );
  }

  if (allowedTypes && allowedTypes.length > 0 && tenantType && !allowedTypes.includes(tenantType)) {
    return <Navigate to="/access-denied" replace />;
  }

  if (requiredSection && requiredAction && !hasPermissionSection(requiredSection, requiredAction)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
