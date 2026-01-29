"""
Создаёт админов nimdaSan и Bahi для входа по логину/паролю (если ещё нет).
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

USERS = [
    {'username': 'nimdaSan', 'password': 'nimdaParol', 'role': 'admin', 'phone': '+996700750606'},
    {'username': 'Bahi', 'password': 'BPHolding', 'role': 'admin', 'phone': ''},
]


class Command(BaseCommand):
    help = 'Создаёт админов nimdaSan и Bahi (is_staff=True), если нет — добавляет'

    def handle(self, *args, **options):
        for data in USERS:
            username = data['username']
            password = data['password']
            role = data.get('role', 'admin')
            phone = data.get('phone', '')
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'is_staff': True,
                    'is_superuser': (role == 'admin'),
                    'is_active': True,
                    'role': role,
                    'phone': phone or '',
                },
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(self.style.SUCCESS(f'Создан пользователь: {username}'))
            else:
                user.set_password(password)
                user.is_staff = True
                user.is_active = True
                user.role = role
                if phone:
                    user.phone = phone
                user.save()
                self.stdout.write(self.style.WARNING(f'Обновлён пользователь: {username}'))
        self.stdout.write(self.style.SUCCESS('Админы: nimdaSan (nimdaParol), Bahi (BPHolding)'))
