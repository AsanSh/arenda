# Data migration: нормализация номеров телефонов к формату 996XXXXXXXXX

import re

from django.db import migrations


def normalize_phone_value(phone):
    """Нормализует номер к 996XXXXXXXXX (копия логики core.utils.normalize_phone)."""
    if not phone:
        return phone
    clean = re.sub(r"[^\d]", "", str(phone).strip())
    if not clean or len(clean) < 9:
        return phone
    if clean.startswith("0") and len(clean) >= 9:
        clean = "996" + clean[1:]
    if clean.startswith("996") and len(clean) == 12:
        return clean
    if len(clean) == 9:
        return "996" + clean
    if clean.startswith("996") and len(clean) >= 12:
        return clean[:12]
    if len(clean) >= 9:
        return "996" + clean[-9:]
    return phone


def normalize_tenant_phones(apps, schema_editor):
    Tenant = apps.get_model("core", "Tenant")
    updated = 0
    for t in Tenant.objects.exclude(phone__isnull=True).exclude(phone=""):
        new_phone = normalize_phone_value(t.phone)
        if new_phone and new_phone != t.phone:
            t.phone = new_phone
            t.save(update_fields=["phone"])
            updated += 1
    if updated:
        print(f"Normalized {updated} Tenant phone(s) to 996XXXXXXXXX")


def normalize_user_phones(apps, schema_editor):
    User = apps.get_model("core", "User")
    updated = 0
    for u in User.objects.exclude(phone__isnull=True).exclude(phone=""):
        new_phone = normalize_phone_value(u.phone)
        if new_phone and new_phone != u.phone:
            u.phone = new_phone
            u.save(update_fields=["phone"])
            updated += 1
    if updated:
        print(f"Normalized {updated} User phone(s) to 996XXXXXXXXX")


def run_normalize(apps, schema_editor):
    normalize_tenant_phones(apps, schema_editor)
    normalize_user_phones(apps, schema_editor)


def noop_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0010_fix_phone_unique_properly"),
    ]

    operations = [
        migrations.RunPython(run_normalize, noop_reverse),
    ]
