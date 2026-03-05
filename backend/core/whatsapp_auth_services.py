"""
Сервис авторизации через WhatsApp OTP и выдача прав по типу контрагента/роли.
"""
from typing import Any, Dict

# Маппинг типов Tenant и User.role в ключ прав (как в промпте)
ROLE_TO_PERMISSION_KEY = {
    "admin": "administrator",
    "administrator": "administrator",
    "staff": "employee",
    "company_owner": "owner",
    "property_owner": "landlord",
    "landlord": "landlord",
    "investor": "investor",
    "tenant": "tenant",
    "master": "master",
}


def get_permissions_by_type(tenant_type: str) -> Dict[str, Any]:
    """
    Возвращает права доступа в зависимости от типа контрагента или роли пользователя.

    Args:
        tenant_type: Тип контрагента (Tenant.type) или роль (User.role):
            admin, staff, tenant, landlord, investor, master, company_owner, property_owner

    Returns:
        Словарь с правами по разделам и menu (full, owner, landlord, tenant, employee, master, minimal).
    """
    key = ROLE_TO_PERMISSION_KEY.get(tenant_type, tenant_type)
    permissions_map = {
        "administrator": {
            "dashboard": ["overview", "analytics", "reports"],
            "contracts": ["view", "create", "edit", "delete", "activate"],
            "accruals": ["view", "create", "edit", "delete"],
            "payments": ["view", "create", "edit", "delete", "accept"],
            "deposits": ["view", "create", "edit", "delete", "return"],
            "properties": ["view", "create", "edit", "delete"],
            "tenants": ["view", "create", "edit", "delete"],
            "settings": ["view", "edit"],
            "menu": "full",
        },
        "owner": {
            "dashboard": ["overview", "analytics", "reports"],
            "contracts": ["view", "create", "edit", "activate"],
            "accruals": ["view", "create"],
            "payments": ["view", "accept"],
            "deposits": ["view", "return"],
            "properties": ["view", "create", "edit"],
            "tenants": ["view", "create"],
            "settings": ["view"],
            "menu": "owner",
        },
        "landlord": {
            "dashboard": ["overview"],
            "contracts": ["view"],
            "accruals": ["view"],
            "payments": ["view"],
            "properties": ["view"],
            "menu": "landlord",
        },
        "investor": {
            "dashboard": ["overview", "reports"],
            "contracts": ["view"],
            "accruals": ["view"],
            "payments": ["view"],
            "properties": ["view"],
            "menu": "investor",
        },
        "tenant": {
            "dashboard": ["overview"],
            "contracts": ["view"],
            "accruals": ["view"],
            "payments": ["view", "create"],
            "menu": "tenant",
        },
        "employee": {
            "dashboard": ["overview"],
            "contracts": ["view", "edit"],
            "accruals": ["view", "create"],
            "payments": ["view", "create"],
            "deposits": ["view"],
            "properties": ["view"],
            "tenants": ["view"],
            "menu": "employee",
        },
        "master": {
            "dashboard": ["overview"],
            "properties": ["view"],
            "menu": "master",
        },
    }
    return permissions_map.get(
        key,
        {
            "menu": "minimal",
            "dashboard": ["overview"],
        },
    )
