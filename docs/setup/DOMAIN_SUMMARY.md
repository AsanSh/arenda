# 📋 Резюме: Подключение домена assetmanagement.team

## ✅ Что сделано

1. ✅ Создана конфигурация Nginx (`infra/nginx.conf`)
   - Редирект HTTP → HTTPS
   - Проксирование API запросов на backend
   - Обслуживание статических файлов фронтенда
   - Настройка для webhook Green API

2. ✅ Обновлены настройки Django (`backend/amt/settings.py`)
   - `ALLOWED_HOSTS` включает `assetmanagement.team`
   - `CORS_ALLOWED_ORIGINS` включает `https://assetmanagement.team`
   - `DEBUG` по умолчанию выключен для продакшена

3. ✅ Обновлены настройки фронтенда (`admin-frontend/src/api/client.ts`)
   - Автоматическое определение API URL по домену
   - Поддержка продакшена и разработки

4. ✅ Созданы инструкции:
   - `START_HERE_DOMAIN.md` - быстрый старт
   - `DNS_SETUP_SPACESHIP.md` - настройка DNS
   - `DOMAIN_SETUP.md` - полная инструкция
   - `DOMAIN_SETUP_STEPS.md` - пошаговая инструкция
   - `DOMAIN_QUICK_SETUP.md` - чеклист

5. ✅ Создан скрипт деплоя (`infra/deploy.sh`)

## 🎯 Что нужно сделать

### 1. Настроить DNS в Spaceship.com (5 минут)
- Добавить A запись: `@` → `5.101.67.195`
- Добавить A запись: `www` → `5.101.67.195`
- Подождать распространения DNS (5-15 минут)

### 2. Установить и настроить Nginx (10 минут)
```bash
sudo apt install nginx -y
sudo cp /root/arenda/infra/nginx.conf /etc/nginx/sites-available/assetmanagement.team
sudo ln -s /etc/nginx/sites-available/assetmanagement.team /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3. Получить SSL сертификат (5 минут)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d assetmanagement.team -d www.assetmanagement.team
```

### 4. Собрать и разместить фронтенд (5 минут)
```bash
cd /root/arenda/admin-frontend
npm run build
sudo mkdir -p /var/www/assetmanagement.team
sudo cp -r build/* /var/www/assetmanagement.team/
sudo chown -R www-data:www-data /var/www/assetmanagement.team
```

### 5. Настроить Webhook в Green API (3 минуты)
- URL: `https://assetmanagement.team/api/webhooks/greenapi/incoming/`

## 📁 Структура файлов

```
/root/arenda/
├── infra/
│   ├── nginx.conf              # Конфигурация Nginx
│   ├── deploy.sh               # Скрипт автоматического деплоя
│   └── .env.example            # Пример переменных окружения
├── backend/
│   └── amt/
│       └── settings.py          # Обновлены ALLOWED_HOSTS и CORS
├── admin-frontend/
│   └── src/
│       └── api/
│           └── client.ts        # Автоматическое определение API URL
└── Документация:
    ├── START_HERE_DOMAIN.md    # ⭐ НАЧНИТЕ ЗДЕСЬ
    ├── DNS_SETUP_SPACESHIP.md  # Настройка DNS
    ├── DOMAIN_SETUP.md         # Полная инструкция
    └── DOMAIN_SETUP_STEPS.md   # Пошаговая инструкция
```

## 🔗 Ссылки

- **Домен:** https://assetmanagement.team
- **API:** https://assetmanagement.team/api/
- **Webhook:** https://assetmanagement.team/api/webhooks/greenapi/incoming/
- **Spaceship.com:** https://spaceship.com/

## ⚠️ Важные моменты

1. **DNS распространяется не мгновенно** - подождите 5-60 минут
2. **SSL сертификат требует настроенных DNS** - сначала DNS, потом SSL
3. **Firewall** - убедитесь, что порты 80 и 443 открыты
4. **Backend должен быть запущен** - проверьте `docker-compose ps`

## 🚀 После настройки

Используйте скрипт для автоматического деплоя:
```bash
cd /root/arenda/infra
sudo ./deploy.sh
```
