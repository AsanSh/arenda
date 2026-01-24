"""
Views для правильной авторизации через WhatsApp QR с attemptId и OTP кодом
ВАЖНО: Никаких fallback на админа или первого пользователя!
"""
import re
import logging
import random
import requests
from datetime import timedelta
from django.utils import timezone
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from django.views.decorators.csrf import csrf_exempt
from .models import LoginAttempt, Tenant

User = get_user_model()
logger = logging.getLogger(__name__)

# Настройка логирования (БЕЗ токенов и секретов)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)

# Green API настройки
GREEN_API_ID_INSTANCE = '7107486710'
GREEN_API_TOKEN = '6633644896594f7db36235195f23579325e7a9498eab4411bd'
GREEN_API_BASE_URL = 'https://api.green-api.com'


def send_whatsapp_message(phone: str, message: str) -> tuple[bool, str]:
    """
    Отправляет сообщение через Green API
    Возвращает (success, error_message)
    """
    try:
        # Форматируем номер для Green API (убираем +, добавляем @c.us)
        chat_id = phone.replace('+', '').replace(' ', '').replace('-', '') + '@c.us'
        
        url = f"{GREEN_API_BASE_URL}/waInstance{GREEN_API_ID_INSTANCE}/sendMessage/{GREEN_API_TOKEN}"
        
        response = requests.post(
            url,
            json={
                'chatId': chat_id,
                'message': message,
            },
            timeout=10
        )
        
        if response.status_code == 200:
            logger.info(f"WhatsApp message sent successfully to {phone[:4]}***")
            return True, ""
        else:
            error_msg = f"Green API error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            return False, error_msg
            
    except Exception as e:
        error_msg = f"Failed to send WhatsApp message: {str(e)}"
        logger.error(error_msg)
        return False, error_msg


def normalize_phone(phone: str) -> str:
    """
    Нормализует номер телефона в формат E.164 (+996XXXXXXXXX)
    """
    if not phone:
        return ""
    
    # Убираем все нецифровые символы (пробелы, дефисы и т.д.)
    digits = ''.join(filter(str.isdigit, phone))
    
    # Если номер начинается с 996 и имеет 12 цифр
    if digits.startswith('996') and len(digits) == 12:
        return f"+{digits}"
    
    # Если номер из 9 цифр (без 996)
    if len(digits) == 9:
        return f"+996{digits}"
    
    # Если начинается с 996 без +
    if digits.startswith('996') and len(digits) >= 12:
        return f"+{digits}"
    
    # Если уже начинается с +, но нужно убрать пробелы
    if phone.startswith('+'):
        # Убираем все кроме цифр и +, затем нормализуем
        cleaned = '+' + digits
        if len(digits) == 12 and digits.startswith('996'):
            return cleaned
        elif len(digits) == 9:
            return f"+996{digits}"
        return cleaned
    
    # По умолчанию добавляем +996
    if len(digits) == 9:
        return f"+996{digits}"
    
    # Если ничего не подошло, возвращаем нормализованный вариант
    if len(digits) >= 9:
        if digits.startswith('996'):
            return f"+{digits}"
        else:
            return f"+996{digits[-9:]}"
    
    return phone


def find_user_by_phone(phone: str) -> tuple[User | None, str]:
    """
    Находит пользователя по номеру телефона.
    Возвращает (user, error_message)
    error_message пустой если все ОК
    """
    normalized = normalize_phone(phone)
    
    if not normalized:
        return None, "Invalid phone number"
    
    # Создаем варианты для поиска
    search_variants = [
        normalized,
        normalized.replace('+', ''),
        normalized.replace('+996', ''),
        f"996{normalized.replace('+', '').replace('996', '')}" if normalized.startswith('+996') else normalized,
    ]
    
    # Ищем контрагента по точному совпадению
    tenant = None
    for variant in search_variants:
        tenant = Tenant.objects.filter(phone=variant).first()
        if tenant:
            logger.info(f"Found tenant by exact match: {variant} -> {tenant.name} (type: {tenant.type})")
            break
    
    # Если не нашли точное совпадение, пробуем частичное
    if not tenant:
        for variant in search_variants:
            if len(variant) >= 9:
                tenant = Tenant.objects.filter(phone__icontains=variant).first()
                if tenant:
                    logger.info(f"Found tenant by partial match: {variant} -> {tenant.name} (type: {tenant.type})")
                    break
    
    if not tenant:
        logger.warning(f"Tenant not found for phone: {phone} (normalized: {normalized})")
        return None, "USER_NOT_FOUND"
    
    # Определяем роль на основе типа контрагента
    role_mapping = {
        'tenant': 'tenant',
        'landlord': 'landlord',
        'property_owner': 'landlord',
        'investor': 'investor',
        'staff': 'staff',
        'admin': 'admin',
    }
    user_role = role_mapping.get(tenant.type, 'tenant')
    
    # Ищем пользователя по номеру телефона
    users = User.objects.filter(
        Q(phone=normalized) | 
        Q(phone__in=search_variants) |
        Q(counterparty=tenant)
    ).distinct()
    
    user_count = users.count()
    
    if user_count == 0:
        # Создаем нового пользователя
        username = f"user_{tenant.id}_{normalized[-9:]}"
        user = User.objects.create(
            username=username,
            phone=normalized,
            role=user_role,
            counterparty=tenant,
        )
        user.set_unusable_password()
        user.save()
        logger.info(f"Created new user: {username} with role {user_role} for tenant {tenant.name}")
        return user, ""
    
    if user_count > 1:
        logger.error(f"Multiple users found for phone {phone} (normalized: {normalized}): {user_count} users")
        return None, "PHONE_NOT_UNIQUE"
    
    # Один пользователь найден - обновляем его данные если нужно
    user = users.first()
    updated = False
    
    if user.counterparty != tenant:
        logger.info(f"Updating user counterparty: {user.counterparty} -> {tenant.name}")
        user.counterparty = tenant
        updated = True
    
    if user.role != user_role:
        logger.info(f"Updating user role: {user.role} -> {user_role} (based on tenant type: {tenant.type})")
        user.role = user_role
        updated = True
    
    if user.phone != normalized:
        logger.info(f"Updating user phone: {user.phone} -> {normalized}")
        user.phone = normalized
        updated = True
    
    if updated:
        user.save()
        logger.info(f"Updated user: {user.username} (role: {user.role}, counterparty: {user.counterparty.name})")
    
    return user, ""


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def whatsapp_start(request):
    """
    POST /api/auth/whatsapp/start
    Создает новую попытку входа через WhatsApp QR
    """
    import uuid
    
    attempt_id = str(uuid.uuid4())
    expires_at = timezone.now() + timedelta(minutes=5)
    
    # Метаданные (опционально)
    metadata = {
        'user_agent': request.META.get('HTTP_USER_AGENT', ''),
        'ip': request.META.get('REMOTE_ADDR', ''),
    }
    
    login_attempt = LoginAttempt.objects.create(
        attempt_id=attempt_id,
        status='NEW',
        expires_at=expires_at,
        metadata=metadata,
    )
    
    logger.info(f"Login attempt created: attemptId={attempt_id}, expiresAt={expires_at.isoformat()}, ip={metadata.get('ip', 'N/A')}")
    
    # Формируем текст сообщения для QR
    login_message = f"AMT LOGIN {attempt_id}"
    
    return Response({
        'attemptId': attempt_id,
        'expiresAt': expires_at.isoformat(),
        'loginMessage': login_message,
        'qrPayload': login_message,  # Для QR кода
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def whatsapp_status(request):
    """
    GET /api/auth/whatsapp/status?attemptId=...
    Проверяет статус попытки входа
    """
    attempt_id = request.query_params.get('attemptId', '').strip()
    
    if not attempt_id:
        return Response(
            {'error': 'attemptId is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        login_attempt = LoginAttempt.objects.get(attempt_id=attempt_id)
    except LoginAttempt.DoesNotExist:
        return Response(
            {'error': 'Login attempt not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Проверяем истечение
    if login_attempt.is_expired() and login_attempt.status == 'NEW':
        login_attempt.status = 'FAILED'
        login_attempt.failure_reason = 'ATTEMPT_EXPIRED'
        login_attempt.save()
        logger.warning(f"Login attempt expired: {attempt_id}")
    
    response_data = {
        'status': login_attempt.status,
        'attemptId': login_attempt.attempt_id,
    }
    
    if login_attempt.status == 'COMPLETED' and login_attempt.user:
        # Используем Django сессию (уже настроена в проекте)
        # Токен не нужен, так как используется session authentication
        
        response_data.update({
            'user': {
                'id': login_attempt.user.id,
                'username': login_attempt.user.username,
                'role': login_attempt.user.role,
                'phone': login_attempt.user.phone,
                'counterpartyId': login_attempt.user.counterparty_id if login_attempt.user.counterparty else None,
            }
        })
    elif login_attempt.status == 'FAILED':
        response_data['failureReason'] = login_attempt.failure_reason
        if login_attempt.failure_reason == 'USER_NOT_FOUND':
            response_data['error'] = 'Номер не зарегистрирован в системе'
        elif login_attempt.failure_reason == 'PHONE_NOT_UNIQUE':
            response_data['error'] = 'Номер привязан к нескольким аккаунтам, обратитесь к администратору'
        elif login_attempt.failure_reason == 'ATTEMPT_EXPIRED':
            response_data['error'] = 'Попытка входа истекла. Пожалуйста, отсканируйте QR-код заново'
        else:
            response_data['error'] = 'Ошибка при входе'
    
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def greenapi_webhook(request):
    """
    POST /api/webhooks/greenapi/incoming
    Webhook для обработки входящих сообщений от Green API
    """
    try:
        data = request.data
        
        # Проверяем тип webhook
        webhook_type = data.get('typeWebhook', '')
        
        if webhook_type != 'incomingMessageReceived':
            # Игнорируем другие типы webhooks
            return Response({'status': 'ignored'}, status=status.HTTP_200_OK)
        
        # Извлекаем данные сообщения
        message_data = data.get('messageData', {})
        sender_data = data.get('senderData', {})
        
        if not message_data or not sender_data:
            logger.warning("Missing messageData or senderData in webhook")
            return Response({'status': 'error', 'message': 'Invalid webhook data'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Извлекаем номер отправителя
        sender_phone = sender_data.get('sender', '') or sender_data.get('phone', '')
        if not sender_phone:
            logger.warning("No sender phone in webhook data")
            return Response({'status': 'error', 'message': 'No sender phone'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Убираем @c.us или @g.us из номера
        sender_phone = sender_phone.split('@')[0]
        
        # Извлекаем текст сообщения
        message_text = message_data.get('textMessageData', {}).get('textMessage', '')
        if not message_text:
            sender_masked = sender_phone[:4] + "***" if len(sender_phone) > 4 else "***"
            logger.warning(f"No text message in webhook for sender {sender_masked}")
            return Response({'status': 'ignored'}, status=status.HTTP_200_OK)
        
        # Парсим attemptId из сообщения
        # Формат: "AMT LOGIN <attemptId>"
        match = re.search(r'AMT\s+LOGIN\s+([a-f0-9\-]{36})', message_text, re.IGNORECASE)
        if not match:
            logger.warning(f"Could not parse attemptId from message: {message_text[:100]}")
            return Response({'status': 'ignored'}, status=status.HTTP_200_OK)
        
        attempt_id = match.group(1)
        
        logger.info(f"Webhook received: attemptId={attempt_id}, senderPhone={sender_phone}")
        
        # Находим попытку входа
        try:
            login_attempt = LoginAttempt.objects.get(attempt_id=attempt_id)
        except LoginAttempt.DoesNotExist:
            logger.warning(f"Login attempt not found: {attempt_id}")
            return Response({'status': 'error', 'message': 'Login attempt not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Проверяем статус
        if login_attempt.status != 'NEW':
            logger.warning(f"Login attempt already processed: {attempt_id}, status: {login_attempt.status}")
            return Response({'status': 'ignored', 'message': 'Already processed'}, status=status.HTTP_200_OK)
        
        # Проверяем истечение
        if login_attempt.is_expired():
            login_attempt.status = 'FAILED'
            login_attempt.failure_reason = 'ATTEMPT_EXPIRED'
            login_attempt.save()
            logger.warning(f"Login attempt expired: {attempt_id}")
            return Response({'status': 'error', 'message': 'Attempt expired'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Нормализуем номер телефона
        normalized_phone = normalize_phone(sender_phone)
        
        # Логируем БЕЗ токенов и секретов (маскируем номер телефона)
        sender_masked = sender_phone[:4] + "***" if len(sender_phone) > 4 else "***"
        normalized_masked = normalized_phone[:4] + "***" if len(normalized_phone) > 4 else "***"
        logger.info(f"Webhook processing: attemptId={attempt_id}, senderPhone={sender_masked}, normalizedPhone={normalized_masked}")
        
        # Находим пользователя по номеру телефона
        user, error = find_user_by_phone(normalized_phone)
        
        if error:
            login_attempt.status = 'FAILED'
            login_attempt.failure_reason = error
            login_attempt.verified_phone = normalized_phone
            login_attempt.save()
            
            logger.error(f"Login failed: attemptId={attempt_id}, reason={error}, phone={normalized_phone}")
            
            return Response({
                'status': 'error',
                'message': error,
                'failureReason': error
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Пользователь найден - завершаем попытку
        login_attempt.status = 'VERIFIED'
        login_attempt.verified_phone = normalized_phone
        login_attempt.user = user
        login_attempt.save()
        
        # Маскируем номер телефона в логах
        phone_masked = normalized_phone[:4] + "***" if len(normalized_phone) > 4 else "***"
        logger.info(f"Login verified: attemptId={attempt_id}, userId={user.id}, role={user.role}, phone={phone_masked}")
        
        # Создаем Django сессию для пользователя
        from django.contrib.auth import login
        login(request, user, backend='django.contrib.auth.backends.ModelBackend')
        
        # Обновляем статус на COMPLETED
        login_attempt.status = 'COMPLETED'
        login_attempt.save()
        
        logger.info(f"Login completed: attemptId={attempt_id}, userId={user.id}, role={user.role}")
        
        return Response({
            'status': 'success',
            'attemptId': attempt_id,
            'userId': user.id,
            'role': user.role,
            'phone': normalized_phone,
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.exception(f"Error processing webhook: {str(e)}")
        return Response({
            'status': 'error',
            'message': 'Internal server error'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@authentication_classes([])  # Отключаем SessionAuthentication для этого эндпоинта
@permission_classes([AllowAny])
def whatsapp_request_code(request):
    """
    POST /api/auth/whatsapp/request-code
    Запрос одноразового кода для входа через WhatsApp
    """
    import uuid
    
    phone = request.data.get('phone', '').strip()
    
    if not phone:
        return Response(
            {'error': 'Phone number is required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Нормализуем номер телефона
    normalized_phone = normalize_phone(phone)
    
    if not normalized_phone:
        return Response(
            {'error': 'Invalid phone number format'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Проверяем, есть ли контрагент с таким номером
    user, error = find_user_by_phone(normalized_phone)
    
    if error == 'USER_NOT_FOUND':
        logger.warning(f"Phone not found in database: {normalized_phone[:4]}***")
        return Response(
            {'error': 'Номер не зарегистрирован в системе. Обратитесь к администратору.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if error:
        logger.error(f"Error finding user: {error}")
        return Response(
            {'error': 'Ошибка при поиске пользователя'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Генерируем 6-значный код
    otp_code = str(random.randint(100000, 999999))
    
    # Создаем попытку входа
    attempt_id = str(uuid.uuid4())
    expires_at = timezone.now() + timedelta(minutes=5)
    
    login_attempt = LoginAttempt.objects.create(
        attempt_id=attempt_id,
        status='NEW',
        expected_phone=normalized_phone,
        otp_code=otp_code,
        expires_at=expires_at,
        metadata={
            'user_agent': request.META.get('HTTP_USER_AGENT', ''),
            'ip': request.META.get('REMOTE_ADDR', ''),
            'method': 'OTP',
        }
    )
    
    # Отправляем код через WhatsApp
    message = f"Ваш код для входа в систему AMT: {otp_code}\n\nКод действителен 5 минут."
    success, error_msg = send_whatsapp_message(normalized_phone, message)
    
    if not success:
        login_attempt.status = 'FAILED'
        login_attempt.failure_reason = 'PARSE_FAILED'
        login_attempt.save()
        logger.error(f"Failed to send OTP code: {error_msg}")
        return Response(
            {'error': 'Не удалось отправить код. Проверьте настройки Green API.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    logger.info(f"OTP code requested: attemptId={attempt_id}, phone={normalized_phone[:4]}***")
    
    return Response({
        'success': True,
        'attemptId': attempt_id,
        'message': 'Код отправлен на WhatsApp',
        'expiresAt': expires_at.isoformat(),
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@authentication_classes([])  # Отключаем SessionAuthentication для этого эндпоинта
@permission_classes([AllowAny])
def whatsapp_verify_code(request):
    """
    POST /api/auth/whatsapp/verify-code
    Проверка одноразового кода и вход в систему
    """
    from django.contrib.auth import login
    
    attempt_id = request.data.get('attemptId', '').strip()
    code = request.data.get('code', '').strip()
    
    if not attempt_id or not code:
        return Response(
            {'error': 'attemptId and code are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        login_attempt = LoginAttempt.objects.get(attempt_id=attempt_id)
    except LoginAttempt.DoesNotExist:
        return Response(
            {'error': 'Попытка входа не найдена'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Проверяем истечение
    if login_attempt.is_expired():
        login_attempt.status = 'FAILED'
        login_attempt.failure_reason = 'ATTEMPT_EXPIRED'
        login_attempt.save()
        return Response(
            {'error': 'Код истек. Запросите новый код.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Проверяем код
    if login_attempt.otp_code != code:
        logger.warning(f"Invalid OTP code for attemptId={attempt_id}")
        return Response(
            {'error': 'Неверный код. Проверьте и попробуйте снова.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Код верный - находим пользователя
    if not login_attempt.expected_phone:
        return Response(
            {'error': 'Номер телефона не указан'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user, error = find_user_by_phone(login_attempt.expected_phone)
    
    if error:
        login_attempt.status = 'FAILED'
        login_attempt.failure_reason = error
        login_attempt.save()
        return Response(
            {'error': 'Ошибка при поиске пользователя'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Создаем Django сессию
    login(request, user, backend='django.contrib.auth.backends.ModelBackend')
    
    # Обновляем попытку входа
    login_attempt.status = 'COMPLETED'
    login_attempt.verified_phone = login_attempt.expected_phone
    login_attempt.user = user
    login_attempt.save()
    
    logger.info(f"OTP login successful: attemptId={attempt_id}, userId={user.id}, role={user.role}")
    
    return Response({
        'success': True,
        'user': {
            'id': user.id,
            'username': user.username,
            'role': user.role,
            'phone': user.phone,
            'counterpartyId': user.counterparty_id if user.counterparty else None,
        }
    }, status=status.HTTP_200_OK)
