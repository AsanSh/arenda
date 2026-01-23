from django.core.management.base import BaseCommand
from core.models import Tenant


class Command(BaseCommand):
    help = 'Создает контрагента "Администратор" с номером телефона +996700750606'

    def handle(self, *args, **options):
        phone = '+996700750606'
        
        # Проверяем, существует ли уже контрагент с таким номером
        existing_tenant = Tenant.objects.filter(phone=phone).first()
        
        if existing_tenant:
            self.stdout.write(
                self.style.WARNING(
                    f'Контрагент с номером {phone} уже существует: {existing_tenant.name} (ID: {existing_tenant.id})'
                )
            )
            # Обновляем имя на "Администратор" если нужно
            if existing_tenant.name != 'Администратор':
                existing_tenant.name = 'Администратор'
                existing_tenant.type = 'staff'
                existing_tenant.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Обновлен контрагент: {existing_tenant.name}')
                )
            return
        
        # Создаем нового контрагента
        tenant = Tenant.objects.create(
            name='Администратор',
            type='staff',
            phone=phone,
            email='admin@amt.kg',
            contact_person='Администратор системы',
            comment='Системный администратор для авторизации через WhatsApp'
        )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Успешно создан контрагент: {tenant.name} (ID: {tenant.id}, Телефон: {tenant.phone})'
            )
        )
