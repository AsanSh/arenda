from django.contrib import admin
from .models import NotificationSettings, NotificationLog


@admin.register(NotificationSettings)
class NotificationSettingsAdmin(admin.ModelAdmin):
    list_display = ['notification_type', 'days_before', 'is_enabled', 'updated_at']
    list_editable = ['is_enabled']


@admin.register(NotificationLog)
class NotificationLogAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'notification_type', 'recipient', 'status', 'sent_at']
    list_filter = ['status', 'notification_type', 'sent_at']
    search_fields = ['tenant__name', 'recipient']
    readonly_fields = ['sent_at']
