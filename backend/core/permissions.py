"""
RBAC Permissions для системы управления арендой
"""
from rest_framework import permissions
from django.core.exceptions import PermissionDenied


class IsAdmin(permissions.BasePermission):
    """Только администратор"""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role == 'admin'
        )


class IsStaff(permissions.BasePermission):
    """Сотрудник или администратор"""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['admin', 'staff']
        )


class IsClient(permissions.BasePermission):
    """Клиент (tenant/landlord/investor)"""
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.role in ['tenant', 'landlord', 'investor']
        )


class CanReadResource(permissions.BasePermission):
    """Проверка права на чтение ресурса"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin и Staff могут читать всё
        if request.user.role in ['admin', 'staff']:
            return True
        
        # Клиенты могут читать только свои данные (проверка в has_object_permission)
        if request.user.role in ['tenant', 'landlord', 'investor']:
            return True
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Проверка доступа к конкретному объекту"""
        user = request.user
        
        # Admin и Staff имеют полный доступ
        if user.role in ['admin', 'staff']:
            return True
        
        # Для клиентов проверяем scope через view (если есть метод check_object_scope)
        if hasattr(view, 'check_object_scope'):
            return view.check_object_scope(request, obj)
        
        return False


class CanWriteResource(permissions.BasePermission):
    """Проверка права на запись ресурса"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin может писать всё
        if request.user.role == 'admin':
            return True
        
        # Staff может писать только в рамках назначений (проверка в has_object_permission)
        if request.user.role == 'staff':
            return True
        
        # Клиенты НЕ могут писать мастер-данные (только создавать Requests)
        if request.user.role in ['tenant', 'landlord', 'investor']:
            # Разрешаем только для создания Requests
            if view.__class__.__name__ == 'RequestViewSet' and request.method == 'POST':
                return True
            # Разрешаем для обновления своих Settings
            if 'settings' in request.path.lower() and request.method in ['PUT', 'PATCH']:
                return True
            return False
        
        return False
    
    def has_object_permission(self, request, view, obj):
        """Проверка доступа к конкретному объекту для записи"""
        user = request.user
        
        # Admin имеет полный доступ
        if user.role == 'admin':
            return True
        
        # Staff может редактировать только назначенные объекты
        if user.role == 'staff':
            if hasattr(view, 'check_staff_assignment'):
                return view.check_staff_assignment(request, obj)
            return False
        
        # Клиенты не могут редактировать мастер-данные
        return False


class ReadOnlyForClients(permissions.BasePermission):
    """Разрешает чтение всем, но запись только админам/сотрудникам"""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Чтение разрешено всем
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Запись (в т.ч. удаление) для admin/staff; owner (company_owner) также может удалять недвижимость
        if request.user.role in ['admin', 'staff']:
            return True
        if request.user.counterparty and get_user_type(request.user) == 'owner':
            if hasattr(view, '__class__') and view.__class__.__name__ == 'PropertyViewSet' and request.method == 'DELETE':
                return True
        return False


# --- Матрица доступа по типам пользователей (administrator, owner, landlord, ...) ---

SECTION_PERMISSIONS = {
    'dashboard': {
        'view': {'administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee', 'master'},
        'analytics': {'administrator', 'owner'},
        'reports': {'administrator', 'owner', 'investor'},
    },
    'contracts': {
        'view': {'administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee'},
        'create': {'administrator', 'owner', 'employee'},
        'edit': {'administrator', 'owner', 'employee'},
        'delete': {'administrator'},
        'activate': {'administrator', 'owner'},
        'cancel': {'administrator', 'owner'},
    },
    'accruals': {
        'view': {'administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee'},
        'create': {'administrator', 'owner', 'employee'},
        'edit': {'administrator', 'owner', 'employee'},
        'delete': {'administrator'},
        'dispute': {'tenant'},
    },
    'payments': {
        'view': {'administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee'},
        'create': {'administrator', 'owner', 'tenant', 'employee'},
        'edit': {'administrator', 'owner', 'employee'},
        'delete': {'administrator'},
        'accept': {'administrator', 'owner', 'employee'},
        'cancel': {'administrator', 'owner'},
    },
    'deposits': {
        'view': {'administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee'},
        'create': {'administrator', 'owner', 'employee'},
        'edit': {'administrator', 'owner', 'employee'},
        'delete': {'administrator'},
        'return': {'administrator', 'owner'},
        'withhold': {'administrator', 'owner'},
    },
    'properties': {
        'view': {'administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee', 'master'},
        'create': {'administrator', 'owner', 'employee'},
        'edit': {'administrator', 'owner', 'landlord', 'employee'},
        'delete': {'administrator', 'owner'},
        'deactivate': {'administrator', 'owner'},
        'add_note': {'master'},
    },
    'tenants': {
        'view': {'administrator', 'owner', 'landlord', 'employee'},
        'create': {'administrator', 'owner', 'employee'},
        'edit': {'administrator', 'owner', 'employee'},
        'delete': {'administrator'},
        'change_type': {'administrator'},
    },
    'forecast': {
        'view': {'administrator', 'owner', 'landlord', 'investor', 'employee'},
        'create': {'administrator', 'owner'},
        'edit': {'administrator', 'owner'},
    },
    'accounts': {
        'view': {'administrator', 'owner', 'employee'},
        'create': {'administrator', 'owner'},
        'edit': {'administrator', 'owner', 'employee'},
        'delete': {'administrator'},
    },
    'reports': {
        'view': {'administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee'},
        'financial': {'administrator', 'owner', 'investor'},
        'operational': {'administrator', 'owner', 'employee'},
        'export': {'administrator', 'owner'},
    },
    'settings': {
        'view': {'administrator', 'owner', 'landlord', 'investor', 'tenant', 'employee', 'master'},
        'edit_company': {'administrator', 'owner'},
        'edit_users': {'administrator', 'owner'},
        'edit_security': {'administrator'},
        'edit_integrations': {'administrator', 'owner'},
    },
}

# Маппинг Tenant.type / User.role -> ключ матрицы (administrator, owner, ...)
DB_TYPE_TO_ACCESS_TYPE = {
    'admin': 'administrator',
    'administrator': 'administrator',
    'staff': 'employee',
    'company_owner': 'owner',
    'property_owner': 'landlord',
    'landlord': 'landlord',
    'investor': 'investor',
    'tenant': 'tenant',
    'master': 'master',
    'accounting': 'employee',
    'sales': 'employee',
}


def get_user_type(user) -> str:
    """
    Возвращает тип пользователя для матрицы доступа (administrator, owner, ...).
    Учитывает user.counterparty.type и user.role.
    """
    if not user or not getattr(user, 'is_authenticated', True):
        return 'tenant'
    if getattr(user, 'counterparty', None):
        t = getattr(user.counterparty, 'type', None) or user.role
    else:
        t = getattr(user, 'role', 'tenant')
    return DB_TYPE_TO_ACCESS_TYPE.get(t, 'tenant')


def has_permission(user_type: str, section: str, action: str) -> bool:
    """Проверка прав доступа по разделу и действию."""
    if section not in SECTION_PERMISSIONS:
        return False
    if action not in SECTION_PERMISSIONS[section]:
        return False
    return user_type in SECTION_PERMISSIONS[section][action]


def get_allowed_sections(user_type: str) -> list:
    """Список разделов, в которых у типа есть хотя бы одно действие."""
    allowed = []
    for section, actions in SECTION_PERMISSIONS.items():
        if any(user_type in allowed_types for allowed_types in actions.values()):
            allowed.append(section)
    return allowed


def get_user_permissions(user_type: str) -> dict:
    """Все права типа по разделам: {раздел: [действия]}."""
    result = {}
    for section, actions in SECTION_PERMISSIONS.items():
        allowed_actions = [
            action for action, allowed_types in actions.items()
            if user_type in allowed_types
        ]
        if allowed_actions:
            result[section] = allowed_actions
    return result
