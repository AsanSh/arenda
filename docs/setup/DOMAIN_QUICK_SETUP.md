# Быстрая настройка домена assetmanagement.team

## 🎯 Цель
Подключить домен `assetmanagement.team` к серверу с IP `5.101.67.195`

## 📋 Чеклист

### 1. DNS настройки в Spaceship.com ✅
- [ ] Войти в личный кабинет Spaceship.com
- [ ] Найти домен `assetmanagement.team`
- [ ] Добавить A запись: `@` → `5.101.67.195`
- [ ] Добавить A запись: `www` → `5.101.67.195`
- [ ] Подождать распространения DNS (5-60 минут)

### 2. Установка и настройка Nginx ✅
```bash
sudo apt update
sudo apt install nginx -y
sudo cp /root/arenda/infra/nginx.conf /etc/nginx/sites-available/assetmanagement.team
sudo ln -s /etc/nginx/sites-available/assetmanagement.team /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL сертификат (Let's Encrypt) ✅
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d assetmanagement.team -d www.assetmanagement.team
```

### 4. Обновление настроек Django ✅
- [ ] Обновить `ALLOWED_HOSTS` в `backend/amt/settings.py`
- [ ] Обновить `CORS_ALLOWED_ORIGINS` в `backend/amt/settings.py`
- [ ] Установить `DEBUG=0` для продакшена

### 5. Сборка и деплой фронтенда ✅
```bash
cd /root/arenda/admin-frontend
npm install
npm run build
sudo mkdir -p /var/www/assetmanagement.team
sudo cp -r build/* /var/www/assetmanagement.team/
sudo chown -R www-data:www-data /var/www/assetmanagement.team
```

### 6. Настройка Webhook в Green API ✅
- [ ] Открыть https://console.green-api.com/
- [ ] Найти instance `7107486710`
- [ ] Указать webhook URL: `https://assetmanagement.team/api/webhooks/greenapi/incoming/`

### 7. Проверка работы ✅
- [ ] Открыть https://assetmanagement.team в браузере
- [ ] Проверить API: https://assetmanagement.team/api/auth/me/
- [ ] Протестировать вход через WhatsApp QR

## 🔍 Проверка DNS

```bash
# Должен вернуть 5.101.67.195
dig assetmanagement.team +short
dig www.assetmanagement.team +short
```

## 🚨 Важно

1. **DNS распространяется не мгновенно** - подождите 5-60 минут
2. **SSL сертификат требует настроенных DNS** - сначала настройте DNS, потом SSL
3. **Firewall** - убедитесь, что порты 80 и 443 открыты:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

## 📞 Поддержка Spaceship.com

Если возникли проблемы с настройкой DNS в Spaceship:
- Документация: https://spaceship.com/docs
- Поддержка: support@spaceship.com
