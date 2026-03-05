"""
Хелперы для записи логов изменений в настройках (профиль, пароль, сотрудники).
"""
from .models import AuditLog


def log_audit(user, action, target_model, target_id=None, target_repr='', old_data=None, new_data=None, reason=''):
    """Создать запись в логе изменений."""
    AuditLog.objects.create(
        user=user,
        action=action,
        target_model=target_model,
        target_id=str(target_id) if target_id is not None else None,
        target_repr=(target_repr or '')[:255],
        old_data=old_data or {},
        new_data=new_data or {},
        reason=(reason or '')[:255],
    )
