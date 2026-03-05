# Настройка WhatsApp-логина через Green API

Вход по OTP (одноразовый код в WhatsApp) работает через [Green API](https://green-api.com/).

## 1. Создание инстанса в Green API

1. Зарегистрируйтесь на [console.green-api.com](https://console.green-api.com).
2. Создайте инстанс и привяжите WhatsApp (сканируйте QR).
3. В настройках инстанса возьмите:
   - **apiUrl** (например `https://7103.api.greenapi.com`)
   - **idInstance** (например `7103495361`)
   - **apiTokenInstance** (токен, храните в секрете)

Статус инстанса должен быть **Authorized**.

## 2. Настройка бэкенда

Задайте переменные окружения (Docker / systemd / .env):

```bash
GREEN_API_BASE_URL=https://7103.api.greenapi.com
GREEN_API_ID_INSTANCE=7103495361
GREEN_API_API_TOKEN=ваш_apiTokenInstance
```

Если переменные не заданы, используются значения по умолчанию из `amt/settings.py` (для разработки).

## 3. Webhook (для входящих сообщений, опционально)

Если используется вход по QR (отправка сообщения «AMT LOGIN attemptId» в чат):

- В личном кабинете Green API укажите URL webhook:  
  `https://ваш-домен/api/webhooks/greenapi/incoming/`
- Бэкенд должен быть доступен по HTTPS с этого домена.

## 4. Отправка OTP

При запросе кода (`POST /api/auth/whatsapp/request-code/`) бэкенд отправляет сообщение в WhatsApp через Green API:

- Метод: `sendMessage`
- Номер получателя в формате `996XXXXXXXXX@c.us`
- Текст: «Ваш код для входа в систему AMT: XXXXXX»

Проверьте, что инстанс авторизован и токен верный — иначе отправка не сработает.
