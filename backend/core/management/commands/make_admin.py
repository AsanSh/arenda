"""
Назначает пользователя администратором по логину или телефону.

Использование:
  python manage.py make_admin --username=ВашЛогин
  python manage.py make_admin --phone=996700750606
"""
import re
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


def normalize_phone(phone):
    if not phone:
        return None
    digits = re.sub(r'\D', '', str(phone).strip())
    if len(digits) < 9:
        return None
    if len(digits) == 9 and digits.startswith('9'):
        digits = '996' + digits
    return digits[:12]


class Command(BaseCommand):
    help = 'Назначает пользователя администратором (role=admin, is_staff=True, is_superuser=True)'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Логин пользователя')
        parser.add_argument('--phone', type=str, help='Телефон пользователя (9 или 12 цифр, с +996 или без)')

    def handle(self, *args, **options):
        username = (options.get('username') or '').strip()
        phone_raw = (options.get('phone') or '').strip()

        if not username and not phone_raw:
            self.stdout.write(self.style.ERROR('Укажите --username=... или --phone=...'))
            return

        user = None
        if username:
            user = User.objects.filter(username=username).first()
            if not user:
                self.stdout.write(self.style.ERROR(f'Пользователь с логином "{username}" не найден.'))
                return
        else:
            phone = normalize_phone(phone_raw)
            if not phone:
                self.stdout.write(self.style.ERROR(f'Некорректный телефон: {phone_raw}'))
                return
            # Ищем по точному совпадению и по вариантам
            for u in User.objects.exclude(phone__isnull=True).exclude(phone=''):
                if normalize_phone(u.phone) == phone:
                    user = u
                    break
            if not user:
                user = User.objects.filter(phone__icontains=phone).first()
            if not user:
                self.stdout.write(self.style.ERROR(f'Пользователь с телефоном {phone_raw} не найден.'))
                return

        user.role = 'admin'
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.save(update_fields=['role', 'is_staff', 'is_superuser', 'is_active'])

        self.stdout.write(self.style.SUCCESS(
            f'Пользователь {user.username} (id={user.id}, phone={user.phone or "—"}) назначен администратором.'
        ))
