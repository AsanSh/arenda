# 🔧 Исправление ERR_CERT_COMMON_NAME_INVALID

## 🔴 Проблема

Ошибка `ERR_CERT_COMMON_NAME_INVALID` возникает потому что:
- Фронтенд пытается обратиться к API через HTTPS (`https://assetmanagement.team/api/...`)
- Но SSL сертификат еще не настроен или не соответствует домену

## ✅ Решение

### Вариант 1: Использовать HTTP (временно, пока SSL не настроен)

Я уже обновил код в `admin-frontend/src/api/client.ts` - теперь он автоматически определяет протокол (HTTP/HTTPS) в зависимости от того, как открыт сайт.

**Если открываете через HTTP:**
- Сайт будет использовать HTTP для API запросов
- Ошибка SSL исчезнет

**Откройте:** `http://assetmanagement.team` (не https)

### Вариант 2: Настроить SSL сертификат (правильное решение)

```bash
# 1. Убедитесь, что DNS настроен и распространился
dig assetmanagement.team +short
# Должен вернуть: 5.8.10.197

# 2. Установите certbot
sudo apt install certbot python3-certbot-nginx -y

# 3. Получите SSL сертификат
sudo certbot --nginx -d assetmanagement.team -d www.assetmanagement.team

# 4. Certbot автоматически обновит конфигурацию nginx
# 5. Перезагрузите nginx
sudo systemctl reload nginx
```

После настройки SSL:
- Откройте `https://assetmanagement.team`
- Все будет работать через HTTPS

## 🔍 Проверка

```bash
# Проверка SSL сертификата
curl -I https://assetmanagement.team 2>&1 | head -5

# Если сертификат настроен, вернется HTTP 200 или 301
# Если не настроен, вернется ошибка SSL
```

## 📝 Что я исправил

Обновил `admin-frontend/src/api/client.ts`:
- Теперь автоматически определяет протокол (HTTP/HTTPS)
- Если сайт открыт через HTTP - использует HTTP для API
- Если сайт открыт через HTTPS - использует HTTPS для API

## ⚠️ Важно

После настройки SSL сертификата:
1. Откройте сайт через HTTPS: `https://assetmanagement.team`
2. Все API запросы будут идти через HTTPS
3. Ошибка SSL исчезнет
