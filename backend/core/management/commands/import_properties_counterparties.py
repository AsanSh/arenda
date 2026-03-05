"""
Импорт недвижимости и контрагентов из таблицы (данные из двух скриншотов).
Создаёт контрагентов (арендаторы и арендодатели) и объекты недвижимости.
Опционально создаёт договоры для сданных помещений.

Использование:
  python manage.py import_properties_counterparties
  python manage.py import_properties_counterparties --no-contracts   # только контрагенты и недвижимость
"""
import re
from decimal import Decimal
from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction
from core.models import Tenant, EMPLOYEE_TYPES
from properties.models import Property
from contracts.models import Contract
from contracts.services import ContractService


def normalize_phone(raw):
    """Оставляем только цифры, для 9 цифр добавляем 996."""
    if not raw:
        return None
    digits = re.sub(r'\D', '', str(raw).strip())
    if len(digits) < 9:
        return None
    if len(digits) == 9 and digits.startswith('9'):
        digits = '996' + digits
    return digits[:12] if len(digits) > 12 else digits


def parse_decimal(s, default=None):
    if s is None or (isinstance(s, str) and not s.strip()):
        return default
    s = str(s).replace(',', '.').replace(' ', '')
    # "32,6+8" -> 40.6
    if '+' in s:
        parts = s.split('+')
        try:
            return sum(Decimal(p.strip()) for p in parts if p.strip())
        except Exception:
            pass
    try:
        return Decimal(s)
    except Exception:
        return default


def parse_date(s):
    """Принимает строки вида 6/12/25, 1/1/26, 30/12/25, 29/1/26."""
    if not s or not str(s).strip():
        return None
    s = str(s).strip()
    parts = s.replace('.', '/').split('/')
    if len(parts) != 3:
        return None
    try:
        d, m, y = int(parts[0]), int(parts[1]), int(parts[2])
        if y < 100:
            y += 2000
        return datetime(y, m, d).date()
    except (ValueError, IndexError):
        return None


def parse_due_day(s):
    """'до 5' -> 5, 'до 16' -> 16."""
    if not s:
        return 5
    m = re.search(r'(\d{1,2})', str(s))
    return int(m.group(1)) if m and 1 <= int(m.group(1)) <= 31 else 5


# ——— Контрагенты: арендаторы (tenant) и арендодатели (landlord) ———
# Из обоих скриншотов: уникальные имена + телефоны
COUNTERPARTIES = [
    # type: tenant — арендаторы
    {"type": "tenant", "name": "Айжан", "phone": "996502142421"},
    {"type": "tenant", "name": "ОсОО Клиника ОССА", "phone": "996701545871"},
    {"type": "tenant", "name": "ИП Русланбек Абай", "phone": "996507628519"},
    {"type": "tenant", "name": "ОсОО Ким моторс", "phone": "996500001640"},
    {"type": "tenant", "name": "Эрмаматов Канат", "phone": "996990410000"},
    {"type": "tenant", "name": "ОсОО Умут Медикалтур", "phone": "996707485119"},
    {"type": "tenant", "name": "Дюшалиев Таалай", "phone": "996552773748"},
    {"type": "tenant", "name": "Казанцев Илья", "phone": "996555300190"},
    {"type": "tenant", "name": "Уланбек уулу Нурсултан", "phone": "996553123210"},
    {"type": "tenant", "name": "Асыкбаева Альбина", "phone": "996559292903"},
    {"type": "tenant", "name": "Сагынбаев Бактыбек", "phone": None},
    # type: landlord — арендодатели
    {"type": "landlord", "name": "ОсОО Живи и Выкупай", "phone": None},
    {"type": "landlord", "name": "ИП Чаргынов Дастан", "phone": None},
    {"type": "landlord", "name": "Тюлебаев Эльдияр", "phone": None},
    {"type": "landlord", "name": "Чаргынова Райгуль", "phone": None},
]

# ——— Недвижимость: Шевченко 4, 11 этаж, каб 1–11 (из второго скрина) ———
# + объекты из первого скрина (адреса)
PROPERTIES_DATA = [
    # Шевченко 4, этаж 11
    {"address": "Шевченко 4", "block_floor_room": "11 этаж, каб 1", "area": "29.5", "status": "free", "rent": "590", "currency": "USD", "name": "Шевченко 4, 11 эт., каб 1"},
    {"address": "Шевченко 4", "block_floor_room": "11 этаж, каб 2", "area": "23.1", "status": "rented", "rent": "500", "currency": "USD", "name": "Шевченко 4, 11 эт., каб 2"},
    {"address": "Шевченко 4", "block_floor_room": "11 этаж, каб 3", "area": "28", "status": "free", "rent": "560", "currency": "USD", "name": "Шевченко 4, 11 эт., каб 3"},
    {"address": "Шевченко 4", "block_floor_room": "11 этаж, каб 4", "area": "23", "status": "rented", "rent": "506", "currency": "USD", "name": "Шевченко 4, 11 эт., каб 4"},
    {"address": "Шевченко 4", "block_floor_room": "11 этаж, каб 5", "area": "18.1", "status": "rented", "rent": "1282", "currency": "USD", "name": "Шевченко 4, 11 эт., каб 5"},
    {"address": "Шевченко 4", "block_floor_room": "11 этаж, каб 6", "area": "37.7", "status": "rented", "rent": "700", "currency": "USD", "name": "Шевченко 4, 11 эт., каб 6"},
    {"address": "Шевченко 4", "block_floor_room": "11 этаж, каб 7", "area": "25", "status": "free", "rent": "500", "currency": "USD", "name": "Шевченко 4, 11 эт., каб 7"},
    {"address": "Шевченко 4", "block_floor_room": "11 этаж, каб 8", "area": "25", "status": "rented", "rent": "550", "currency": "USD", "name": "Шевченко 4, 11 эт., каб 8"},
    {"address": "Шевченко 4", "block_floor_room": "11 этаж, каб 9", "area": "20.3", "status": "rented", "rent": "400", "currency": "USD", "name": "Шевченко 4, 11 эт., каб 9"},
    {"address": "Шевченко 4", "block_floor_room": "11 этаж, каб 10", "area": "33.1", "status": "free", "rent": "662", "currency": "USD", "name": "Шевченко 4, 11 эт., каб 10"},
    {"address": "Шевченко 4", "block_floor_room": "11 этаж, каб 11", "area": "40.6", "status": "rented", "rent": "880", "currency": "USD", "name": "Шевченко 4, 11 эт., каб 11"},
    # Из первого скрина — адреса
    {"address": "Залкар 55", "block_floor_room": "", "area": "0", "status": "free", "rent": "0", "currency": "KGS", "name": "Залкар 55"},
    {"address": "Московская 14а", "block_floor_room": "", "area": "0", "status": "free", "rent": "0", "currency": "KGS", "name": "Московская 14а"},
    {"address": "Ч. Айтматова, д.82/3, кв №2", "block_floor_room": "", "area": "0", "status": "free", "rent": "0", "currency": "KGS", "name": "Ч. Айтматова, д.82/3, кв №2"},
    {"address": "Калык Акиева 111", "block_floor_room": "", "area": "0", "status": "free", "rent": "0", "currency": "KGS", "name": "Калык Акиева 111"},
    {"address": "Молодая гвардия, д.2а", "block_floor_room": "", "area": "0", "status": "free", "rent": "0", "currency": "KGS", "name": "Молодая гвардия, д.2а"},
    {"address": "Саратовская 12", "block_floor_room": "", "area": "0", "status": "free", "rent": "0", "currency": "KGS", "name": "Саратовская 12"},
    {"address": "Шевченко 6 (подвал)", "block_floor_room": "", "area": "0", "status": "free", "rent": "0", "currency": "KGS", "name": "Шевченко 6 (подвал)"},
    {"address": "БЦ Моссовет", "block_floor_room": "", "area": "0", "status": "free", "rent": "0", "currency": "KGS", "name": "БЦ Моссовет"},
]

# Договоры для сданных помещений Шевченко 4 (каб 4,5,6,8,9,11). Каб 2 — арендатор не указан в таблице.
CONTRACTS_SHEVCHENKO4 = [
    {"tenant_phone": "996552773748", "room": 4, "signed_at": "6/12/25", "start": "6/12/25", "end": "6/12/26", "deposit": "506", "due_day": 5},
    {"tenant_phone": "996555300190", "room": 5, "signed_at": "1/1/26", "start": "1/1/26", "end": "1/1/27", "deposit": "1282", "due_day": 5},
    {"tenant_phone": "996555300190", "room": 6, "signed_at": "1/1/26", "start": "1/1/26", "end": "1/1/27", "deposit": "700", "due_day": 5},
    {"tenant_phone": "996553123210", "room": 8, "signed_at": "30/12/25", "start": "15/1/26", "end": "30/12/26", "deposit": "550", "due_day": 5},
    {"tenant_phone": "996559292903", "room": 9, "signed_at": "1/12/25", "start": "6/12/25", "end": "1/12/27", "deposit": "400", "due_day": 5},
    {"tenant_phone": None, "room": 11, "tenant_name": "Сагынбаев Бактыбек", "signed_at": "29/1/26", "start": "2/2/26", "end": "29/12/28", "deposit": "880", "due_day": 5},
]


class Command(BaseCommand):
    help = 'Импорт контрагентов и недвижимости из таблицы (по скриншотам)'

    def add_arguments(self, parser):
        parser.add_argument('--no-contracts', action='store_true', help='Не создавать договоры')

    @transaction.atomic
    def handle(self, *args, **options):
        create_contracts = not options.get('no_contracts', False)
        tenants_by_phone = {}
        tenants_by_name = {}
        landlord_ob = None

        # 1) Контрагенты
        self.stdout.write('Создание контрагентов...')
        for c in COUNTERPARTIES:
            t = c["type"]
            name = (c.get("name") or "").strip()
            if not name:
                continue
            phone = c.get("phone")
            if phone:
                phone = normalize_phone(phone) or ""
            else:
                phone = ""

            if t == "landlord":
                obj, created = Tenant.objects.get_or_create(
                    type="landlord",
                    name=name,
                    defaults={"phone": phone or None}
                )
                if name == "ОсОО Живи и Выкупай":
                    landlord_ob = obj
                if created:
                    self.stdout.write(f'  Арендодатель: {name}')
            else:
                if phone:
                    obj, created = Tenant.objects.get_or_create(
                        phone=phone,
                        type="tenant",
                        defaults={"name": name}
                    )
                    if not created and obj.name != name:
                        obj.name = name
                        obj.save(update_fields=["name"])
                    tenants_by_phone[phone] = obj
                else:
                    obj, created = Tenant.objects.get_or_create(
                        type="tenant",
                        name=name,
                        defaults={"phone": None}
                    )
                    tenants_by_name[name] = obj
                if created:
                    self.stdout.write(f'  Арендатор: {name}')

        # 2) Недвижимость
        self.stdout.write('Создание объектов недвижимости...')
        status_map = {"free": "free", "rented": "rented", "reserved": "reserved", "inactive": "inactive"}
        props_by_key = {}
        for p in PROPERTIES_DATA:
            address = (p.get("address") or "").strip()
            block = (p.get("block_floor_room") or "").strip()
            name = (p.get("name") or address).strip()
            area = parse_decimal(p.get("area"), Decimal("0"))
            status = status_map.get((p.get("status") or "free").strip().lower(), "free")
            key = (address, block)
            if key in props_by_key:
                continue
            obj, created = Property.objects.get_or_create(
                address=address,
                block_floor_room=block,
                defaults={
                    "name": name,
                    "property_type": "office",
                    "area": area,
                    "status": status,
                    "owner": landlord_ob.name if landlord_ob else "",
                }
            )
            props_by_key[key] = obj
            if created:
                self.stdout.write(f'  Объект: {name}')

        if not create_contracts:
            cnt_tenants = Tenant.objects.exclude(type__in=EMPLOYEE_TYPES).count()
            cnt_props = Property.objects.count()
            self.stdout.write(self.style.SUCCESS(
                f'Готово. В системе: контрагентов {cnt_tenants}, объектов недвижимости {cnt_props}. Договоры не создавались.'
            ))
            return

        # 3) Договоры для Шевченко 4
        if not landlord_ob:
            self.stdout.write(self.style.WARNING('Арендодатель "ОсОО Живи и Выкупай" не найден, договоры не созданы.'))
            return
        self.stdout.write('Создание договоров (Шевченко 4)...')
        room_to_prop = {}
        for p in PROPERTIES_DATA:
            if "Шевченко 4" not in (p.get("address") or ""):
                continue
            block = (p.get("block_floor_room") or "").strip()
            m = re.search(r'каб\s*(\d+)', block, re.I)
            if m:
                room_to_prop[int(m.group(1))] = props_by_key.get((p["address"], block))
        for c in CONTRACTS_SHEVCHENKO4:
            room = c.get("room")
            prop = room_to_prop.get(room) if room else None
            if not prop:
                continue
            tenant = tenants_by_phone.get(c.get("tenant_phone")) or tenants_by_name.get(c.get("tenant_name"))
            if not tenant:
                continue
            signed = parse_date(c.get("signed_at"))
            start = parse_date(c.get("start"))
            end = parse_date(c.get("end"))
            if not signed or not start or not end:
                continue
            deposit_amount = parse_decimal(c.get("deposit"), Decimal("0"))
            due_day = c.get("due_day") or 5
            number = ContractService.generate_contract_number()
            _, created = Contract.objects.get_or_create(
                property=prop,
                tenant=tenant,
                start_date=start,
                defaults={
                    "number": number,
                    "signed_at": signed,
                    "end_date": end,
                    "rent_amount": parse_decimal(PROPERTIES_DATA[room - 1].get("rent"), Decimal("0")) if room <= len(PROPERTIES_DATA) else Decimal("0"),
                    "currency": "USD",
                    "due_day": due_day,
                    "deposit_enabled": deposit_amount > 0,
                    "deposit_amount": deposit_amount,
                    "status": "active",
                    "landlord": landlord_ob,
                }
            )
            if created:
                self.stdout.write(f'  Договор: {number} — {prop.name} / {tenant.name}')

        # Итог
        from core.models import EMPLOYEE_TYPES
        cnt_tenants = Tenant.objects.exclude(type__in=EMPLOYEE_TYPES).count()
        cnt_props = Property.objects.count()
        cnt_contracts = Contract.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'Готово. В системе: контрагентов {cnt_tenants}, объектов недвижимости {cnt_props}, договоров {cnt_contracts}.'
        ))
