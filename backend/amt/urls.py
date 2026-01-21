"""
URL configuration for amt project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('core.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/properties/', include('properties.urls')),
    path('api/contracts/', include('contracts.urls')),
    path('api/accruals/', include('accruals.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/deposits/', include('deposits.urls')),
    path('api/account/', include('account.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/forecast/', include('forecast.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/notifications/', include('notifications.urls')),
]
