from django.contrib import admin
from .models import User, Tenant, Request, InvestorLink, StaffAssignment


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'counterparty', 'is_staff']
    list_filter = ['role']
    search_fields = ['username', 'email', 'phone']
    raw_id_fields = ['counterparty']


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
