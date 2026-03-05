"""
Утилиты core
"""
import re
from typing import Optional


def normalize_phone(phone: str) -> str:
    """
    Нормализует номер телефона к единому формату: 996XXXXXXXXX (только цифры).

    Примеры:
        +996 700 750 606  -> 996700750606
        +996700750606     -> 996700750606
        0700750606        -> 996700750606

    Args:
        phone: Номер телефона в любом формате

    Returns:
        Нормализованный номер в формате 996XXXXXXXXX или пустая строка при неверном формате.
    """
    if not phone:
        return ""
    clean_phone = re.sub(r"[^\d]", "", str(phone).strip())
    if not clean_phone or len(clean_phone) < 9:
        return ""
    if clean_phone.startswith("0") and len(clean_phone) >= 9:
        clean_phone = "996" + clean_phone[1:]
    if clean_phone.startswith("996") and len(clean_phone) == 12:
        return clean_phone
    if len(clean_phone) == 9:
        return "996" + clean_phone
    if clean_phone.startswith("996") and len(clean_phone) >= 12:
        return clean_phone[:12]
    if len(clean_phone) >= 9:
        return "996" + clean_phone[-9:]
    return ""
