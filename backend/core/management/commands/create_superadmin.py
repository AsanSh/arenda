"""
Создаёт суперадминов по номерам +996700750606 и +996557903999: контрагент (Tenant) и пользователь (User).
После выполнения вход по WhatsApp с этими номерами не должен показывать «Номер не зарегистрирован».
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Tenant

User = get_user_model()

ADMINS = [
    {'phone': '+996700750606', 'username': 'admin_700750606', 'name': 'Администратор', 'contact': 'Суперадмин'},
    {'phone': '+996557903999', 'username': 'admin_557903999', 'name': 'Админ 557903999', 'contact': 'Админ'},
]


class Command(BaseCommand):
    help = 'Создаёт суперадминов по номерам +996700750606 и +996557903999 (контрагент + пользователь)'

    def _ensure_admin(self, phone, username, name, contact):
        tenant, created = Tenant.objects.get_or_create(
            phone=phone,
            defaults={
                'name': name,
                'type': 'staff',
                'email': f'admin{phone.replace("+", "")}@amt.kg',
                'contact_person': contact,
                'comment': f'Суперадмин {phone}',
            },
        )
        if not created:
            tenant.name = name
            tenant.type = 'staff'
            tenant.save()
        self.stdout.write(self.style.SUCCESS(f'Контрагент: {tenant.name} (ID: {tenant.id}, тел.: {tenant.phone})'))

        defaults = {
            'phone': phone,
            'role': 'admin',
            'is_staff': True,
            'is_superuser': True,
            'is_active': True,
        }
        if hasattr(User, 'preferences'):
            defaults['preferences'] = {}
        if hasattr(User, 'counterparty'):
            defaults['counterparty'] = tenant
        user, created = User.objects.get_or_create(
            username=username,
            defaults=defaults,
        )
        if not created:
            user.phone = phone
            user.role = 'admin'
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.save()
        if created:
            user.set_unusable_password()
            user.save()
        self.stdout.write(
            self.style.SUCCESS(f'Пользователь: {user.username} (ID: {user.id}, тел.: {user.phone})')
        )

    def handle(self, *args, **options):
        for adm in ADMINS:
            self._ensure_admin(adm['phone'], adm['username'], adm['name'], adm['contact'])
        self.stdout.write(self.style.SUCCESS('Суперадмины по +996700750606 и +996557903999 созданы/обновлены.'))
