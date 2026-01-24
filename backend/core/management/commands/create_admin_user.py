from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import Tenant

User = get_user_model()


class Command(BaseCommand):
    help = 'Создает пользователя-администратора с номером телефона +996700750606'

    def handle(self, *args, **options):
        phone = '+996700750606'
        username = 'admin'
        email = 'admin@amt.kg'
        password = 'NimdaSan9'  # Пароль из предыдущих инструкций
        
        # Создаем или получаем контрагента
        tenant, created = Tenant.objects.get_or_create(
            phone=phone,
            defaults={
                'name': 'Администратор',
                'type': 'staff',
                'email': email,
                'contact_person': 'Администратор системы',
                'comment': 'Системный администратор для авторизации через WhatsApp'
            }
        )
        
        if created:
            self.stdout.write(
                self.style.SUCCESS(f'Создан контрагент: {tenant.name} (ID: {tenant.id})')
            )
        else:
            self.stdout.write(
                self.style.WARNING(f'Контрагент уже существует: {tenant.name} (ID: {tenant.id})')
            )
        
        # Создаем или обновляем пользователя
        user, user_created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'phone': phone,
                'role': 'admin',
                'counterparty': tenant,
                'is_staff': True,
                'is_superuser': True,
            }
        )
        
        if user_created:
            user.set_password(password)
            user.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Создан пользователь-администратор:\n'
                    f'   Username: {user.username}\n'
                    f'   Email: {user.email}\n'
                    f'   Phone: {user.phone}\n'
                    f'   Role: {user.role}\n'
                    f'   Counterparty: {user.counterparty.name if user.counterparty else "None"}\n'
                    f'   Password: {password}'
                )
            )
        else:
            # Обновляем существующего пользователя
            user.phone = phone
            user.email = email
            user.role = 'admin'
            user.counterparty = tenant
            user.is_staff = True
            user.is_superuser = True
            user.set_password(password)
            user.save()
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ Обновлен пользователь-администратор:\n'
                    f'   Username: {user.username}\n'
                    f'   Email: {user.email}\n'
                    f'   Phone: {user.phone}\n'
                    f'   Role: {user.role}\n'
                    f'   Counterparty: {user.counterparty.name if user.counterparty else "None"}\n'
                    f'   Password: {password}'
                )
            )
