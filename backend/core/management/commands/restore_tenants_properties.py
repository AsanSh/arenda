"""
Восстанавливает контрагентов, недвижимость и сотрудников из фикстуры core/fixtures/tenants_and_properties.json.

Использование:
  python manage.py restore_tenants_properties           # загрузить в пустую БД
  python manage.py restore_tenants_properties --clear   # удалить всех контрагентов и объекты недвижимости, затем загрузить (осторожно: затронет договоры и др.)

Через Docker (из корня репозитория):
  cd infra && docker compose run --rm backend python manage.py restore_tenants_properties

Или скрипт: ./scripts/restore_tenants_properties.sh
"""
from django.core.management.base import BaseCommand
from django.core.management import call_command
from core.models import Tenant
from properties.models import Property


class Command(BaseCommand):
    help = 'Восстанавливает контрагентов и недвижимость из фикстуры'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Сначала удалить всех контрагентов и объекты недвижимости (осторожно: ломает связи с договорами и т.д.)',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('Удаление контрагентов и недвижимости...')
            Property.objects.all().delete()
            Tenant.objects.all().delete()
            self.stdout.write(self.style.WARNING('Удалено.'))
        self.stdout.write('Загрузка фикстуры tenants_and_properties...')
        try:
            call_command('loaddata', 'tenants_and_properties', verbosity=1)
            self.stdout.write(self.style.SUCCESS('Контрагенты и недвижимость восстановлены.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Ошибка: {e}'))
            self.stdout.write('Убедитесь, что файл backend/core/fixtures/tenants_and_properties.json существует.')
