# Реализация правильной авторизации через WhatsApp QR

## Проблема
Система всегда авторизовала как администратора (+996700750606), независимо от номера WhatsApp, использованного для входа.

## Решение
Реализована правильная архитектура с attemptId → sender phone → user mapping.

## Изменения

### 1. Модель LoginAttempt (`backend/core/models.py`)
- `id` (UUID, primary key)
- `attempt_id` (unique, indexed)
- `status` (NEW/VERIFIED/COMPLETED/FAILED)
- `failure_reason` (ATTEMPT_EXPIRED/PHONE_NOT_UNIQUE/USER_NOT_FOUND/PARSE_FAILED)
- `verified_phone` (подтвержденный номер)
- `user` (FK to User)
- `created_at`, `expires_at` (5 минут TTL)

### 2. Новые Endpoints

#### POST `/api/auth/whatsapp/start/`
Создает новую попытку входа:
- Генерирует уникальный `attemptId` (UUID)
- Создает запись `LoginAttempt` со статусом `NEW`
- Возвращает `attemptId`, `loginMessage` (текст для QR), `expiresAt`

#### GET `/api/auth/whatsapp/status/?attemptId=...`
Проверяет статус попытки:
- Возвращает текущий статус
- Если `COMPLETED` - возвращает данные пользователя (role, phone, counterpartyId)
- Если `FAILED` - возвращает `failureReason` и понятное сообщение об ошибке

#### POST `/api/webhooks/greenapi/incoming/`
Webhook для обработки входящих сообщений от Green API:
- Парсит `attemptId` из сообщения (формат: "AMT LOGIN <attemptId>")
- Извлекает `senderPhone` из webhook payload
- Нормализует номер телефона (E.164)
- Находит пользователя по номеру телефона через контрагента
- Обновляет `LoginAttempt`: `status=COMPLETED`, `verified_phone`, `user`
- Создает Django сессию для найденного пользователя

### 3. Логика поиска пользователя (`find_user_by_phone`)

**ВАЖНО: Никаких fallback на админа!**

1. Нормализует номер телефона в E.164 (+996XXXXXXXXX)
2. Ищет контрагента по номеру (точное совпадение, затем частичное)
3. Определяет роль на основе `tenant.type`:
   - `tenant` → `role='tenant'`
   - `landlord`/`property_owner` → `role='landlord'`
   - `investor` → `role='investor'`
   - `staff` → `role='staff'`
   - `admin` → `role='admin'`
4. Ищет пользователя по номеру телефона или контрагенту
5. Если пользователь не найден - создает нового с правильной ролью
6. Если найдено >1 пользователя - возвращает `PHONE_NOT_UNIQUE`
7. Если контрагент не найден - возвращает `USER_NOT_FOUND`

### 4. Логирование

**БЕЗ токенов и секретов!**

Логируются:
- `attemptId`
- `senderPhone` (первые 4 цифры, остальное ***)
- `normalizedPhone` (первые 4 цифры, остальное ***)
- `userId`, `role`, `counterpartyId`
- `failureReason` (если ошибка)

НЕ логируются:
- Токены
- Секретные ключи
- Полные номера телефонов

### 5. Фронтенд (`admin-frontend/src/pages/LoginPageNew.tsx`)

Новый flow:
1. При загрузке страницы вызывает `/auth/whatsapp/start/`
2. Получает `attemptId` и `loginMessage`
3. Генерирует QR-код со ссылкой `https://wa.me/7107486710?text=AMT LOGIN <attemptId>`
4. Опрашивает `/auth/whatsapp/status/` каждые 2 секунды
5. Когда статус становится `COMPLETED`:
   - Сохраняет данные пользователя в localStorage
   - Вызывает `/auth/me/` для получения полного профиля
   - Редиректит на `/dashboard`

### 6. Тесты (`backend/core/tests/test_whatsapp_auth.py`)

Покрыты сценарии:
- ✅ Создание попытки входа
- ✅ Проверка статуса новой попытки
- ✅ Истекшая попытка → `ATTEMPT_EXPIRED`
- ✅ Вход арендатора → `role='tenant'`
- ✅ Вход арендодателя → `role='landlord'`
- ✅ Вход инвестора → `role='investor'`
- ✅ Неизвестный номер → `USER_NOT_FOUND`
- ✅ Дубликат номера → `PHONE_NOT_UNIQUE`
- ✅ Статус COMPLETED с данными пользователя

## Результат

### ACCEPTANCE CRITERIA

✅ Истекший attemptId → `FAILED ATTEMPT_EXPIRED`
✅ Дубликат телефона → `FAILED PHONE_NOT_UNIQUE`
✅ Неизвестный номер → `FAILED USER_NOT_FOUND`
✅ Вход по номеру инвестора → `role INVESTOR`
✅ Вход по номеру арендатора → `role TENANT`
✅ Вход по номеру арендодателя → `role LANDLORD`
✅ Вход по номеру администратора → `role ADMIN` (только если номер действительно админа)
✅ `/me` после входа возвращает правильный phone/role/counterpartyId
✅ Если вхожу с WhatsApp +996557903999, система НЕ может выдать токен админа +996700750606

## Безопасность

- ❌ Убраны все fallback на админа
- ❌ Убраны конструкции типа "if (!user) user = firstUser"
- ❌ Убраны "return adminUser" при ошибке
- ✅ Строгая привязка attemptId → sender phone → user
- ✅ Роль определяется из БД (tenant.type), а не из WhatsApp
- ✅ Логирование без токенов и секретов

## Миграция

Для применения изменений нужно:
1. Создать миграцию: `python manage.py makemigrations core`
2. Применить миграцию: `python manage.py migrate`
3. Настроить webhook в Green API на `/api/webhooks/greenapi/incoming/`
4. Обновить фронтенд (уже сделано)
