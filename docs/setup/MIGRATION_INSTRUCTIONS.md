# Инструкция по применению миграций и настройке

## ⚠️ ВАЖНО: Сначала примените миграцию!

Без миграции таблица `login_attempts` не будет создана, и система не сможет работать.

## Шаг 1: Применить миграцию

```bash
cd backend
python manage.py migrate core
```

Вы должны увидеть:
```
Running migrations:
  Applying core.0005_loginattempt... OK
```

## Шаг 2: Запустить backend сервер

```bash
cd backend
python manage.py runserver
```

Убедитесь, что сервер запущен и доступен на `http://localhost:8000`

## Шаг 3: Настроить Webhook в Green API

### Для локальной разработки (с ngrok):

1. Установите ngrok: https://ngrok.com/
2. Запустите туннель:
   ```bash
   ngrok http 8000
   ```
3. Скопируйте HTTPS URL (например: `https://abc123.ngrok.io`)
4. В личном кабинете Green API (https://console.green-api.com/):
   - Найдите instance ID: `7107486710`
   - В настройках webhook укажите: `https://ваш-ngrok-url.ngrok.io/api/webhooks/greenapi/incoming/`
   - Включите "Входящие уведомления"

### Для продакшена:

1. В настройках webhook укажите: `https://ваш-домен.com/api/webhooks/greenapi/incoming/`
2. Убедитесь, что домен доступен из интернета

## Шаг 4: Проверить работу

1. Откройте фронтенд: `http://localhost:3000/login`
2. Должен появиться QR-код
3. Отсканируйте QR-код в WhatsApp
4. Отправьте предзаполненное сообщение
5. Система автоматически определит ваш номер и роль

## Проверка в логах backend

После отправки сообщения в WhatsApp, в логах backend должны появиться:
```
INFO: Webhook processing: attemptId=..., senderPhone=9965***, normalizedPhone=+996***
INFO: Login verified: attemptId=..., userId=..., role=tenant, phone=+996***
INFO: Login completed: attemptId=..., userId=..., role=tenant
```

## Если ошибка "ERR_CONNECTION_REFUSED"

Это означает, что backend не запущен или недоступен:

1. ✅ Убедитесь, что backend запущен: `python manage.py runserver`
2. ✅ Проверьте, что порт 8000 свободен
3. ✅ Проверьте URL в `admin-frontend/src/api/client.ts` - должен быть `http://localhost:8000/api`

## Если ошибка "Table 'login_attempts' doesn't exist"

Это означает, что миграция не применена:

1. ✅ Примените миграцию: `python manage.py migrate core`
2. ✅ Проверьте, что файл `backend/core/migrations/0005_loginattempt.py` существует

## Если ошибка "Login attempt not found"

1. ✅ Убедитесь, что миграция применена
2. ✅ Проверьте, что таблица `login_attempts` создана в БД
3. ✅ Проверьте логи backend - должны появляться записи при создании попытки

## Если webhook не работает

1. ✅ Убедитесь, что webhook URL доступен из интернета (используйте ngrok для локальной разработки)
2. ✅ Проверьте логи backend - должны появляться записи при получении сообщений
3. ✅ Убедитесь, что в Green API включены "Входящие уведомления"
4. ✅ Проверьте формат сообщения - должно быть: "AMT LOGIN <attemptId>"
