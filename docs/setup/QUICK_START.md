# Быстрый старт - WhatsApp авторизация

## Шаг 1: Применить миграцию

```bash
cd backend
python manage.py migrate core
```

Это создаст таблицу `login_attempts` в базе данных.

## Шаг 2: Запустить backend

```bash
cd backend
python manage.py runserver
```

Убедитесь, что сервер запущен на порту 8000 (или другом, если настроено).

## Шаг 3: Настроить Webhook в Green API

1. Откройте https://console.green-api.com/
2. Найдите instance с ID: `7107486710`
3. В настройках webhook укажите URL:
   - **Для продакшена**: `https://ваш-домен.com/api/webhooks/greenapi/incoming/`
   - **Для локальной разработки**: используйте ngrok (см. ниже)

### Настройка ngrok (для локальной разработки):

```bash
# Установите ngrok, затем:
ngrok http 8000

# Скопируйте полученный HTTPS URL (например: https://abc123.ngrok.io)
# Добавьте к нему путь: /api/webhooks/greenapi/incoming/
# Вставьте в настройки webhook в Green API
```

## Шаг 4: Проверить работу

1. Откройте фронтенд: `http://localhost:3000/login` (или ваш URL)
2. Должен появиться QR-код с текстом "AMT LOGIN <attemptId>"
3. Отсканируйте QR-код в WhatsApp
4. Отправьте предзаполненное сообщение
5. Система должна автоматически определить ваш номер и роль

## Проверка в консоли браузера

Откройте DevTools (F12) и проверьте:
- Нет ошибок `ERR_CONNECTION_REFUSED` - это означает, что backend не запущен
- Запросы к `/api/auth/whatsapp/start/` возвращают 201 статус
- Запросы к `/api/auth/whatsapp/status/` возвращают статус попытки

## Если ошибка "ERR_CONNECTION_REFUSED"

1. Убедитесь, что backend запущен: `python manage.py runserver`
2. Проверьте, что порт 8000 свободен
3. Проверьте URL в `admin-frontend/src/api/client.ts` - должен быть `http://localhost:8000/api`

## Если ошибка "Login attempt not found"

1. Убедитесь, что миграция применена: `python manage.py migrate core`
2. Проверьте, что таблица `login_attempts` создана в БД

## Если webhook не работает

1. Убедитесь, что webhook URL доступен из интернета (используйте ngrok для локальной разработки)
2. Проверьте логи backend - должны появляться записи при получении сообщений
3. Убедитесь, что в Green API включены "Входящие уведомления"
