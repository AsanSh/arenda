#!/bin/bash
# Быстрое исправление ERR_EMPTY_RESPONSE

set -e

echo "🔧 Быстрое исправление ERR_EMPTY_RESPONSE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Запустите от root: sudo ./QUICK_FIX_EMPTY_RESPONSE.sh${NC}"
    exit 1
fi

# 1. Проверка и запуск backend
echo -e "${YELLOW}1. Проверка Backend...${NC}"
cd /root/arenda/infra

# Проверка, запущен ли backend
if ! docker compose ps 2>/dev/null | grep -q "backend.*Up"; then
    echo -e "${BLUE}   Запуск backend...${NC}"
    docker compose up -d db
    sleep 8
    docker compose up -d backend
    sleep 10
else
    echo -e "${BLUE}   Перезапуск backend...${NC}"
    docker compose restart backend
    sleep 5
fi

# Проверка доступности
echo -e "${BLUE}   Проверка доступности backend...${NC}"
for i in {1..10}; do
    if curl -s http://127.0.0.1:8000/api/ > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ Backend отвечает на порту 8000${NC}"
        break
    fi
    if [ $i -eq 10 ]; then
        echo -e "${RED}   ✗ Backend не отвечает${NC}"
        echo -e "${YELLOW}   Логи backend:${NC}"
        docker compose logs backend | tail -30
        exit 1
    fi
    sleep 2
done

echo ""

# 2. Проверка nginx
echo -e "${YELLOW}2. Проверка Nginx...${NC}"
if ! systemctl is-active --quiet nginx; then
    echo -e "${BLUE}   Запуск nginx...${NC}"
    systemctl start nginx
    systemctl enable nginx
fi

# Проверка конфигурации
# Используем конфигурацию без SSL, если SSL сертификат еще не настроен
if [ -f "/etc/letsencrypt/live/assetmanagement.team/fullchain.pem" ]; then
    echo -e "${BLUE}   SSL сертификат найден, используем HTTPS конфигурацию${NC}"
    NGINX_CONF="/root/arenda/infra/nginx.conf"
else
    echo -e "${YELLOW}   SSL сертификат не найден, используем HTTP конфигурацию${NC}"
    NGINX_CONF="/root/arenda/infra/nginx.conf.no-ssl"
fi

if [ -f "$NGINX_CONF" ]; then
    cp "$NGINX_CONF" /etc/nginx/sites-available/assetmanagement.team
    ln -sf /etc/nginx/sites-available/assetmanagement.team /etc/nginx/sites-enabled/assetmanagement.team
    rm -f /etc/nginx/sites-enabled/default
else
    echo -e "${RED}   ✗ Файл конфигурации не найден: $NGINX_CONF${NC}"
    exit 1
fi

# Проверка синтаксиса
if nginx -t > /dev/null 2>&1; then
    systemctl reload nginx
    echo -e "${GREEN}   ✓ Nginx настроен и перезагружен${NC}"
else
    echo -e "${RED}   ✗ Ошибка в конфигурации Nginx${NC}"
    nginx -t
    exit 1
fi

echo ""

# 3. Проверка файлов фронтенда
echo -e "${YELLOW}3. Проверка файлов фронтенда...${NC}"
if [ ! -d "/var/www/assetmanagement.team" ] || [ ! -f "/var/www/assetmanagement.team/index.html" ]; then
    echo -e "${BLUE}   Файлы не найдены, собираем фронтенд...${NC}"
    cd /root/arenda/admin-frontend
    
    if [ ! -d "node_modules" ]; then
        npm install --silent
    fi
    
    rm -rf build
    npm run build
    
    mkdir -p /var/www/assetmanagement.team
    rm -rf /var/www/assetmanagement.team/*
    cp -r build/* /var/www/assetmanagement.team/
    chown -R www-data:www-data /var/www/assetmanagement.team
    chmod -R 755 /var/www/assetmanagement.team
    
    echo -e "${GREEN}   ✓ Фронтенд собран и размещен${NC}"
else
    echo -e "${GREEN}   ✓ Файлы фронтенда на месте${NC}"
fi

echo ""

# 4. Финальная проверка
echo -e "${YELLOW}4. Финальная проверка...${NC}"

# Backend
if curl -s http://127.0.0.1:8000/api/ > /dev/null 2>&1; then
    echo -e "${GREEN}   ✓ Backend: OK${NC}"
else
    echo -e "${RED}   ✗ Backend: НЕ ОТВЕЧАЕТ${NC}"
fi

# Nginx
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}   ✓ Nginx: OK${NC}"
else
    echo -e "${RED}   ✗ Nginx: НЕ РАБОТАЕТ${NC}"
fi

# Файлы
if [ -f "/var/www/assetmanagement.team/index.html" ]; then
    echo -e "${GREEN}   ✓ Файлы: OK${NC}"
else
    echo -e "${RED}   ✗ Файлы: НЕ НАЙДЕНЫ${NC}"
fi

# Проверка портов
if netstat -tlnp 2>/dev/null | grep -q ":8000.*LISTEN" || ss -tlnp 2>/dev/null | grep -q ":8000"; then
    echo -e "${GREEN}   ✓ Порт 8000: ОТКРЫТ${NC}"
else
    echo -e "${RED}   ✗ Порт 8000: НЕ ОТКРЫТ${NC}"
fi

if netstat -tlnp 2>/dev/null | grep -q ":443.*LISTEN" || ss -tlnp 2>/dev/null | grep -q ":443"; then
    echo -e "${GREEN}   ✓ Порт 443: ОТКРЫТ${NC}"
else
    echo -e "${YELLOW}   ⚠ Порт 443: НЕ ОТКРЫТ (SSL еще не настроен)${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Исправление завершено!${NC}"
echo ""
echo -e "${BLUE}📝 Проверьте:${NC}"
echo "1. Откройте: https://assetmanagement.team"
echo "2. Очистите кэш браузера (Ctrl+Shift+Delete)"
echo "3. Нажмите Ctrl+F5 для полной перезагрузки"
echo ""
echo -e "${YELLOW}💡 Если проблема осталась:${NC}"
echo "   - Проверьте логи: sudo tail -f /var/log/nginx/assetmanagement_error.log"
echo "   - Проверьте backend: cd /root/arenda/infra && docker compose logs backend"
echo ""
