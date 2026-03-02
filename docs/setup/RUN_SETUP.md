# 🚀 Автоматическая установка - выполните одну команду

## ⚡ Быстрый старт

Выполните на сервере одну команду:

```bash
ssh root@5.8.10.197
cd /root/arenda
sudo ./FULL_SETUP.sh
```

Скрипт автоматически выполнит:
1. ✅ Установку всех зависимостей (Node.js, Docker, Nginx)
2. ✅ Запуск backend через Docker
3. ✅ Применение миграций Django
4. ✅ Сборку фронтенда
5. ✅ Размещение файлов в Nginx
6. ✅ Настройку Nginx конфигурации
7. ✅ Проверку работы всех компонентов

## ⏱️ Время выполнения

Примерно 5-10 минут (в зависимости от скорости интернета для загрузки зависимостей)

## 📋 Что нужно сделать вручную

После выполнения скрипта:

### 1. Настройте DNS в Spaceship.com (5 минут)

1. Войдите в https://spaceship.com/
2. Найдите домен `assetmanagement.team`
3. Измените DNS записи:
   - `@` (A) → `5.8.10.197`
   - `www` (A) → `5.8.10.197`
4. Подождите 5-30 минут для распространения DNS

### 2. Получите SSL сертификат (после настройки DNS)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d assetmanagement.team -d www.assetmanagement.team
```

### 3. Настройте Webhook в Green API

1. Откройте https://console.green-api.com/
2. Найдите instance `7107486710`
3. Укажите webhook URL: `https://assetmanagement.team/api/webhooks/greenapi/incoming/`

## ✅ Проверка работы

После выполнения всех шагов:

```bash
# Проверьте статус всех компонентов
cd /root/arenda
./CHECK_STATUS.sh

# Или проверьте вручную
curl http://127.0.0.1:8000/api/
curl https://assetmanagement.team/
```

## 🔄 Для будущих обновлений

Используйте скрипт деплоя:

```bash
cd /root/arenda/infra
sudo ./deploy.sh
```

## 🆘 Если что-то пошло не так

1. Проверьте логи:
   ```bash
   cd /root/arenda/infra
   docker-compose logs backend
   sudo tail -f /var/log/nginx/assetmanagement_error.log
   ```

2. Запустите проверку статуса:
   ```bash
   cd /root/arenda
   ./CHECK_STATUS.sh
   ```

3. Перезапустите компоненты:
   ```bash
   cd /root/arenda/infra
   docker-compose restart
   sudo systemctl restart nginx
   ```
