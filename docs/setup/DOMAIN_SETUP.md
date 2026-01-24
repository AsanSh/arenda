# Инструкция по подключению домена assetmanagement.team

## Шаг 1: Настройка DNS записей в Spaceship.com

1. Войдите в личный кабинет Spaceship.com
2. Найдите домен `assetmanagement.team`
3. Перейдите в раздел "DNS Management" или "Управление DNS"
4. Добавьте/измените следующие записи:

### A запись (для основного домена):
```
Тип: A
Имя: @ (или assetmanagement.team)
Значение: 5.101.67.195
TTL: 3600 (или Auto)
```

### A запись (для www поддомена):
```
Тип: A
Имя: www
Значение: 5.101.67.195
TTL: 3600 (или Auto)
```

### CNAME запись (альтернатива для www):
Если Spaceship поддерживает CNAME:
```
Тип: CNAME
Имя: www
Значение: assetmanagement.team
TTL: 3600
```

**Важно:** После изменения DNS записей может потребоваться до 24-48 часов для распространения (обычно 1-2 часа).

## Шаг 2: Установка Nginx на сервере

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка nginx
sudo apt install nginx -y

# Запуск nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Шаг 3: Установка SSL сертификата (Let's Encrypt)

```bash
# Установка certbot
sudo apt install certbot python3-certbot-nginx -y

# Получение SSL сертификата
sudo certbot --nginx -d assetmanagement.team -d www.assetmanagement.team

# Certbot автоматически:
# 1. Проверит DNS записи
# 2. Получит сертификат
# 3. Настроит nginx
# 4. Настроит автообновление сертификата
```

**Важно:** Для работы certbot DNS записи должны уже быть настроены и распространиться.

## Шаг 4: Копирование конфигурации Nginx

```bash
# Скопируйте файл infra/nginx.conf в /etc/nginx/sites-available/
sudo cp /root/arenda/infra/nginx.conf /etc/nginx/sites-available/assetmanagement.team

# Создайте символическую ссылку
sudo ln -s /etc/nginx/sites-available/assetmanagement.team /etc/nginx/sites-enabled/

# Удалите дефолтную конфигурацию (опционально)
sudo rm /etc/nginx/sites-enabled/default

# Проверьте конфигурацию
sudo nginx -t

# Перезагрузите nginx
sudo systemctl reload nginx
```

## Шаг 5: Сборка и размещение фронтенда

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

# Установка прав
sudo chown -R www-data:www-data /var/www/assetmanagement.team
sudo chmod -R 755 /var/www/assetmanagement.team
```

## Шаг 6: Обновление настроек Django

Обновите `backend/amt/settings.py`:

```python
# Разрешенные хосты
ALLOWED_HOSTS = [
    'assetmanagement.team',
    'www.assetmanagement.team',
    '5.101.67.195',  # IP сервера (для прямого доступа)
    'localhost',
    '127.0.0.1',
]

# CORS настройки
CORS_ALLOWED_ORIGINS = [
    "https://assetmanagement.team",
    "https://www.assetmanagement.team",
    "http://localhost:3000",  # Для локальной разработки
]

# Отключить DEBUG в продакшене
DEBUG = os.environ.get('DEBUG', '0') == '1'
```

## Шаг 7: Обновление настроек фронтенда

Обновите `admin-frontend/src/api/client.ts`:

```typescript
const API_URL = process.env.REACT_APP_API_URL || 'https://assetmanagement.team/api';
```

Или создайте `.env` файл в `admin-frontend/`:
```
REACT_APP_API_URL=https://assetmanagement.team/api
```

## Шаг 8: Настройка Webhook в Green API

1. Откройте https://console.green-api.com/
2. Найдите instance ID: `7107486710`
3. В настройках webhook укажите:
   ```
   https://assetmanagement.team/api/webhooks/greenapi/incoming/
   ```
4. Включите "Входящие уведомления"

## Шаг 9: Запуск сервисов

### Вариант 1: Через Docker Compose

```bash
cd /root/arenda/infra
docker-compose up -d
```

### Вариант 2: Через systemd (рекомендуется для продакшена)

Создайте systemd сервисы для backend и frontend (см. ниже).

## Шаг 10: Проверка работы

1. Откройте в браузере: `https://assetmanagement.team`
2. Должен открыться фронтенд
3. Проверьте API: `https://assetmanagement.team/api/auth/me/`
4. Проверьте webhook: отправьте тестовое сообщение в WhatsApp

## Проверка DNS записей

```bash
# Проверка A записи
dig assetmanagement.team +short
# Должен вернуть: 5.101.67.195

# Проверка www
dig www.assetmanagement.team +short
# Должен вернуть: 5.101.67.195

# Проверка с другого сервера
nslookup assetmanagement.team
```

## Автоматическое обновление SSL сертификата

Certbot автоматически настроит cron задачу для обновления сертификата. Проверить можно:

```bash
sudo certbot renew --dry-run
```

## Логи и отладка

```bash
# Логи nginx
sudo tail -f /var/log/nginx/assetmanagement_access.log
sudo tail -f /var/log/nginx/assetmanagement_error.log

# Логи Django
docker-compose logs -f backend
# или
journalctl -u amt-backend -f
```

## Troubleshooting

### DNS не распространился
- Подождите 1-2 часа
- Проверьте через разные DNS серверы: `dig @8.8.8.8 assetmanagement.team`

### SSL сертификат не выдается
- Убедитесь, что DNS записи настроены и распространились
- Проверьте, что порты 80 и 443 открыты в firewall
- Проверьте, что nginx запущен

### 502 Bad Gateway
- Проверьте, что backend запущен: `docker-compose ps`
- Проверьте логи backend: `docker-compose logs backend`
- Проверьте, что backend слушает на порту 8000

### CORS ошибки
- Проверьте настройки CORS_ALLOWED_ORIGINS в settings.py
- Убедитесь, что фронтенд использует правильный API_URL
