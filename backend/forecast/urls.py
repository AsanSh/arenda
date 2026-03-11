from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ForecastViewSet

router = DefaultRouter()
router.register(r'', ForecastViewSet, basename='forecast')

urlpatterns = [
    path('', include(router.urls)),
]

# Smart Forecast — отдельный роутер, подключается при FEATURE_SMART_FORECAST
from django.conf import settings
if getattr(settings, 'FEATURE_SMART_FORECAST', False):
    from .smart_views import SmartForecastViewSet
    smart_router = DefaultRouter()
    smart_router.register(r'smart', SmartForecastViewSet, basename='forecast-smart')
    urlpatterns += [path('', include(smart_router.urls))]
