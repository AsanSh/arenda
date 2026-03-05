/**
 * Матрица доступа по типам пользователей (синхронизирована с backend/core/permissions.py).
 */

export type UserType =
  | 'administrator'
  | 'owner'
  | 'landlord'
  | 'investor'
  | 'tenant'
  | 'employee'
  | 'master';

export type Section =
  | 'dashboard'
  | 'contracts'
  | 'accruals'
  | 'payments'
  | 'deposits'
  | 'properties'
  | 'tenants'
  | 'forecast'
  | 'accounts'
  | 'reports'
  | 'settings';

export type Action =
  | 'view'
  | 'create'
  | 'edit'
  | 'delete'
  | 'activate'
  | 'cancel'
  | 'accept'
  | 'return'
  | 'withhold'
  | 'export'
  | 'dispute'
  | 'deactivate'
  | 'add_note'
  | 'change_type'
  | 'analytics'
  | 'reports'
  | 'financial'
  | 'operational'
  | 'edit_company'
  | 'edit_users'
  | 'edit_security'
  | 'edit_integrations';

/** Маппинг типа из БД (counterparty.type / user.role) в ключ матрицы */
const DB_TYPE_TO_ACCESS_TYPE: Record<string, UserType> = {
  admin: 'administrator',
  administrator: 'administrator',
  staff: 'employee',
  master: 'master',
  accounting: 'employee',
  sales: 'employee',
  company_owner: 'owner',
  property_owner: 'landlord',
  landlord: 'landlord',
  investor: 'investor',
  tenant: 'tenant',
};

/** Матрица: раздел -> действие -> типы пользователей */
const PERMISSIONS: Record<Section, Partial<Record<Action, UserType[]>>> = {
  dashboard: {
    view: ['administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee', 'master'],
    analytics: ['administrator', 'owner'],
    reports: ['administrator', 'owner', 'investor'],
  },
  contracts: {
    view: ['administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee'],
    create: ['administrator', 'owner', 'employee'],
    edit: ['administrator', 'owner', 'employee'],
    delete: ['administrator'],
    activate: ['administrator', 'owner'],
    cancel: ['administrator', 'owner'],
  },
  accruals: {
    view: ['administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee'],
    create: ['administrator', 'owner', 'employee'],
    edit: ['administrator', 'owner', 'employee'],
    delete: ['administrator'],
    dispute: ['tenant'],
  },
  payments: {
    view: ['administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee'],
    create: ['administrator', 'owner', 'tenant', 'employee'],
    edit: ['administrator', 'owner', 'employee'],
    delete: ['administrator'],
    accept: ['administrator', 'owner', 'employee'],
    cancel: ['administrator', 'owner'],
  },
  deposits: {
    view: ['administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee'],
    create: ['administrator', 'owner', 'employee'],
    edit: ['administrator', 'owner', 'employee'],
    delete: ['administrator'],
    return: ['administrator', 'owner'],
    withhold: ['administrator', 'owner'],
  },
  properties: {
    view: ['administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee', 'master'],
    create: ['administrator', 'owner', 'employee'],
    edit: ['administrator', 'owner', 'landlord', 'employee'],
    delete: ['administrator', 'owner'],
    deactivate: ['administrator', 'owner'],
    add_note: ['master'],
  },
  tenants: {
    view: ['administrator', 'owner', 'landlord', 'employee'],
    create: ['administrator', 'owner', 'employee'],
    edit: ['administrator', 'owner', 'employee'],
    delete: ['administrator'],
    change_type: ['administrator'],
  },
  forecast: {
    view: ['administrator', 'owner', 'landlord', 'investor', 'employee'],
    create: ['administrator', 'owner'],
    edit: ['administrator', 'owner'],
  },
  accounts: {
    view: ['administrator', 'owner', 'employee'],
    create: ['administrator', 'owner'],
    edit: ['administrator', 'owner', 'employee'],
    delete: ['administrator'],
  },
  reports: {
    view: ['administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee'],
    financial: ['administrator', 'owner', 'investor'],
    operational: ['administrator', 'owner', 'employee'],
    export: ['administrator', 'owner'],
  },
  settings: {
    view: ['administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee', 'master'],
    edit_company: ['administrator', 'owner'],
    edit_users: ['administrator', 'owner'],
    edit_security: ['administrator'],
    edit_integrations: ['administrator', 'owner'],
  },
};

export function dbTypeToUserType(dbType: string | null): UserType {
  if (!dbType) return 'tenant';
  return DB_TYPE_TO_ACCESS_TYPE[dbType] ?? 'tenant';
}

export function hasPermission(
  userType: UserType,
  section: Section,
  action: Action
): boolean {
  const sectionPerms = PERMISSIONS[section];
  if (!sectionPerms) return false;
  const actionPerms = sectionPerms[action];
  if (!actionPerms) return false;
  return actionPerms.includes(userType);
}

export function getAllowedSections(userType: UserType): Section[] {
  return (Object.keys(PERMISSIONS) as Section[]).filter((section) => {
    const sectionPerms = PERMISSIONS[section];
    return Object.values(sectionPerms).some((allowedTypes) =>
      allowedTypes.includes(userType)
    );
  });
}

export function getUserPermissions(
  userType: UserType
): Partial<Record<Section, Action[]>> {
  const result: Partial<Record<Section, Action[]>> = {};
  for (const [section, actions] of Object.entries(PERMISSIONS)) {
    const allowedActions = (Object.entries(actions) as [Action, UserType[]][])
      .filter(([, allowedTypes]) => allowedTypes.includes(userType))
      .map(([action]) => action);
    if (allowedActions.length > 0) {
      result[section as Section] = allowedActions;
    }
  }
  return result;
}
