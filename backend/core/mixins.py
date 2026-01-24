"""
Mixin классы для data scoping и RBAC
"""
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, NotFound
from core.models import InvestorLink, StaffAssignment
from contracts.models import Contract


class DataScopingMixin:
    """Mixin для автоматического ограничения данных по ролям"""
    
    def _scope_for_user(self, queryset, user, model_name=None):
        """Вспомогательный метод для применения scoping к любому queryset"""
        if not user or not user.is_authenticated:
            return queryset.none()
        
        if user.role == 'admin':
            return queryset
        
        if user.role == 'staff':
            return self._scope_for_staff(queryset, user)
        
        if user.role == 'tenant':
            return self._scope_for_tenant(queryset, user)
        
        if user.role == 'landlord':
            return self._scope_for_landlord(queryset, user)
        
        if user.role == 'investor':
            return self._scope_for_investor(queryset, user)
        
        return queryset.none()
    
    def get_queryset(self):
        """Применяет data scoping в зависимости от роли пользователя"""
        queryset = super().get_queryset()
        user = self.request.user
        
        if not user or not user.is_authenticated:
            return queryset.none()
        
        # Admin видит всё
        if user.role == 'admin':
            return queryset
        
        # Staff видит только назначенные объекты
        if user.role == 'staff':
            return self._scope_for_staff(queryset, user)
        
        # Tenant видит только свои договоры/начисления/платежи
        if user.role == 'tenant':
            return self._scope_for_tenant(queryset, user)
        
        # Landlord видит только свои договоры (где он landlord)
        if user.role == 'landlord':
            return self._scope_for_landlord(queryset, user)
        
        # Investor видит только связанные объекты/договоры
        if user.role == 'investor':
            return self._scope_for_investor(queryset, user)
        
        return queryset.none()
    
    def _scope_for_staff(self, queryset, user):
        """Ограничение для сотрудника по назначениям"""
        # Получаем все назначения сотрудника
        assignments = StaffAssignment.objects.filter(staff=user)
        
        property_ids = [a.property_id for a in assignments if a.property_id]
        contract_ids = [a.contract_id for a in assignments if a.contract_id]
        counterparty_ids = [a.counterparty_id for a in assignments if a.counterparty_id]
        
        # Определяем модель по queryset
        model = queryset.model
        
        if model.__name__ == 'Property':
            if property_ids:
                return queryset.filter(id__in=property_ids)
            return queryset.none()
        
        elif model.__name__ == 'Contract':
            if contract_ids:
                return queryset.filter(id__in=contract_ids)
            # Также через property
            if property_ids:
                return queryset.filter(property_id__in=property_ids)
            return queryset.none()
        
        elif model.__name__ == 'Tenant':
            if counterparty_ids:
                return queryset.filter(id__in=counterparty_ids)
            return queryset.none()
        
        # Для других моделей (Accrual, Payment, Deposit) фильтруем через contract
        if hasattr(model, 'contract'):
            if contract_ids:
                return queryset.filter(contract_id__in=contract_ids)
            if property_ids:
                return queryset.filter(contract__property_id__in=property_ids)
        
        # Для Deposit фильтруем через contract
        if model.__name__ == 'Deposit':
            if contract_ids:
                return queryset.filter(contract_id__in=contract_ids)
            if property_ids:
                return queryset.filter(contract__property_id__in=property_ids)
            return queryset.none()
        
        # Expenses: через contract или property
        if model.__name__ == 'Expense':
            if contract_ids:
                return queryset.filter(contract_id__in=contract_ids)
            if property_ids:
                return queryset.filter(property_id__in=property_ids)
            return queryset.none()
        
        return queryset.none()
    
    def _scope_for_tenant(self, queryset, user):
        """Ограничение для арендатора"""
        if not user.counterparty:
            return queryset.none()
        
        model = queryset.model
        
        # Contracts: только где tenant == user.counterparty
        if model.__name__ == 'Contract':
            return queryset.filter(tenant=user.counterparty)
        
        # Accruals: через contract.tenant
        if model.__name__ == 'Accrual':
            return queryset.filter(contract__tenant=user.counterparty)
        
        # Payments: через contract.tenant
        if model.__name__ == 'Payment':
            return queryset.filter(contract__tenant=user.counterparty)
        
        # Deposits: через contract.tenant
        if model.__name__ == 'Deposit':
            return queryset.filter(contract__tenant=user.counterparty)
        
        # Expenses: через contract.tenant
        if model.__name__ == 'Expense':
            return queryset.filter(contract__tenant=user.counterparty)
        
        # Properties: только те, где есть договоры с этим tenant
        if model.__name__ == 'Property':
            return queryset.filter(contracts__tenant=user.counterparty).distinct()
        
        # Tenant: только свой
        if model.__name__ == 'Tenant':
            return queryset.filter(id=user.counterparty_id)
        
        # Account: только для admin/staff (клиенты не видят счета)
        if model.__name__ == 'Account':
            return queryset.none()
        
        return queryset.none()
    
    def _scope_for_landlord(self, queryset, user):
        """Ограничение для арендодателя"""
        if not user.counterparty:
            return queryset.none()
        
        model = queryset.model
        
        # Contracts: только где landlord == user.counterparty
        # Если landlord не указан, используем fallback через property.owner (если есть)
        if model.__name__ == 'Contract':
            # Сначала ищем по полю landlord
            contracts_by_landlord = queryset.filter(landlord=user.counterparty)
            # Если есть договоры без landlord, но с property, где owner совпадает с именем контрагента
            # (это fallback для старых данных)
            contracts_by_property_owner = queryset.filter(
                landlord__isnull=True,
                property__owner__icontains=user.counterparty.name
            )
            return (contracts_by_landlord | contracts_by_property_owner).distinct()
        
        # Accruals: через contract.landlord
        if model.__name__ == 'Accrual':
            contract_ids = Contract.objects.filter(
                Q(landlord=user.counterparty) | 
                Q(landlord__isnull=True, property__owner__icontains=user.counterparty.name)
            ).values_list('id', flat=True)
            return queryset.filter(contract_id__in=contract_ids)
        
        # Payments: через contract.landlord
        if model.__name__ == 'Payment':
            contract_ids = Contract.objects.filter(
                Q(landlord=user.counterparty) | 
                Q(landlord__isnull=True, property__owner__icontains=user.counterparty.name)
            ).values_list('id', flat=True)
            return queryset.filter(contract_id__in=contract_ids)
        
        # Deposits: через contract.landlord
        if model.__name__ == 'Deposit':
            contract_ids = Contract.objects.filter(
                Q(landlord=user.counterparty) | 
                Q(landlord__isnull=True, property__owner__icontains=user.counterparty.name)
            ).values_list('id', flat=True)
            return queryset.filter(contract_id__in=contract_ids)

        # Expenses: через contract.landlord
        if model.__name__ == 'Expense':
            contract_ids = Contract.objects.filter(
                Q(landlord=user.counterparty) | 
                Q(landlord__isnull=True, property__owner__icontains=user.counterparty.name)
            ).values_list('id', flat=True)
            return queryset.filter(contract_id__in=contract_ids)
        
        # Properties: только те, где есть договоры с этим landlord
        if model.__name__ == 'Property':
            contract_ids = Contract.objects.filter(
                Q(landlord=user.counterparty) | 
                Q(landlord__isnull=True, property__owner__icontains=user.counterparty.name)
            ).values_list('property_id', flat=True)
            return queryset.filter(id__in=contract_ids).distinct()
        
        # Tenant: только свой
        if model.__name__ == 'Tenant':
            return queryset.filter(id=user.counterparty_id)
        
        # Account: только для admin/staff (клиенты не видят счета)
        if model.__name__ == 'Account':
            return queryset.none()
        
        return queryset.none()
    
    def _scope_for_investor(self, queryset, user):
        """Ограничение для инвестора через InvestorLink"""
        if not user.counterparty:
            return queryset.none()
        
        model = queryset.model
        
        # Получаем все связи инвестора
        links = InvestorLink.objects.filter(investor=user.counterparty, status='active')
        
        property_ids = [l.property_id for l in links if l.property_id]
        contract_ids = [l.contract_id for l in links if l.contract_id]
        
        # Properties: через investor_links
        if model.__name__ == 'Property':
            if property_ids:
                return queryset.filter(id__in=property_ids)
            return queryset.none()
        
        # Contracts: через investor_links
        if model.__name__ == 'Contract':
            if contract_ids:
                return queryset.filter(id__in=contract_ids)
            # Также через property
            if property_ids:
                return queryset.filter(property_id__in=property_ids)
            return queryset.none()
        
        # Accruals: через contract
        if model.__name__ == 'Accrual':
            if contract_ids:
                return queryset.filter(contract_id__in=contract_ids)
            if property_ids:
                return queryset.filter(contract__property_id__in=property_ids)
            return queryset.none()
        
        # Payments: через contract
        if model.__name__ == 'Payment':
            if contract_ids:
                return queryset.filter(contract_id__in=contract_ids)
            if property_ids:
                return queryset.filter(contract__property_id__in=property_ids)
            return queryset.none()
        
        # Deposits: через contract
        if model.__name__ == 'Deposit':
            if contract_ids:
                return queryset.filter(contract_id__in=contract_ids)
            if property_ids:
                return queryset.filter(contract__property_id__in=property_ids)
            return queryset.none()
        
        # Expenses: через contract или property
        if model.__name__ == 'Expense':
            if contract_ids:
                return queryset.filter(contract_id__in=contract_ids)
            if property_ids:
                return queryset.filter(property_id__in=property_ids)
            return queryset.none()
        
        # Tenant: только свой
        if model.__name__ == 'Tenant':
            return queryset.filter(id=user.counterparty_id)
        
        # Account: только для admin/staff (клиенты не видят счета)
        if model.__name__ == 'Account':
            return queryset.none()
        
        return queryset.none()
    
    def check_object_scope(self, request, obj):
        """Проверка доступа к конкретному объекту"""
        user = request.user
        
        if user.role == 'admin':
            return True
        
        if user.role == 'staff':
            return self._check_staff_assignment(user, obj)
        
        if user.role == 'tenant':
            return self._check_tenant_scope(user, obj)
        
        if user.role == 'landlord':
            return self._check_landlord_scope(user, obj)
        
        if user.role == 'investor':
            return self._check_investor_scope(user, obj)
        
        return False
    
    def _check_staff_assignment(self, user, obj):
        """Проверка назначения для сотрудника"""
        model_name = obj.__class__.__name__
        
        if model_name == 'Property':
            return StaffAssignment.objects.filter(staff=user, property=obj).exists()
        elif model_name == 'Contract':
            return StaffAssignment.objects.filter(staff=user, contract=obj).exists()
        elif model_name == 'Tenant':
            return StaffAssignment.objects.filter(staff=user, counterparty=obj).exists()
        elif hasattr(obj, 'contract'):
            return StaffAssignment.objects.filter(staff=user, contract=obj.contract).exists()
        elif hasattr(obj, 'property'):
            return StaffAssignment.objects.filter(staff=user, property=obj.property).exists()
        
        return False
    
    def _check_tenant_scope(self, user, obj):
        """Проверка scope для арендатора"""
        if not user.counterparty:
            return False
        
        model_name = obj.__class__.__name__
        
        if model_name == 'Contract':
            return obj.tenant_id == user.counterparty_id
        elif model_name == 'Accrual':
            return obj.contract.tenant_id == user.counterparty_id
        elif model_name == 'Payment':
            return obj.contract.tenant_id == user.counterparty_id
        elif model_name == 'Deposit':
            return obj.contract.tenant_id == user.counterparty_id
        elif model_name == 'Property':
            return obj.contracts.filter(tenant=user.counterparty).exists()
        elif model_name == 'Tenant':
            return obj.id == user.counterparty_id
        
        return False
    
    def _check_landlord_scope(self, user, obj):
        """Проверка scope для арендодателя"""
        if not user.counterparty:
            return False
        
        model_name = obj.__class__.__name__
        
        if model_name == 'Contract':
            # Проверяем по полю landlord или fallback через property.owner
            if obj.landlord_id == user.counterparty_id:
                return True
            if not obj.landlord_id and obj.property and obj.property.owner:
                return user.counterparty.name.lower() in obj.property.owner.lower()
            return False
        elif model_name == 'Accrual':
            contract = obj.contract
            if contract.landlord_id == user.counterparty_id:
                return True
            if not contract.landlord_id and contract.property and contract.property.owner:
                return user.counterparty.name.lower() in contract.property.owner.lower()
            return False
        elif model_name == 'Payment':
            contract = obj.contract
            if contract.landlord_id == user.counterparty_id:
                return True
            if not contract.landlord_id and contract.property and contract.property.owner:
                return user.counterparty.name.lower() in contract.property.owner.lower()
            return False
        elif model_name == 'Property':
            # Проверяем через договоры
            return obj.contracts.filter(
                Q(landlord=user.counterparty) | 
                Q(landlord__isnull=True, property__owner__icontains=user.counterparty.name)
            ).exists()
        elif model_name == 'Tenant':
            return obj.id == user.counterparty_id
        
        return False
    
    def _check_investor_scope(self, user, obj):
        """Проверка scope для инвестора"""
        if not user.counterparty:
            return False
        
        model_name = obj.__class__.__name__
        
        if model_name == 'Property':
            return InvestorLink.objects.filter(investor=user.counterparty, property=obj, status='active').exists()
        elif model_name == 'Contract':
            return InvestorLink.objects.filter(investor=user.counterparty, contract=obj, status='active').exists()
        elif model_name == 'Accrual':
            return InvestorLink.objects.filter(investor=user.counterparty, contract=obj.contract, status='active').exists()
        elif model_name == 'Payment':
            return InvestorLink.objects.filter(investor=user.counterparty, contract=obj.contract, status='active').exists()
        elif model_name == 'Deposit':
            return InvestorLink.objects.filter(investor=user.counterparty, contract=obj.contract, status='active').exists()
        elif model_name == 'Tenant':
            return obj.id == user.counterparty_id
        
        return False
    
    def get_object(self):
        """Переопределяем get_object для проверки доступа"""
        obj = super().get_object()
        
        # Проверяем доступ к объекту
        if not self.check_object_scope(self.request, obj):
            raise NotFound("Объект не найден или доступ запрещен")
        
        return obj

        return obj
