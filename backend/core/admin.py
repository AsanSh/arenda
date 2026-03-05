from django.contrib import admin
from .models import User, Tenant, Request, InvestorLink, StaffAssignment, AuditLog, PROTECTED_ADMIN_USERNAMES


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'counterparty', 'is_staff', 'is_active']
    list_filter = ['role', 'is_active']
    search_fields = ['username', 'email', 'phone']
    raw_id_fields = ['counterparty']

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if obj and obj.username in PROTECTED_ADMIN_USERNAMES:
            readonly = list(readonly) + ['is_active']
        return readonly


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'contact_person', 'email', 'phone']
    list_filter = ['type']
    search_fields = ['name', 'email', 'phone']


@admin.register(Request)
class RequestAdmin(admin.ModelAdmin):
    list_display = ['subject', 'type', 'status', 'created_by', 'assigned_to', 'created_at']
    list_filter = ['type', 'status', 'created_at']
    search_fields = ['subject', 'message']
    raw_id_fields = ['created_by', 'assigned_to', 'counterparty', 'related_contract', 'related_property']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(InvestorLink)
class InvestorLinkAdmin(admin.ModelAdmin):
    list_display = ['investor', 'property', 'contract', 'share', 'status']
    list_filter = ['status']
    raw_id_fields = ['investor', 'property', 'contract']


@admin.register(StaffAssignment)
class StaffAssignmentAdmin(admin.ModelAdmin):
    list_display = ['staff', 'property', 'contract', 'counterparty']
    list_filter = ['created_at']
    raw_id_fields = ['staff', 'property', 'contract', 'counterparty']
    search_fields = ['name', 'email', 'phone']


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'action', 'target_model', 'target_repr', 'created_at']
    list_filter = ['action', 'target_model', 'created_at']
    search_fields = ['target_repr', 'user__username']
    readonly_fields = ['user', 'action', 'target_model', 'target_id', 'target_repr', 'old_data', 'new_data', 'reason', 'created_at']
