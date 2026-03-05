import React from 'react';
import { useUser } from '../contexts/UserContext';
import {
  hasPermission,
  dbTypeToUserType,
  type Section,
  type Action,
} from '../utils/permissions';

interface PermissionGuardProps {
  section: Section;
  action: Action;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Условный рендеринг по правам доступа (матрица SECTION_PERMISSIONS).
 * Скрывает кнопки/блоки для пользователей без права на действие в разделе.
 */
export function PermissionGuard({
  section,
  action,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { user, tenantType } = useUser();

  if (!user) return <>{fallback}</>;

  const userType = dbTypeToUserType(tenantType ?? user.role ?? null);
  if (!hasPermission(userType, section, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
