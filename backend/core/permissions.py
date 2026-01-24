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
        
        # Запись только для admin/staff
        return request.user.role in ['admin', 'staff']
