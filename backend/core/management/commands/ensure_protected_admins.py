"""
Приводит защищённых админов (логин nimdaSan/Bahi или телефон +996700750606) к роли администратора в БД.
Вызывается один раз или после сброса прав.

Использование:
  python manage.py ensure_protected_admins
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import PROTECTED_ADMIN_USERNAMES, ADMIN_PHONES, ensure_protected_admin

User = get_user_model()


def _normalize_phone(phone):
    if not phone:
        return None
    digits = ''.join(c for c in str(phone).strip() if c.isdigit())
    if len(digits) < 9:
        return None
    if len(digits) == 9 and digits.startswith('9'):
        digits = '996' + digits
    return digits[:12]


class Command(BaseCommand):
    help = 'Выставляет role=admin, is_staff=True, is_superuser=True для nimdaSan, Bahi и номера +996700750606'

    def handle(self, *args, **options):
        updated = 0
        for username in PROTECTED_ADMIN_USERNAMES:
            user = User.objects.filter(username=username).first()
            if user:
                if ensure_protected_admin(user):
                    updated += 1
                self.stdout.write(f'  {username}: role={user.role}, is_staff={user.is_staff}')
            else:
                self.stdout.write(self.style.WARNING(f'  Пользователь {username} не найден'))

        for u in User.objects.exclude(phone__isnull=True).exclude(phone=''):
            norm = _normalize_phone(u.phone)
            if norm and norm in ADMIN_PHONES:
                if ensure_protected_admin(u):
                    updated += 1
                self.stdout.write(f'  {u.username} (phone={u.phone}): role={u.role}, is_staff={u.is_staff}')

        self.stdout.write(self.style.SUCCESS(f'Готово. Обновлено записей: {updated}.'))
