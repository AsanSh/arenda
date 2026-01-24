#!/bin/bash
# Скрипт для исправления всех проблем: синтаксическая ошибка + ERR_EMPTY_RESPONSE

set -e

echo "🔧 Исправление всех проблем"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Проверка root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Запустите от root: sudo ./FIX_ALL_ISSUES.sh${NC}"
    exit 1
fi

# 1. Запуск backend
echo -e "${YELLOW}1️⃣  Проверка и запуск Backend...${NC}"
cd /root/arenda/infra

if ! docker-compose ps | grep -q "backend.*Up"; then
    echo -e "${BLUE}   Запуск backend...${NC}"
    docker-compose up -d db
    sleep 5
    docker-compose up -d backend
    sleep 5
fi

if docker-compose ps | grep -q "backend.*Up"; then
    echo -e "${GREEN}   ✓ Backend запущен${NC}"
else
    echo -e "${RED}   ✗ Ошибка запуска backend${NC}"
    docker-compose logs backend | tail -20
    exit 1
fi

# Проверка доступности
if curl -s http://127.0.0.1:8000/api/ > /dev/null 2>&1; then
    echo -e "${GREEN}   ✓ Backend отвечает${NC}"
else
    echo -e "${YELLOW}   ⚠ Backend еще запускается...${NC}"
    sleep 5
fi

echo ""

# 2. Пересборка фронтенда
echo -e "${YELLOW}2️⃣  Пересборка фронтенда...${NC}"
cd /root/arenda/admin-frontend

# Удаление старой сборки
rm -rf build

# Сборка
echo -e "${BLUE}   Сборка production версии...${NC}"
npm run build

# Проверка
if [ ! -d "build" ] || [ ! -f "build/index.html" ]; then
    echo -e "${RED}   ✗ Ошибка сборки${NC}"
    exit 1
fi

if [ ! -d "build/static" ]; then
    echo -e "${RED}   ✗ Папка static не создана${NC}"
    exit 1
fi

echo -e "${GREEN}   ✓ Фронтенд собран${NC}"
echo ""

# 3. Размещение файлов
echo -e "${YELLOW}3️⃣  Размещение файлов...${NC}"
mkdir -p /var/www/assetmanagement.team
rm -rf /var/www/assetmanagement.team/*
cp -r build/* /var/www/assetmanagement.team/
chown -R www-data:www-data /var/www/assetmanagement.team
chmod -R 755 /var/www/assetmanagement.team

if [ -f "/var/www/assetmanagement.team/index.html" ] && [ -d "/var/www/assetmanagement.team/static" ]; then
    JS_COUNT=$(find /var/www/assetmanagement.team/static/js -name "*.js" 2>/dev/null | wc -l)
    echo -e "${GREEN}   ✓ Файлы размещены (JS файлов: $JS_COUNT)${NC}"
else
    echo -e "${RED}   ✗ Ошибка размещения файлов${NC}"
    exit 1
fi
echo ""

# 4. Обновление nginx
echo -e "${YELLOW}4️⃣  Обновление Nginx...${NC}"
if [ -f "/root/arenda/infra/nginx.conf" ]; then
    cp /root/arenda/infra/nginx.conf /etc/nginx/sites-available/assetmanagement.team
    ln -sf /etc/nginx/sites-available/assetmanagement.team /etc/nginx/sites-enabled/assetmanagement.team
    
    if nginx -t > /dev/null 2>&1; then
        systemctl reload nginx
        echo -e "${GREEN}   ✓ Nginx обновлен${NC}"
    else
        echo -e "${RED}   ✗ Ошибка в конфигурации Nginx${NC}"
        nginx -t
        exit 1
    fi
else
    echo -e "${RED}   ✗ Файл nginx.conf не найден${NC}"
    exit 1
fi
echo ""

# 5. Проверка работы
echo -e "${YELLOW}5️⃣  Проверка работы...${NC}"

# Backend
if curl -s http://127.0.0.1:8000/api/ > /dev/null 2>&1; then
    echo -e "${GREEN}   ✓ Backend отвечает${NC}"
else
    echo -e "${YELLOW}   ⚠ Backend не отвечает (возможно, еще запускается)${NC}"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}   ✓ Nginx работает${NC}"
else
    echo -e "${RED}   ✗ Nginx не работает${NC}"
fi

# Файлы
if [ -f "/var/www/assetmanagement.team/index.html" ]; then
    echo -e "${GREEN}   ✓ Файлы фронтенда на месте${NC}"
else
    echo -e "${RED}   ✗ Файлы фронтенда не найдены${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Все исправлено!${NC}"
echo ""
echo -e "${BLUE}📝 Следующие шаги:${NC}"
echo "1. Очистите кэш браузера (Ctrl+Shift+Delete)"
echo "2. Откройте https://assetmanagement.team"
echo "3. Нажмите Ctrl+F5 для полной перезагрузки"
echo ""
