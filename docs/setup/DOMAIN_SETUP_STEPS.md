# Пошаговая инструкция: Подключение домена assetmanagement.team

## 🎯 Цель
Подключить домен `assetmanagement.team` (купленный у Spaceship.com) к серверу `5.8.10.197`

---

## ШАГ 1: Настройка DNS в Spaceship.com (5 минут)

1. **Войдите в личный кабинет Spaceship.com**
   - Откройте https://spaceship.com/
   - Войдите в аккаунт

2. **Найдите домен assetmanagement.team**
   - Перейдите в раздел "Domains" или "Мои домены"
   - Выберите домен `assetmanagement.team`

3. **Настройте DNS записи**
   - Найдите раздел "DNS Management" или "Управление DNS"
   - Добавьте/измените следующие записи:

   **A запись для основного домена:**
   ```
   Тип: A
   Имя: @ (или оставьте пустым)
   Значение: 5.8.10.197
   TTL: 3600
   ```

   **A запись для www:**
   ```
   Тип: A
   Имя: www
   Значение: 5.8.10.197
   TTL: 3600
   ```

4. **Сохраните изменения**

5. **Проверьте DNS (подождите 5-15 минут):**
   ```bash
   dig assetmanagement.team +short
   # Должен вернуть: 5.8.10.197
   ```

---

## ШАГ 2: Установка Nginx на сервере (10 минут)

```bash
# Подключитесь к серверу по SSH
ssh root@5.8.10.197

# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка nginx
sudo apt install nginx -y

# Запуск и автозапуск nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Проверка статуса
sudo systemctl status nginx
```

---

## ШАГ 3: Копирование конфигурации Nginx (2 минуты)

```bash
# Копирование конфигурации
sudo cp /root/arenda/infra/nginx.conf /etc/nginx/sites-available/assetmanagement.team

# Создание символической ссылки
sudo ln -s /etc/nginx/sites-available/assetmanagement.team /etc/nginx/sites-enabled/

# Удаление дефолтной конфигурации (опционально)
sudo rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации
sudo nginx -t

# Если проверка прошла успешно, перезагрузите nginx
sudo systemctl reload nginx
```

---

## ШАГ 4: Получение SSL сертификата (5 минут)

**Важно:** DNS записи должны уже распространиться перед этим шагом!

```bash
# Установка certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение SSL сертификата
sudo certbot --nginx -d assetmanagement.team -d www.assetmanagement.team

# Certbot спросит:
# - Email для уведомлений (укажите ваш email)
# - Согласие с условиями (Y)
# - Подписку на новости (по желанию)

# Certbot автоматически:
# ✅ Проверит DNS записи
# ✅ Получит SSL сертификат
# ✅ Настроит nginx
# ✅ Настроит автообновление сертификата
```

---

## ШАГ 5: Открытие портов в Firewall (2 минуты)

```bash
# Проверка статуса firewall
sudo ufw status

# Открытие портов (если firewall активен)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH (если еще не открыт)

# Применение изменений
sudo ufw reload
```

---

## ШАГ 6: Обновление настроек Django (1 минута)

Настройки уже обновлены в `backend/amt/settings.py`:
- ✅ `ALLOWED_HOSTS` включает `assetmanagement.team`
- ✅ `CORS_ALLOWED_ORIGINS` включает `https://assetmanagement.team`

Перезапустите backend:
```bash
cd /root/arenda/infra
docker-compose restart backend
```

---

## ШАГ 7: Сборка и размещение фронтенда (5 минут)

```bash
cd /root/arenda/admin-frontend

# Установка зависимостей (если нужно)
npm install

# Сборка production версии
npm run build

# Создание директории для сайта
sudo mkdir -p /var/www/assetmanagement.team

# Копирование собранных файлов
sudo cp -r build/* /var/www/assetmanagement.team/

# Установка правильных прав
sudo chown -R www-data:www-data /var/www/assetmanagement.team
sudo chmod -R 755 /var/www/assetmanagement.team
```

---

## ШАГ 8: Настройка Webhook в Green API (3 минуты)

1. Откройте https://console.green-api.com/
2. Войдите в аккаунт
3. Найдите instance с ID: `7107486710`
4. Перейдите в настройки instance
5. Найдите раздел "Webhook" или "Входящие уведомления"
6. Укажите Webhook URL:
   ```
   https://assetmanagement.team/api/webhooks/greenapi/incoming/
   ```
7. Включите "Входящие уведомления" (Incoming notifications)
8. Сохраните изменения

---

## ШАГ 9: Проверка работы (2 минуты)

1. **Откройте в браузере:**
   - https://assetmanagement.team
   - https://www.assetmanagement.team

2. **Проверьте API:**
   - https://assetmanagement.team/api/auth/me/
   - Должен вернуть JSON (или редирект на логин)

3. **Проверьте вход через WhatsApp:**
   - Откройте https://assetmanagement.team/login
   - Должен появиться QR-код
   - Отсканируйте и отправьте сообщение

---

## ✅ Готово!

После выполнения всех шагов:
- ✅ Домен `assetmanagement.team` работает
- ✅ SSL сертификат установлен (HTTPS)
- ✅ Фронтенд доступен по домену
- ✅ API работает через домен
- ✅ Webhook настроен для WhatsApp

---

## 🔧 Автоматический деплой

Для будущих обновлений используйте скрипт:

```bash
cd /root/arenda/infra
sudo ./deploy.sh
```

Скрипт автоматически:
- Применит миграции
- Соберет статические файлы Django
- Соберет фронтенд
- Скопирует файлы в nginx директорию
- Перезагрузит сервисы

---

## 🆘 Troubleshooting

### DNS не распространился
```bash
# Проверка через разные DNS серверы
dig @8.8.8.8 assetmanagement.team +short
dig @1.1.1.1 assetmanagement.team +short
```

### SSL сертификат не выдается
- Убедитесь, что DNS записи настроены и распространились
- Проверьте, что порты 80 и 443 открыты
- Проверьте, что nginx запущен

### 502 Bad Gateway
```bash
# Проверьте, что backend запущен
docker-compose ps

# Проверьте логи
docker-compose logs backend
```

### CORS ошибки
- Проверьте настройки `CORS_ALLOWED_ORIGINS` в `settings.py`
- Убедитесь, что фронтенд использует правильный `API_URL`

---

## 📞 Поддержка

Если возникли проблемы:
1. Проверьте логи nginx: `sudo tail -f /var/log/nginx/assetmanagement_error.log`
2. Проверьте логи backend: `docker-compose logs -f backend`
3. Проверьте DNS: `dig assetmanagement.team +short`
