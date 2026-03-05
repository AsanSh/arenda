from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models.deletion import ProtectedError
from .models import Property
from .serializers import PropertySerializer, PropertyListSerializer
from core.mixins import DataScopingMixin
from core.permissions import ReadOnlyForClients, CanReadResource, CanWriteResource


class PropertyViewSet(DataScopingMixin, viewsets.ModelViewSet):
    """
    ViewSet для управления объектами недвижимости с RBAC и data scoping.
    Без пагинации — отображаются все объекты в списке.
    """
    queryset = Property.objects.all()
    permission_classes = [IsAuthenticated, CanReadResource, ReadOnlyForClients]
    pagination_class = None  # Показывать все недвижимости
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['property_type', 'status']
    search_fields = ['name', 'address', 'block_floor_room']
    ordering_fields = ['name', 'created_at', 'area']
    ordering = ['name']

    def destroy(self, request, *args, **kwargs):
        """Удаление объекта. Обработка ProtectedError — нельзя удалить, если есть договоры."""
        instance = self.get_object()
        try:
            instance.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError as e:
            return Response(
                {'error': 'Невозможно удалить объект: есть связанные договоры. Сначала завершите или удалите договоры.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PropertyListSerializer
        return PropertySerializer
