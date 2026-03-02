# 🔧 Полное исправление: 404 и ERR_CONNECTION_REFUSED

## 🔴 Проблемы

1. **404 для `main.c09acc58.js`** - основной JS файл не найден
2. **ERR_CONNECTION_REFUSED для изображения** - backend не запущен или недоступен

## ✅ Решение (выполните по порядку)

### Шаг 1: Проверьте и запустите backend

```bash
# Подключитесь к серверу
ssh root@5.8.10.197

# Проверьте, запущен ли backend
cd /root/arenda/infra
docker-compose ps

# Если backend не запущен, запустите его
docker-compose up -d backend

# Проверьте логи
docker-compose logs backend
```

**Или если используете systemd:**
```bash
# Проверьте статус
sudo systemctl status amt-backend

# Если не запущен, запустите
sudo systemctl start amt-backend
sudo systemctl enable amt-backend
```

**Или запустите вручную:**
```bash
cd /root/arenda/backend
python3 manage.py runserver 0.0.0.0:8000
# Оставьте этот процесс запущенным (Ctrl+C для остановки)
```

### Шаг 2: Пересоберите и разместите фронтенд

```bash
# Перейдите в директорию фронтенда
cd /root/arenda/admin-frontend

# Удалите старую сборку (если есть)
rm -rf build

# Пересоберите фронтенд
npm install
npm run build

# Проверьте, что файлы созданы
ls -la build/static/js/
# Должны быть файлы: main.*.js, vendors.*.js

# Скопируйте ВСЕ файлы в nginx директорию
sudo mkdir -p /var/www/assetmanagement.team
sudo rm -rf /var/www/assetmanagement.team/*
sudo cp -r build/* /var/www/assetmanagement.team/

# Установите правильные права
sudo chown -R www-data:www-data /var/www/assetmanagement.team
sudo chmod -R 755 /var/www/assetmanagement.team

# Проверьте структуру
ls -la /var/www/assetmanagement.team/static/js/
# Должны быть файлы с актуальными именами (hash может отличаться)
```

### Шаг 3: Обновите конфигурацию nginx

```bash
# Скопируйте обновленную конфигурацию
sudo cp /root/arenda/infra/nginx.conf /etc/nginx/sites-available/assetmanagement.team

# Проверьте синтаксис
sudo nginx -t

# Если все ОК, перезагрузите nginx
sudo systemctl reload nginx
```

### Шаг 4: Проверьте работу

```bash
# Проверьте, что backend отвечает
curl http://127.0.0.1:8000/api/auth/me/
# Должен вернуть JSON или редирект

# Проверьте, что статические файлы доступны
ls /var/www/assetmanagement.team/static/js/
curl -I https://assetmanagement.team/static/js/main.*.js
# Замените * на реальное имя файла из ls
```

### Шаг 5: Очистите кэш браузера

1. Откройте `https://assetmanagement.team`
2. Нажмите **Ctrl+Shift+Delete** (очистка кэша)
3. Или **Ctrl+F5** (жесткая перезагрузка)
4. Или откройте в режиме инкогнито

## 🚀 Автоматический скрипт (рекомендуется)

```bash
cd /root/arenda/infra
sudo ./deploy.sh
```

Скрипт автоматически:
1. Применит миграции
2. Соберет фронтенд
3. Скопирует файлы
4. Перезагрузит nginx
5. Перезапустит backend

## 🔍 Диагностика

### Проверка backend

```bash
# Проверьте, что порт 8000 слушается
sudo netstat -tlnp | grep 8000
# или
sudo ss -tlnp | grep 8000

# Проверьте доступность backend
curl http://127.0.0.1:8000/api/
curl http://127.0.0.1:8000/api/auth/me/
```

### Проверка фронтенда

```bash
# Проверьте структуру файлов
ls -la /var/www/assetmanagement.team/
ls -la /var/www/assetmanagement.team/static/js/

# Проверьте права доступа
ls -la /var/www/assetmanagement.team/static/js/ | head -5

# Проверьте доступность через nginx
curl -I https://assetmanagement.team/
curl -I https://assetmanagement.team/static/js/main.*.js
```

### Проверка логов

```bash
# Логи nginx ошибок
sudo tail -f /var/log/nginx/assetmanagement_error.log

# Логи nginx доступа
sudo tail -f /var/log/nginx/assetmanagement_access.log

# Логи backend (docker)
docker-compose logs -f backend

# Логи backend (systemd)
sudo journalctl -u amt-backend -f
```

## ⚠️ Частые проблемы

### Проблема 1: Backend не запущен
**Симптом:** ERR_CONNECTION_REFUSED
**Решение:** Запустите backend (см. Шаг 1)

### Проблема 2: Файлы не обновились
**Симптом:** 404 для файлов с новым hash
**Решение:** 
- Удалите старую сборку: `rm -rf build`
- Пересоберите: `npm run build`
- Скопируйте заново

### Проблема 3: Кэш браузера
**Симптом:** Старые файлы загружаются
**Решение:** Очистите кэш (Ctrl+Shift+Delete) или используйте инкогнито

### Проблема 4: Неправильные права доступа
**Симптом:** 403 Forbidden
**Решение:**
```bash
sudo chown -R www-data:www-data /var/www/assetmanagement.team
sudo chmod -R 755 /var/www/assetmanagement.team
```

## 📝 Чеклист

- [ ] Backend запущен и доступен на порту 8000
- [ ] Фронтенд пересобран (`npm run build`)
- [ ] Файлы скопированы в `/var/www/assetmanagement.team`
- [ ] Права установлены (www-data:www-data, 755)
- [ ] Nginx конфигурация обновлена и перезагружена
- [ ] Кэш браузера очищен
- [ ] Все файлы загружаются с кодом 200

## ✅ После исправления

1. Откройте `https://assetmanagement.team`
2. Откройте DevTools (F12) → Network
3. Обновите страницу (Ctrl+F5)
4. Все файлы должны загружаться с кодом 200
5. Приложение должно работать полностью
