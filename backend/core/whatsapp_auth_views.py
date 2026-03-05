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
from .models import LoginAttempt, Tenant, ADMIN_PHONES, ensure_protected_admin
from .utils import normalize_phone as normalize_phone_996
from .permissions import get_user_type, get_user_permissions

User = get_user_model()
logger = logging.getLogger(__name__)

# Настройка логирования (БЕЗ токенов и секретов)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)

def _green_api_config():
    """Конфиг Green API из Django settings (настраивается через env)."""
    base = getattr(settings, 'GREEN_API_BASE_URL', 'https://7103.api.greenapi.com').rstrip('/')
    instance_id = getattr(settings, 'GREEN_API_ID_INSTANCE', '7103495361')
    token = getattr(settings, 'GREEN_API_API_TOKEN', '')
    return base, instance_id, token


def send_whatsapp_message(phone: str, message: str) -> tuple[bool, str]:
    """
    Отправляет сообщение через Green API (настройки из GREEN_API_* в settings/env).
    Возвращает (success, error_message)
    """
    base_url, instance_id, api_token = _green_api_config()
    if not api_token:
        logger.error("GREEN_API_API_TOKEN not set; WhatsApp OTP disabled")
        return False, "WhatsApp не настроен: отсутствует API-токен Green API"

    try:
        # Форматируем номер для Green API (убираем +, добавляем @c.us)
        chat_id = phone.replace('+', '').replace(' ', '').replace('-', '') + '@c.us'

        url = f"{base_url}/waInstance{instance_id}/sendMessage/{api_token}"
        
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


def _digits_only(s: str) -> str:
    """Только цифры из строки (для сравнения номеров)."""
    return ''.join(c for c in (s or '') if c.isdigit())


def _phone_search_variants(normalized_996: str) -> list:
    """Варианты номера для поиска в БД. normalized_996 — строка 996XXXXXXXXX."""
    digits = _digits_only(normalized_996)
    if not digits or len(digits) < 9:
        return []
    variants = [normalized_996]
    if digits.startswith("996") and len(digits) >= 12:
        variants.append(f"+{digits}")
        variants.append(digits[3:])  # 9 цифр
        variants.append("0" + digits[3:])  # 0700750606
    elif len(digits) == 9:
        variants.append(f"996{digits}")
        variants.append(f"+996{digits}")
        variants.append("0" + digits)
    return list(dict.fromkeys(v for v in variants if v and len(_digits_only(v)) >= 9))


def find_user_by_phone(phone: str) -> tuple[User | None, str]:
    """
    Находит пользователя по номеру телефона.
    Номер нормализуется к формату 996XXXXXXXXX.
    Важно: приоритет у контрагента (Tenant). Если номер есть в справочнике контрагентов —
    вход идёт как этот контрагент (арендатор/владелец и т.д.), а не как User с тем же номером.
    Так арендатор с номером +996557903999 всегда входит как арендатор, а не как админ.
    """
    normalized = normalize_phone_996(phone)
    if not normalized:
        return None, "Invalid phone number"

    search_variants = _phone_search_variants(normalized)
    digits_only = _digits_only(normalized)
    admin_996 = digits_only if len(digits_only) >= 12 else ('996' + digits_only[-9:] if len(digits_only) >= 9 else None)

    # Номер администратора (+996700750606) — всегда вход как User-админ
    if admin_996 and admin_996 in ADMIN_PHONES:
        for u in User.objects.exclude(phone__isnull=True).exclude(phone=''):
            ud = _digits_only(u.phone)
            if ud == digits_only or ud == admin_996 or (len(ud) == 9 and '996' + ud == admin_996):
                ensure_protected_admin(u)
                return u, ""
        u = User.objects.filter(Q(phone=normalized) | Q(phone__in=search_variants)).first()
        if u:
            ensure_protected_admin(u)
            return u, ""

    # 1) Сначала ищем контрагента (Tenant) по номеру
    tenant = None
    for variant in search_variants:
        if len(_digits_only(variant)) < 9:
            continue
        tenant = Tenant.objects.filter(phone=variant).first()
        if not tenant:
            tenant = Tenant.objects.filter(phone__icontains=variant).first()
        if tenant:
            logger.info(f"Found tenant by phone: {tenant.name} type={tenant.type}")
            break

    # 2b) Fallback: поиск Tenant по «только цифры» (если в БД номер с пробелами/дефисами)
    if not tenant and len(digits_only) >= 9:
        for t in Tenant.objects.exclude(phone__isnull=True).exclude(phone=""):
            t_digits = _digits_only(t.phone)
            if t_digits == digits_only or (len(digits_only) == 12 and t_digits == digits_only[3:]) or (len(digits_only) == 9 and t_digits == f"996{digits_only}"):
                tenant = t
                logger.info(f"Found tenant by digits match: {tenant.name} type={tenant.type} phone={t.phone}")
                break

    if not tenant:
        # Нет контрагента с этим номером — ищем User (сотрудники/админы с полем phone)
        users_by_phone = User.objects.filter(
            Q(phone=normalized) | Q(phone__in=search_variants)
        ).distinct()
        if users_by_phone.count() > 1:
            role_order = {"admin": 0, "staff": 1, "landlord": 2, "investor": 3, "tenant": 4}
            sorted_users = sorted(
                users_by_phone,
                key=lambda u: (role_order.get(u.role, 5), u.id),
            )
            chosen = sorted_users[0]
            logger.warning(
                "PHONE_NOT_UNIQUE: phone %s*** matches %s users; using user id=%s role=%s.",
                normalized[:4], users_by_phone.count(), chosen.id, chosen.role,
            )
            if chosen.phone != normalized:
                chosen.phone = normalized
                chosen.save(update_fields=["phone"])
            ensure_protected_admin(chosen)
            return chosen, ""
        if users_by_phone.count() == 1:
            user = users_by_phone.first()
            if user.phone != normalized:
                user.phone = normalized
                user.save(update_fields=["phone"])
            ensure_protected_admin(user)
            logger.info(f"Found user by phone: {user.username} role={user.role}")
            return user, ""
        if len(digits_only) >= 9:
            for u in User.objects.exclude(phone__isnull=True).exclude(phone=""):
                if _digits_only(u.phone) == digits_only or (
                    len(digits_only) >= 12 and _digits_only(u.phone) == digits_only[-9:]
                ):
                    if u.phone != normalized:
                        u.phone = normalized
                        u.save(update_fields=["phone"])
                    ensure_protected_admin(u)
                    logger.info(f"Found user by digits match: {u.username} role={u.role}")
                    return u, ""
        logger.warning(f"No user or tenant for phone: {phone} (normalized: {normalized})")
        return None, "USER_NOT_FOUND"

    role_mapping = {
        "tenant": "tenant",
        "landlord": "landlord",
        "property_owner": "landlord",
        "company_owner": "staff",
        "investor": "investor",
        "staff": "staff",
        "admin": "admin",
        "master": "staff",
        "accounting": "staff",
        "sales": "staff",
    }
    user_role = role_mapping.get(tenant.type, "tenant")

    users = User.objects.filter(
        Q(phone=normalized) | Q(phone__in=search_variants) | Q(counterparty=tenant)
    ).distinct()
    user_count = users.count()

    if user_count == 0:
        username = f"user_{tenant.id}_{normalized[-9:]}"
        user = User.objects.create(
            username=username,
            phone=normalized,
            role=user_role,
            counterparty=tenant,
        )
        user.set_unusable_password()
        user.save()
        logger.info(f"Created user: {username} role={user_role} for tenant {tenant.name}")
        return user, ""

    if user_count > 1:
        # Дубликаты: приоритет admin → staff → привязан к этому tenant → меньший id
        role_order = {"admin": 0, "staff": 1, "landlord": 2, "investor": 3, "tenant": 4}
        sorted_users = sorted(
            users,
            key=lambda u: (
                role_order.get(u.role, 5),
                0 if u.counterparty_id == tenant.id else 1,
                u.id,
            ),
        )
        user = sorted_users[0]
        logger.warning(
            "PHONE_NOT_UNIQUE: phone %s*** tenant %s matches %s users; using user id=%s. Fix duplicates in DB.",
            normalized[:4],
            tenant.id,
            user_count,
            user.id,
        )
        if user.phone != normalized:
            user.phone = normalized
            user.save(update_fields=["phone"])
        if user.counterparty != tenant:
            user.counterparty = tenant
            user.save(update_fields=["counterparty"])
        if user.role != user_role:
            user.role = user_role
            user.save(update_fields=["role"])
        return user, ""

    user = users.first()
    updated = False
    if user.counterparty != tenant:
        user.counterparty = tenant
        updated = True
    if user.role != user_role:
        user.role = user_role
        updated = True
    if user.phone != normalized:
        user.phone = normalized
        updated = True
    if updated:
        user.save()
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
        
        # Нормализуем номер телефона (996XXXXXXXXX)
        normalized_phone = normalize_phone_996(sender_phone)
        
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
    
    try:
        phone = (request.data or {}).get('phone', '').strip()
    except Exception:
        phone = ''
    
    if not phone:
        return Response(
            {'error': 'Укажите номер телефона'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Нормализуем номер телефона (996XXXXXXXXX)
    normalized_phone = normalize_phone_996(phone)
    if not normalized_phone:
        return Response(
            {"error": "Неверный формат номера. Используйте +996XXXXXXXXX"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Находим пользователя/контрагента по номеру
    try:
        user, error = find_user_by_phone(phone)
    except Exception as e:
        logger.exception(f"find_user_by_phone failed: {e}")
        return Response(
            {'error': 'Ошибка при поиске пользователя. Попробуйте позже.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    if error == 'USER_NOT_FOUND':
        logger.warning(f"Phone not found in database: {normalized_phone[:4]}***")
        return Response(
            {'error': 'Номер не зарегистрирован в системе. Обратитесь к администратору.'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if error == 'PHONE_NOT_UNIQUE':
        logger.warning(f"Multiple accounts for phone: {normalized_phone[:4]}***")
        return Response(
            {'error': 'Номер привязан к нескольким аккаунтам. Обратитесь к администратору.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if error:
        logger.error(f"Error finding user: {error}")
        return Response(
            {'error': 'Ошибка при поиске пользователя'},
            status=status.HTTP_400_BAD_REQUEST
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

    tenant = getattr(user, "counterparty", None)
    tenant_type = tenant.type if tenant else user.role
    tenant_name = tenant.name if tenant else (getattr(user, "get_full_name", lambda: "")() or user.username or "")

    return Response({
        "success": True,
        "attemptId": attempt_id,
        "message": "Код отправлен на WhatsApp",
        "expiresAt": expires_at.isoformat(),
        "tenant_type": tenant_type,
        "tenant_name": tenant_name,
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
    
    # Создаем Django сессию (для совместимости)
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")

    from rest_framework.authtoken.models import Token
    token, _ = Token.objects.get_or_create(user=user)

    login_attempt.status = "COMPLETED"
    login_attempt.verified_phone = login_attempt.expected_phone
    login_attempt.user = user
    login_attempt.save()

    tenant = getattr(user, "counterparty", None)
    user_type = get_user_type(user)
    permissions = get_user_permissions(user_type)
    permissions["menu"] = (
        "full" if user_type == "administrator" else
        "owner" if user_type == "owner" else
        "landlord" if user_type == "landlord" else
        "tenant" if user_type == "tenant" else
        "employee" if user_type == "employee" else
        "master" if user_type == "master" else
        "minimal"
    )
    tenant_data = None
    if tenant:
        tenant_data = {
            "id": tenant.id,
            "name": tenant.name,
            "phone": tenant.phone or login_attempt.expected_phone,
            "type": tenant.type,
            "type_display": tenant.get_type_display(),
        }

    logger.info(f"OTP login successful: attemptId={attempt_id}, userId={user.id}, role={user.role}")

    return Response({
        "success": True,
        "token": token.key,
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "phone": user.phone or login_attempt.expected_phone,
            "counterpartyId": user.counterparty_id if user.counterparty else None,
        },
        "tenant": tenant_data,
        "permissions": permissions,
    }, status=status.HTTP_200_OK)
