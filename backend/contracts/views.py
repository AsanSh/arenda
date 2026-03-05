from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from django.db import transaction
from django.http import FileResponse

from .models import Contract, ContractFile
from .serializers import ContractSerializer, ContractListSerializer, ContractFileSerializer
from .services import ContractService
from accruals.models import Accrual
from core.mixins import DataScopingMixin
from core.permissions import ReadOnlyForClients, CanReadResource, CanWriteResource, CanReadResource, CanWriteResource


class ContractViewSet(DataScopingMixin, viewsets.ModelViewSet):
    """
    ViewSet для управления договорами с RBAC и data scoping.
    При создании автоматически генерирует начисления.
    """
    queryset = Contract.objects.select_related(
        'property', 'tenant', 'landlord'
    ).prefetch_related('files').all()
    permission_classes = [IsAuthenticated, CanReadResource, ReadOnlyForClients]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'property', 'tenant']
    search_fields = ['number', 'property__name', 'tenant__name']
    ordering_fields = ['created_at', 'start_date', 'end_date']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ContractListSerializer
        return ContractSerializer
    
    def perform_create(self, serializer):
        if not serializer.validated_data.get("number"):
            serializer.validated_data["number"] = ContractService.generate_contract_number()
        contract = serializer.save()
        ContractService.create_contract_with_accruals_and_deposit(contract)

    def perform_update(self, serializer):
        old = serializer.instance
        old_status = old.status
        old_rent = old.rent_amount
        old_start = old.start_date
        old_end = old.end_date
        contract = serializer.save()
        ContractService.update_contract_accruals(
            contract, old_status, old_rent, old_start, old_end
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            result = ContractService.delete_contract_cascade(instance)
            return Response(result, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {"error": f"Ошибка при удалении договора: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def end_contract(self, request, pk=None):
        """Завершить договор"""
        contract = self.get_object()
        ContractService.end_contract(contract)
        return Response({"status": "Договор завершён"})
    
    @action(detail=True, methods=['post'])
    def generate_accruals(self, request, pk=None):
        """Вручную сгенерировать начисления для договора"""
        contract = self.get_object()
        AccrualService.generate_accruals_for_contract(contract)
        return Response({'status': 'Начисления сгенерированы'})
    
    @action(detail=True, methods=['post'])
    def fix_accruals(self, request, pk=None):
        """Исправить суммы в существующих начислениях из ставки договора"""
        contract = self.get_object()
        AccrualService.fix_accruals_for_contract(contract)
        return Response({'status': 'Начисления исправлены'})
    
    @action(detail=True, methods=['get'])
    def accruals(self, request, pk=None):
        """Получить начисления по договору"""
        contract = self.get_object()
        accruals = Accrual.objects.filter(contract=contract).order_by('period_start')
        from accruals.serializers import AccrualListSerializer
        serializer = AccrualListSerializer(accruals, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post', 'delete'], url_path='files')
    def files(self, request, pk=None):
        """Получить, добавить или удалить файлы к договору"""
        contract = self.get_object()
        if request.method == 'GET':
            files = ContractFile.objects.filter(contract=contract).order_by('-created_at')
            serializer = ContractFileSerializer(files, many=True, context={'request': request})
            return Response(serializer.data)
        if request.method == 'POST':
            serializer = ContractFileSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save(contract=contract)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        # DELETE — передать file_id в теле: {"file_id": 123}
        file_id = request.data.get('file_id') or request.query_params.get('file_id')
        if not file_id:
            return Response({'error': 'Укажите file_id'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            f = ContractFile.objects.get(contract=contract, id=file_id)
            f.file.delete(save=False)
            f.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ContractFile.DoesNotExist:
            return Response({'error': 'Файл не найден'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'], url_path=r'files/(?P<file_id>\d+)/download')
    def download_file(self, request, pk=None, file_id=None):
        """Скачать файл договора (с авторизацией)"""
        contract = self.get_object()
        try:
            cf = ContractFile.objects.get(contract=contract, id=file_id)
        except ContractFile.DoesNotExist:
            return Response({'error': 'Файл не найден'}, status=status.HTTP_404_NOT_FOUND)
        if not cf.file:
            return Response({'error': 'Файл отсутствует'}, status=status.HTTP_404_NOT_FOUND)
        try:
            fh = cf.file.open('rb')
        except (ValueError, OSError):
            return Response({'error': 'Файл недоступен'}, status=status.HTTP_404_NOT_FOUND)
        filename = cf.title or (cf.file.name.split('/')[-1] if cf.file.name else 'document.pdf')
        return FileResponse(fh, as_attachment=True, filename=filename)

    @action(detail=False, methods=['post'])
    def generate_all_accruals(self, request):
        """Сгенерировать начисления для всех активных договоров без начислений"""
        active_contracts = Contract.objects.filter(status='active')
        generated = 0
        
        for contract in active_contracts:
            accruals_count = Accrual.objects.filter(contract=contract).count()
            if accruals_count == 0:
                AccrualService.generate_accruals_for_contract(contract)
                generated += 1
        
        return Response({
            'status': f'Начисления сгенерированы для {generated} договоров',
            'generated': generated
        })
    
    @action(detail=False, methods=['post'])
    def fix_all_accruals(self, request):
        """Исправить все planned начисления для всех договоров, используя точные значения из договоров"""
        contracts = Contract.objects.all()
        fixed = 0
        
        for contract in contracts:
            planned_count = Accrual.objects.filter(contract=contract, status='planned').count()
            if planned_count > 0:
                AccrualService.fix_accruals_for_contract(contract)
                fixed += planned_count
        
        return Response({
            'status': f'Исправлено {fixed} начислений для всех договоров',
            'fixed': fixed
        })