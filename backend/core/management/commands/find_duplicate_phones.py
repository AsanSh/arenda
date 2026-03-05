"""
Поиск дубликатов номеров телефонов в User и Tenant.
Запуск: python manage.py find_duplicate_phones
"""
from collections import defaultdict

from django.core.management.base import BaseCommand

from core.models import User, Tenant
from core.utils import normalize_phone


class Command(BaseCommand):
    help = "Находит User и Tenant с одинаковым нормализованным номером телефона (996XXXXXXXXX)"

    def handle(self, *args, **options):
        def digits_only(s):
            return "".join(c for c in (s or "") if c.isdigit())

        # Группы по нормализованному номеру
        by_phone_user = defaultdict(list)
        by_phone_tenant = defaultdict(list)

        for u in User.objects.exclude(phone__isnull=True).exclude(phone=""):
            norm = normalize_phone(u.phone)
            if norm:
                by_phone_user[norm].append(u)

        for t in Tenant.objects.exclude(phone__isnull=True).exclude(phone=""):
            norm = normalize_phone(t.phone)
            if norm:
                by_phone_tenant[norm].append(t)

        found = False
        for norm, users in by_phone_user.items():
            if len(users) > 1:
                found = True
                self.stdout.write(self.style.WARNING(f"\nНомер {norm} — несколько User:"))
                for u in users:
                    self.stdout.write(f"  User id={u.id} username={u.username} role={u.role} counterparty_id={u.counterparty_id}")

        for norm, tenants in by_phone_tenant.items():
            if len(tenants) > 1:
                found = True
                self.stdout.write(self.style.WARNING(f"\nНомер {norm} — несколько Tenant:"))
                for t in tenants:
                    self.stdout.write(f"  Tenant id={t.id} name={t.name} type={t.type}")

        # Один номер и в User, и в Tenant — не обязательно дубликат (User может быть привязан к Tenant)
        for norm in set(by_phone_user) | set(by_phone_tenant):
            users = by_phone_user.get(norm, [])
            tenants = by_phone_tenant.get(norm, [])
            if len(users) > 1 or len(tenants) > 1:
                continue
            if users and tenants and users[0].counterparty_id != tenants[0].id:
                self.stdout.write(
                    self.style.NOTICE(
                        f"\nНомер {norm}: User id={users[0].id} не привязан к Tenant id={tenants[0].id}"
                    )
                )
                found = True

        if not found:
            self.stdout.write(self.style.SUCCESS("Дубликатов номеров не найдено."))
        else:
            self.stdout.write(
                self.style.WARNING(
                    "\nРекомендация: объедините или удалите дубликаты в админке или через скрипт. "
                    "При входе по WhatsApp при дубликатах выбирается один пользователь (admin > staff > id)."
                )
            )
