# ⚡ ВЫПОЛНИТЕ СЕЙЧАС - Одна команда для всего

## 🚀 Автоматическая установка

Я создал скрипт, который выполнит все действия автоматически. 

**Выполните на сервере:**

```bash
ssh root@5.8.10.197
cd /root/arenda
sudo ./FULL_SETUP.sh
```

## 📋 Что скрипт сделает автоматически:

1. ✅ Установит все зависимости (Node.js, Docker, Nginx)
2. ✅ Запустит backend через Docker
3. ✅ Применит миграции Django
4. ✅ Соберет фронтенд (npm install + npm run build)
5. ✅ Разместит файлы в `/var/www/assetmanagement.team`
6. ✅ Настроит Nginx конфигурацию
7. ✅ Перезагрузит все сервисы
8. ✅ Проверит работу всех компонентов

## ⏱️ Время выполнения: 5-10 минут

## 📝 После выполнения скрипта:

### 1. Настройте DNS (5 минут)
- Войдите в Spaceship.com
- Измените A запись `@` → `5.8.10.197`
- Измените A запись `www` → `5.8.10.197`

### 2. Получите SSL (после DNS)
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d assetmanagement.team -d www.assetmanagement.team
```

### 3. Настройте Webhook в Green API
- URL: `https://assetmanagement.team/api/webhooks/greenapi/incoming/`

## ✅ Проверка

После выполнения всех шагов:

```bash
cd /root/arenda
./CHECK_STATUS.sh
```

Или откройте в браузере: `https://assetmanagement.team`

---

**Все скрипты готовы и находятся в `/root/arenda/`**
