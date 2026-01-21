from rest_framework import viewsets, filters
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import Property
from .serializers import PropertySerializer, PropertyListSerializer


class PropertyViewSet(viewsets.ModelViewSet):
    """
    ViewSet для управления объектами недвижимости.
    """
    queryset = Property.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['property_type', 'status']
    search_fields = ['name', 'address', 'block_floor_room']
    ordering_fields = ['name', 'created_at', 'area']
    ordering = ['name']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PropertyListSerializer
        return PropertySerializer
