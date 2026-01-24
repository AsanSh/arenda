"""
Views для аутентификации и профиля пользователя
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from .models import Tenant

User = get_user_model()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """
    Endpoint /api/auth/me
    Возвращает профиль пользователя, роль, разрешения и минимальный профиль
    """
    user = request.user
    
    # Определяем разрешения в зависимости от роли
    permissions_summary = {
        'can_read_tenants': user.role in ['admin', 'staff'],
        'can_write_tenants': user.role == 'admin',
        'can_read_properties': True,
        'can_write_properties': user.role in ['admin', 'staff'],
        'can_read_contracts': True,
        'can_write_contracts': user.role in ['admin', 'staff'],
        'can_read_accruals': True,
        'can_write_accruals': user.role in ['admin', 'staff'],
        'can_read_payments': True,
        'can_write_payments': user.role in ['admin', 'staff'],
        'can_read_reports': True,
        'can_write_reports': False,  # Отчеты только для чтения
        'can_read_notifications': True,
        'can_write_notifications': user.role in ['admin', 'staff'],
        'can_read_settings': True,
        'can_write_settings': True,  # Все могут менять свои настройки
        'can_read_help': True,
        'can_write_help': False,
        'can_read_requests': True,
        'can_write_requests': True,  # Все могут создавать заявки
        'can_manage_requests': user.role in ['admin', 'staff'],  # Управление заявками
    }
    
    # Информация о контрагенте (если есть)
    counterparty_data = None
    if user.counterparty:
        counterparty_data = {
            'id': user.counterparty.id,
            'name': user.counterparty.name,
            'type': user.counterparty.type,
            'type_display': user.counterparty.get_type_display(),
            'email': user.counterparty.email,
            'phone': user.counterparty.phone,
        }
    
    response_data = {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
        'role_display': user.get_role_display(),
        'phone': user.phone,
        'counterparty': counterparty_data,
        'counterparty_id': user.counterparty_id if user.counterparty else None,
        'preferences': user.preferences or {},
        'permissions': permissions_summary,
        'is_admin': user.role == 'admin',
        'is_staff': user.role in ['admin', 'staff'],
        'is_client': user.role in ['tenant', 'landlord', 'investor'],
    }
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([AllowAny])  # Разрешаем без авторизации для проверки номера
def check_phone(request):
    """
    Endpoint /api/auth/check-phone?phone=...
    Проверяет, существует ли пользователь или контрагент с указанным номером телефона.
    Используется при WhatsApp логине.
    """
    phone = request.query_params.get('phone', '').strip()
    
    if not phone:
        return Response(
            {'error': 'Phone number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Нормализуем номер телефона
    normalized_phone = ''.join(filter(str.isdigit, phone))
    
    # Создаем варианты для поиска
    search_phones = set()
    search_phones.add(phone)
    search_phones.add(normalized_phone)
    
    if normalized_phone.startswith('996') and len(normalized_phone) >= 12:
        search_phones.add(f"+{normalized_phone}")
        search_phones.add(normalized_phone[3:])  # Без 996
        search_phones.add(f"+996{normalized_phone[3:]}")
    elif len(normalized_phone) == 9:
        search_phones.add(f"996{normalized_phone}")
        search_phones.add(f"+996{normalized_phone}")
        search_phones.add(f"+{normalized_phone}")
    
    # Ищем контрагента
    tenant_query = Q()
    for search_phone in search_phones:
        if search_phone and len(search_phone) >= 9:
            tenant_query |= Q(phone=search_phone)
            tenant_query |= Q(phone__icontains=search_phone)
    
    tenant = Tenant.objects.filter(tenant_query).first()
    
    # Ищем пользователя
    user_query = Q()
    for search_phone in search_phones:
        if search_phone and len(search_phone) >= 9:
            user_query |= Q(phone=search_phone)
            user_query |= Q(phone__icontains=search_phone)
    
    user = User.objects.filter(user_query).first()
    
    # Формируем ответ
    result = {
        'found': False,
        'has_tenant': False,
        'has_user': False,
        'tenant_id': None,
        'user_id': None,
        'user_role': None,
        'can_login': False,
    }
    
    if tenant:
        result['found'] = True
        result['has_tenant'] = True
        result['tenant_id'] = tenant.id
        result['tenant_name'] = tenant.name
    
    if user:
        result['found'] = True
        result['has_user'] = True
        result['user_id'] = user.id
        result['user_role'] = user.role
        result['user_username'] = user.username
        result['can_login'] = True  # Если есть пользователь, можно войти
    
    # Если есть контрагент, но нет пользователя, все равно можно войти (создастся сессия)
    if tenant and not user:
        result['can_login'] = True
    
    return Response(result, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_whatsapp(request):
    """
    Endpoint /api/auth/login-whatsapp
    Создает сессию Django для пользователя по номеру телефона (WhatsApp логин)
    """
    from django.contrib.auth import login
    
    phone = request.data.get('phone', '').strip()
    
    if not phone:
        return Response(
            {'error': 'Phone number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Нормализуем номер телефона
    normalized_phone = ''.join(filter(str.isdigit, phone))
    
    # Создаем варианты для поиска
    search_phones = set()
    search_phones.add(phone)
    search_phones.add(normalized_phone)
    
    if normalized_phone.startswith('996') and len(normalized_phone) >= 12:
        search_phones.add(f"+{normalized_phone}")
        search_phones.add(normalized_phone[3:])
        search_phones.add(f"+996{normalized_phone[3:]}")
    elif len(normalized_phone) == 9:
        search_phones.add(f"996{normalized_phone}")
        search_phones.add(f"+996{normalized_phone}")
        search_phones.add(f"+{normalized_phone}")
    
    # Сначала ищем контрагента по номеру телефона
    # ВАЖНО: Ищем точное совпадение сначала, потом частичное
    tenant = None
    
    # Сначала пробуем точное совпадение
    for search_phone in search_phones:
        if search_phone and len(search_phone) >= 9:
            tenant = Tenant.objects.filter(phone=search_phone).first()
            if tenant:
                print(f"✅ Found tenant by exact phone match: {search_phone} -> {tenant.name} (type: {tenant.type})")
                break
    
    # Если точного совпадения нет, пробуем частичное
    if not tenant:
        tenant_query = Q()
        for search_phone in search_phones:
            if search_phone and len(search_phone) >= 9:
                tenant_query |= Q(phone__icontains=search_phone)
        
        tenant = Tenant.objects.filter(tenant_query).first()
        if tenant:
            print(f"✅ Found tenant by partial phone match: {tenant.name} (type: {tenant.type}, phone: {tenant.phone})")
    
    # Определяем роль на основе типа контрагента (если найден)
    role_mapping = {
        'tenant': 'tenant',
        'landlord': 'landlord',
        'property_owner': 'landlord',
        'investor': 'investor',
        'staff': 'staff',
        'admin': 'admin',
    }
    
    # Если контрагент не найден, возвращаем ошибку
    if not tenant:
        print(f"❌ Tenant not found for phone: {phone} (searched variants: {list(search_phones)})")
        return Response(
            {'error': 'Tenant not found for this phone number'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    user_role = role_mapping.get(tenant.type, 'tenant')
    print(f"🔐 Login attempt: phone={phone}, tenant={tenant.name}, tenant_type={tenant.type}, assigned_role={user_role}")
    
    # Ищем существующего пользователя
    user_query = Q()
    for search_phone in search_phones:
        if search_phone and len(search_phone) >= 9:
            user_query |= Q(phone=search_phone)
            user_query |= Q(phone__icontains=search_phone)
    
    user = User.objects.filter(user_query).first()
    
    if not user:
        # Создаем нового пользователя на основе контрагента
        username = f"user_{tenant.id}_{normalized_phone[-9:]}"
        user = User.objects.create(
            username=username,
            phone=phone,
            role=user_role,
            counterparty=tenant,
        )
        user.set_unusable_password()  # Пароль не нужен для WhatsApp логина
        user.save()
        print(f"✅ Created new user: {username} with role {user_role} for tenant {tenant.name}")
    else:
        # Обновляем существующего пользователя: роль и контрагент должны соответствовать контрагенту
        # ВАЖНО: Всегда обновляем роль на основе типа контрагента, даже если пользователь уже существует
        old_role = user.role
        old_counterparty = user.counterparty
        updated = False
        if user.counterparty != tenant:
            print(f"🔄 Updating user counterparty: {old_counterparty} -> {tenant.name}")
            user.counterparty = tenant
            updated = True
        if user.role != user_role:
            print(f"🔄 Updating user role: {old_role} -> {user_role} (based on tenant type: {tenant.type})")
            user.role = user_role
            updated = True
        if user.phone != phone:
            print(f"🔄 Updating user phone: {user.phone} -> {phone}")
            user.phone = phone
            updated = True
        if updated:
            user.save()
            print(f"✅ Updated existing user: {user.username} (role: {user.role}, counterparty: {user.counterparty.name})")
        else:
            print(f"ℹ️ User {user.username} already has correct role {user.role} and counterparty {user.counterparty.name}")
    
    # Создаем Django сессию
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    
    return Response({
        'success': True,
        'user_id': user.id,
        'username': user.username,
        'role': user.role,
        'counterparty_id': user.counterparty_id,
    }, status=status.HTTP_200_OK)
