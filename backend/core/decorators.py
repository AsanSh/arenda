"""
Декораторы для проверки прав доступа по матрице SECTION_PERMISSIONS.
"""
from functools import wraps

from rest_framework.response import Response
from rest_framework import status

from .permissions import get_user_type, has_permission


def require_permission(section: str, action: str):
    """
    Декоратор для проверки прав доступа к endpoint.

    Использование:
        @require_permission('contracts', 'create')
        def post(self, request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            if not request.user:
                return Response(
                    {'code': 'UNAUTHORIZED', 'message': 'Необходима авторизация'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            if not getattr(request.user, 'is_authenticated', False):
                return Response(
                    {'code': 'UNAUTHORIZED', 'message': 'Необходима авторизация'},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            user_type = get_user_type(request.user)
            if not has_permission(user_type, section, action):
                return Response(
                    {
                        'code': 'PERMISSION_DENIED',
                        'message': f'Нет прав для действия "{action}" в разделе "{section}"',
                        'details': {'user_type': user_type, 'section': section, 'action': action},
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )
            return view_func(self, request, *args, **kwargs)
        return wrapper
    return decorator
