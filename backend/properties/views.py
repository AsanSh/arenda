from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from .models import Property
from .serializers import PropertySerializer, PropertyListSerializer
from core.mixins import DataScopingMixin
from core.permissions import ReadOnlyForClients, CanReadResource, CanWriteResource


class PropertyViewSet(DataScopingMixin, viewsets.ModelViewSet):
    """
    ViewSet для управления объектами недвижимости с RBAC и data scoping.
    """
    queryset = Property.objects.all()
    permission_classes = [IsAuthenticated, CanReadResource, ReadOnlyForClients]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['property_type', 'status']
    search_fields = ['name', 'address', 'block_floor_room']
    ordering_fields = ['name', 'created_at', 'area']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PropertyListSerializer
        return PropertySerializer
