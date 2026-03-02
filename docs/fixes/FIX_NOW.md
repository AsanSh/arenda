# 🔧 БЫСТРОЕ ИСПРАВЛЕНИЕ: 404 ошибки для статических файлов

## ⚡ Выполните эти команды на сервере (5 минут)

```bash
# 1. Подключитесь к серверу
ssh root@5.8.10.197

# 2. Соберите фронтенд
cd /root/arenda/admin-frontend
npm install
npm run build

# 3. Скопируйте файлы в nginx директорию
sudo mkdir -p /var/www/assetmanagement.team
sudo rm -rf /var/www/assetmanagement.team/*
sudo cp -r build/* /var/www/assetmanagement.team/
sudo chown -R www-data:www-data /var/www/assetmanagement.team
sudo chmod -R 755 /var/www/assetmanagement.team

# 4. Обновите конфигурацию nginx
sudo cp /root/arenda/infra/nginx.conf /etc/nginx/sites-available/assetmanagement.team
sudo nginx -t
sudo systemctl reload nginx

# 5. Проверьте структуру файлов
ls -la /var/www/assetmanagement.team/static/js/
# Должны быть файлы: main.*.js, vendors.*.js
```

## ✅ После выполнения

1. Откройте в браузере: `https://assetmanagement.team`
2. Нажмите Ctrl+F5 (полная перезагрузка)
3. Проверьте DevTools (F12) → Network → должны быть 200 OK для всех файлов

## 🚀 Или используйте автоматический скрипт

```bash
cd /root/arenda/infra
sudo ./deploy.sh
```

---

**Подробная инструкция:** см. `FIX_STATIC_FILES.md`
