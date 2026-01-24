# ⚙️ Настройки Green API - Что включить

## 🔴 ОБЯЗАТЕЛЬНО включить:

### 1. Webhook URL
В поле **"Webhook Url"** укажите:
```
http://assetmanagement.team/api/webhooks/greenapi/incoming/
```

### 2. Входящие сообщения (КРИТИЧНО!)
Включите переключатель:
✅ **"Receive webhooks on incoming messages and files"**

Это самое важное! Без этого система не будет получать сообщения от пользователей для авторизации.

## 🟡 Рекомендуется включить:

### 3. Статусы отправленных сообщений
✅ **"Receive webhooks on sent messages statuses"**

Полезно для отслеживания доставки сообщений.

### 4. Изменение состояния авторизации
✅ **"Receive webhooks on change of the account authorization state"**

Полезно для мониторинга состояния WhatsApp аккаунта.

## ⚪ Опционально (можно оставить выключенными):

- "Receive webhooks on messages sent from phone" - не нужно для авторизации
- "Receive webhooks on messages sent from API" - не нужно для авторизации
- "Get notifications about deleted messages" - не нужно для авторизации
- "Get notifications about edited messages" - не нужно для авторизации
- "Get notifications about incoming chat blocks" - не нужно для авторизации
- "Get notifications about surveys" - не нужно для авторизации
- "Get notifications about calls" - не нужно для авторизации

## 📋 Итоговый чеклист:

- [ ] Webhook URL указан: `http://assetmanagement.team/api/webhooks/greenapi/incoming/`
- [ ] ✅ Включено: "Receive webhooks on incoming messages and files"
- [ ] (Опционально) ✅ Включено: "Receive webhooks on sent messages statuses"
- [ ] (Опционально) ✅ Включено: "Receive webhooks on change of the account authorization state"
- [ ] Нажмите "Сохранить" или "Save"

## ✅ После настройки

1. Сохраните изменения
2. Откройте `http://assetmanagement.team/login`
3. Отсканируйте QR-код
4. Отправьте сообщение в WhatsApp
5. Вход должен пройти успешно!

## 🔍 Проверка

После включения webhook, при отправке сообщения в WhatsApp с текстом "AMT LOGIN <attemptId>", в логах backend должны появиться записи:

```bash
docker compose logs backend | grep -i webhook
```

Должны быть записи:
- `Webhook received: attemptId=..., senderPhone=...`
- `Login verified: attemptId=..., userId=..., role=...`
- `Login completed: attemptId=..., userId=..., role=...`
