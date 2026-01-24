# Инструкция по настройке WhatsApp авторизации

## 1. Применение миграций

```bash
cd backend
python manage.py migrate core
```

Это создаст таблицу `login_attempts` в базе данных.

## 2. Настройка Webhook в Green API

### Шаг 1: Войти в личный кабинет Green API
https://console.green-api.com/

### Шаг 2: Найти ваш instance
- ID Instance: `7107486710`
- API Token: `6633644896594f7db36235195f23579325e7a9498eab4411bd`

### Шаг 3: Настроить Webhook URL
В настройках instance нужно указать:
- **Webhook URL**: `https://ваш-домен.com/api/webhooks/greenapi/incoming/`
  - Или для локальной разработки: `https://ваш-ngrok-туннель.ngrok.io/api/webhooks/greenapi/incoming/`

### Шаг 4: Включить входящие уведомления
Убедитесь, что в настройках instance включены:
- ✅ Входящие уведомления (Incoming notifications)
- ✅ Тип webhook: `HTTP`

## 3. Проверка работы

### Тест создания попытки входа:
```bash
curl -X POST http://localhost:8000/api/auth/whatsapp/start/ \
  -H "Content-Type: application/json"
```

Должен вернуть:
```json
{
  "attemptId": "uuid-здесь",
  "expiresAt": "2026-01-23T17:30:00Z",
  "loginMessage": "AMT LOGIN uuid-здесь",
  "qrPayload": "AMT LOGIN uuid-здесь"
}
```

### Тест проверки статуса:
```bash
curl http://localhost:8000/api/auth/whatsapp/status/?attemptId=ваш-attemptId
```

### Тест webhook (симуляция входящего сообщения):
```bash
curl -X POST http://localhost:8000/api/webhooks/greenapi/incoming/ \
  -H "Content-Type: application/json" \
  -d '{
    "typeWebhook": "incomingMessageReceived",
    "senderData": {
      "sender": "996557903999@c.us"
    },
    "messageData": {
      "textMessageData": {
        "textMessage": "AMT LOGIN ваш-attemptId"
      }
    }
  }'
```

## 4. Важные моменты

1. **Миграция обязательна** - без неё таблица `login_attempts` не будет создана
2. **Webhook должен быть доступен из интернета** - для локальной разработки используйте ngrok
3. **Проверьте, что backend запущен** - ошибка `ERR_CONNECTION_REFUSED` означает, что сервер не запущен
4. **Проверьте CORS настройки** - если фронтенд на другом порту/домене

## 5. Настройка ngrok (для локальной разработки)

```bash
# Установить ngrok
# Затем запустить туннель
ngrok http 8000

# Использовать полученный URL в настройках Green API webhook
# Например: https://abc123.ngrok.io/api/webhooks/greenapi/incoming/
```

## 6. Проверка логов

После настройки webhook, при отправке сообщения в WhatsApp с текстом "AMT LOGIN <attemptId>", в логах backend должны появиться записи:
- `Webhook received: attemptId=..., senderPhone=...`
- `Login verified: attemptId=..., userId=..., role=...`
- `Login completed: attemptId=..., userId=..., role=...`
