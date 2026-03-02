# Исправление ошибки 404 для статических файлов

## 🔴 Проблема

При открытии `https://assetmanagement.team` возникают ошибки:
- `GET https://assetmanagement.team/static/js/vendors.b2fefa3... 404 (Not Found)`
- `GET https://assetmanagement.team/static/js/main.c09acc58.js 404 (Not Found)`

Это означает, что статические файлы фронтенда не размещены или неправильно настроены.

## ✅ Решение

### Шаг 1: Соберите фронтенд на сервере

```bash
# Подключитесь к серверу
ssh root@5.8.10.197

# Перейдите в директорию фронтенда
cd /root/arenda/admin-frontend

# Установите зависимости (если еще не установлены)
npm install

# Соберите production версию
npm run build
```

После сборки должна появиться папка `build/` с содержимым:
```
build/
├── index.html
├── static/
│   ├── css/
│   │   └── main.[hash].css
│   └── js/
│       ├── main.[hash].js
│       └── vendors.[hash].js
└── ...
```

### Шаг 2: Разместите файлы в nginx директории

```bash
# Создайте директорию (если еще не создана)
sudo mkdir -p /var/www/assetmanagement.team

# Удалите старые файлы (если есть)
sudo rm -rf /var/www/assetmanagement.team/*

# Скопируйте все файлы из build
sudo cp -r /root/arenda/admin-frontend/build/* /var/www/assetmanagement.team/

# Установите правильные права
sudo chown -R www-data:www-data /var/www/assetmanagement.team
sudo chmod -R 755 /var/www/assetmanagement.team

# Проверьте структуру
ls -la /var/www/assetmanagement.team/
# Должны быть: index.html, static/, и другие файлы
```

### Шаг 3: Обновите конфигурацию Nginx

```bash
# Скопируйте обновленную конфигурацию
sudo cp /root/arenda/infra/nginx.conf /etc/nginx/sites-available/assetmanagement.team

# Проверьте конфигурацию
sudo nginx -t

# Если проверка прошла успешно, перезагрузите nginx
sudo systemctl reload nginx
```

### Шаг 4: Проверьте работу

1. Откройте в браузере: `https://assetmanagement.team`
2. Откройте DevTools (F12) → вкладка Network
3. Обновите страницу (Ctrl+F5 для полной перезагрузки)
4. Проверьте, что файлы `/static/js/` и `/static/css/` загружаются с кодом 200

### Шаг 5: Проверьте логи (если все еще не работает)

```bash
# Логи ошибок nginx
sudo tail -f /var/log/nginx/assetmanagement_error.log

# Логи доступа
sudo tail -f /var/log/nginx/assetmanagement_access.log
```

## 🔍 Диагностика

### Проверка структуры файлов

```bash
# Проверьте, что файлы на месте
ls -la /var/www/assetmanagement.team/static/js/
# Должны быть файлы: main.*.js, vendors.*.js

# Проверьте права доступа
ls -la /var/www/assetmanagement.team/
# Владелец должен быть www-data
```

### Проверка конфигурации nginx

```bash
# Проверьте синтаксис
sudo nginx -t

# Проверьте, что конфигурация активна
ls -la /etc/nginx/sites-enabled/ | grep assetmanagement

# Проверьте, что nginx запущен
sudo systemctl status nginx
```

### Тест доступа к файлам

```bash
# Попробуйте открыть файл напрямую
curl -I https://assetmanagement.team/static/js/main.*.js
# Или найдите точное имя файла:
ls /var/www/assetmanagement.team/static/js/
curl -I https://assetmanagement.team/static/js/[точное-имя-файла].js
```

## 🚀 Автоматический скрипт

Используйте скрипт деплоя:

```bash
cd /root/arenda/infra
sudo ./deploy.sh
```

Скрипт автоматически:
1. Соберет фронтенд
2. Скопирует файлы в `/var/www/assetmanagement.team`
3. Установит правильные права
4. Перезагрузит nginx

## ⚠️ Частые ошибки

### Ошибка 1: Файлы не скопированы
**Симптом:** 404 для всех статических файлов
**Решение:** Выполните шаги 1-2 выше

### Ошибка 2: Неправильные права доступа
**Симптом:** 403 Forbidden
**Решение:** 
```bash
sudo chown -R www-data:www-data /var/www/assetmanagement.team
sudo chmod -R 755 /var/www/assetmanagement.team
```

### Ошибка 3: Nginx не перезагружен
**Симптом:** Старая конфигурация все еще работает
**Решение:**
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Ошибка 4: Файлы в неправильной директории
**Симптом:** index.html открывается, но статика не загружается
**Решение:** Убедитесь, что структура такая:
```
/var/www/assetmanagement.team/
├── index.html
└── static/
    ├── css/
    └── js/
```

## 📝 После исправления

После успешного исправления:
1. ✅ Сайт должен открываться без ошибок
2. ✅ Все JS и CSS файлы должны загружаться
3. ✅ Приложение должно работать полностью
