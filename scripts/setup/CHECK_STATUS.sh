#!/bin/bash
# Скрипт для проверки статуса всех компонентов

echo "🔍 Проверка статуса AMT на assetmanagement.team"
echo ""

# Цвета
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Проверка backend
echo -e "${YELLOW}1. Проверка Backend...${NC}"
if docker-compose -f /root/arenda/infra/docker-compose.yml ps backend 2>/dev/null | grep -q "Up"; then
    echo -e "${GREEN}✓ Backend запущен (Docker)${NC}"
elif systemctl is-active --quiet amt-backend.service 2>/dev/null; then
    echo -e "${GREEN}✓ Backend запущен (systemd)${NC}"
elif pgrep -f "manage.py runserver" > /dev/null; then
    echo -e "${GREEN}✓ Backend запущен (вручную)${NC}"
else
    echo -e "${RED}✗ Backend НЕ запущен${NC}"
    echo "   Запустите: cd /root/arenda/infra && docker-compose up -d backend"
fi

# Проверка доступности backend
if curl -s http://127.0.0.1:8000/api/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend отвечает на порту 8000${NC}"
else
    echo -e "${RED}✗ Backend НЕ отвечает на порту 8000${NC}"
fi

echo ""

# 2. Проверка nginx
echo -e "${YELLOW}2. Проверка Nginx...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx запущен${NC}"
else
    echo -e "${RED}✗ Nginx НЕ запущен${NC}"
    echo "   Запустите: sudo systemctl start nginx"
fi

# Проверка конфигурации
if sudo nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓ Конфигурация nginx корректна${NC}"
else
    echo -e "${RED}✗ Ошибка в конфигурации nginx${NC}"
    sudo nginx -t
fi

echo ""

# 3. Проверка фронтенда
echo -e "${YELLOW}3. Проверка Фронтенда...${NC}"
if [ -d "/var/www/assetmanagement.team" ]; then
    echo -e "${GREEN}✓ Директория фронтенда существует${NC}"
    
    if [ -f "/var/www/assetmanagement.team/index.html" ]; then
        echo -e "${GREEN}✓ index.html найден${NC}"
    else
        echo -e "${RED}✗ index.html НЕ найден${NC}"
    fi
    
    if [ -d "/var/www/assetmanagement.team/static" ]; then
        echo -e "${GREEN}✓ Папка static существует${NC}"
        JS_COUNT=$(find /var/www/assetmanagement.team/static/js -name "*.js" 2>/dev/null | wc -l)
        if [ "$JS_COUNT" -gt 0 ]; then
            echo -e "${GREEN}✓ Найдено JS файлов: $JS_COUNT${NC}"
        else
            echo -e "${RED}✗ JS файлы НЕ найдены${NC}"
        fi
    else
        echo -e "${RED}✗ Папка static НЕ найдена${NC}"
    fi
    
    # Проверка прав
    OWNER=$(stat -c '%U' /var/www/assetmanagement.team 2>/dev/null)
    if [ "$OWNER" = "www-data" ]; then
        echo -e "${GREEN}✓ Права доступа корректны (www-data)${NC}"
    else
        echo -e "${YELLOW}⚠ Владелец: $OWNER (должен быть www-data)${NC}"
        echo "   Исправьте: sudo chown -R www-data:www-data /var/www/assetmanagement.team"
    fi
else
    echo -e "${RED}✗ Директория фронтенда НЕ существует${NC}"
    echo "   Создайте: sudo mkdir -p /var/www/assetmanagement.team"
fi

echo ""

# 4. Проверка DNS
echo -e "${YELLOW}4. Проверка DNS...${NC}"
DNS_IP=$(dig +short assetmanagement.team 2>/dev/null | tail -1)
if [ "$DNS_IP" = "5.101.67.195" ]; then
    echo -e "${GREEN}✓ DNS настроен правильно: $DNS_IP${NC}"
else
    echo -e "${YELLOW}⚠ DNS указывает на: $DNS_IP (ожидается: 5.101.67.195)${NC}"
fi

echo ""

# 5. Проверка SSL
echo -e "${YELLOW}5. Проверка SSL...${NC}"
if [ -f "/etc/letsencrypt/live/assetmanagement.team/fullchain.pem" ]; then
    echo -e "${GREEN}✓ SSL сертификат установлен${NC}"
    
    # Проверка срока действия
    EXPIRY=$(openssl x509 -enddate -noout -in /etc/letsencrypt/live/assetmanagement.team/fullchain.pem 2>/dev/null | cut -d= -f2)
    if [ -n "$EXPIRY" ]; then
        echo -e "${GREEN}  Сертификат действителен до: $EXPIRY${NC}"
    fi
else
    echo -e "${RED}✗ SSL сертификат НЕ найден${NC}"
    echo "   Установите: sudo certbot --nginx -d assetmanagement.team -d www.assetmanagement.team"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Итоговые рекомендации
echo -e "${YELLOW}Рекомендации:${NC}"
echo ""

if ! curl -s http://127.0.0.1:8000/api/ > /dev/null 2>&1; then
    echo "1. Запустите backend:"
    echo "   cd /root/arenda/infra && docker-compose up -d backend"
    echo ""
fi

if [ ! -d "/var/www/assetmanagement.team/static" ]; then
    echo "2. Соберите и разместите фронтенд:"
    echo "   cd /root/arenda/admin-frontend"
    echo "   npm run build"
    echo "   sudo cp -r build/* /var/www/assetmanagement.team/"
    echo ""
fi

echo "3. Или используйте автоматический деплой:"
echo "   cd /root/arenda/infra && sudo ./deploy.sh"
echo ""
