# 🚀 НАЧНИТЕ ЗДЕСЬ: Подключение домена assetmanagement.team

## ⚡ Быстрый старт (5 шагов)

### 1️⃣ Настройте DNS в Spaceship.com

1. Войдите в https://spaceship.com/
2. Найдите домен `assetmanagement.team`
3. **Измените существующие DNS записи:**

   **A запись для @ (основной домен):**
   - Найдите запись: `Host: @`, `Type: A`, `Value: 216.24.57.1`
   - Измените `Value` на: `5.101.67.195`
   - Сохраните

   **CNAME запись для www:**
   - Найдите запись: `Host: www`, `Type: CNAME`, `Value: base44.onrender.com`
   - **Удалите** эту CNAME запись
   - **Создайте новую** A запись:
     - Host: `www`
     - Type: `A`
     - Value: `5.101.67.195`
   - Сохраните

   ⚠️ **НЕ удаляйте записи для Brevo** (brevo1._do, brevo2._dc, _dmarc, TXT с brevo-code) - они нужны для email

4. Подождите 5-30 минут для распространения DNS

📋 **Подробная инструкция:** см. `DNS_CHANGES_EXACT.md`

### 2️⃣ Установите Nginx на сервере

```bash
ssh root@5.101.67.195
sudo apt update
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3️⃣ Скопируйте конфигурацию Nginx

```bash
sudo cp /root/arenda/infra/nginx.conf /etc/nginx/sites-available/assetmanagement.team
sudo ln -s /etc/nginx/sites-available/assetmanagement.team /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 4️⃣ Получите SSL сертификат

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d assetmanagement.team -d www.assetmanagement.team
```

### 5️⃣ Соберите и разместите фронтенд

```bash
cd /root/arenda/admin-frontend
npm install
npm run build
sudo mkdir -p /var/www/assetmanagement.team
sudo cp -r build/* /var/www/assetmanagement.team/
sudo chown -R www-data:www-data /var/www/assetmanagement.team
```

## ✅ Готово!

Откройте https://assetmanagement.team в браузере

---

## 📚 Подробные инструкции

- **DNS_SETUP_SPACESHIP.md** - детальная настройка DNS в Spaceship.com
- **DOMAIN_SETUP.md** - полная инструкция по настройке домена
- **DOMAIN_SETUP_STEPS.md** - пошаговая инструкция с временными затратами
- **DOMAIN_QUICK_SETUP.md** - чеклист для быстрой настройки

## 🔧 После настройки домена

1. Обновите webhook в Green API:
   ```
   https://assetmanagement.team/api/webhooks/greenapi/incoming/
   ```

2. Проверьте работу:
   - https://assetmanagement.team
   - https://assetmanagement.team/api/auth/me/

3. Для будущих обновлений используйте:
   ```bash
   cd /root/arenda/infra
   sudo ./deploy.sh
   ```
