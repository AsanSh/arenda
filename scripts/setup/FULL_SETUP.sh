#!/bin/bash
# Полный скрипт установки и настройки домена assetmanagement.team
# Выполняет все необходимые действия автоматически

set -e

echo "🚀 Полная установка и настройка AMT на assetmanagement.team"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Проверка, что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Пожалуйста, запустите скрипт от root: sudo ./FULL_SETUP.sh${NC}"
    exit 1
fi

# Переменные
PROJECT_DIR="/root/arenda"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/admin-frontend"
INFRA_DIR="$PROJECT_DIR/infra"
NGINX_DIR="/var/www/assetmanagement.team"
DOMAIN="assetmanagement.team"

echo -e "${BLUE}📋 План установки:${NC}"
echo "  1. Установка зависимостей системы"
echo "  2. Запуск backend (Docker)"
echo "  3. Применение миграций"
echo "  4. Сборка фронтенда"
echo "  5. Размещение фронтенда"
echo "  6. Настройка Nginx"
echo "  7. Проверка работы"
echo ""

# Шаг 1: Установка системных зависимостей
echo -e "${YELLOW}1️⃣  Установка системных зависимостей...${NC}"
apt-get update -qq
apt-get install -y curl wget git > /dev/null 2>&1 || true

# Проверка Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}   Установка Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
    apt-get install -y nodejs > /dev/null 2>&1
fi

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}   Установка Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh > /dev/null 2>&1
    sh get-docker.sh > /dev/null 2>&1
    rm get-docker.sh
fi

# Проверка Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}   Установка Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Проверка Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}   Установка Nginx...${NC}"
    apt-get install -y nginx > /dev/null 2>&1
    systemctl enable nginx
fi

echo -e "${GREEN}   ✓ Зависимости установлены${NC}"
echo ""

# Шаг 2: Запуск backend через Docker
echo -e "${YELLOW}2️⃣  Запуск Backend (Docker)...${NC}"
cd "$INFRA_DIR"

# Остановка существующих контейнеров (если есть)
docker-compose down > /dev/null 2>&1 || true

# Запуск базы данных и backend
docker-compose up -d db
echo -e "${BLUE}   Ожидание готовности базы данных...${NC}"
sleep 10

docker-compose up -d backend
echo -e "${BLUE}   Ожидание запуска backend...${NC}"
sleep 5

# Проверка статуса
if docker-compose ps | grep -q "backend.*Up"; then
    echo -e "${GREEN}   ✓ Backend запущен${NC}"
else
    echo -e "${RED}   ✗ Ошибка запуска backend${NC}"
    docker-compose logs backend | tail -20
    exit 1
fi
echo ""

# Шаг 3: Применение миграций
echo -e "${YELLOW}3️⃣  Применение миграций Django...${NC}"
cd "$BACKEND_DIR"

# Ждем, пока база данных будет готова
for i in {1..30}; do
    if docker-compose -f "$INFRA_DIR/docker-compose.yml" exec -T backend python manage.py migrate --check > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

docker-compose -f "$INFRA_DIR/docker-compose.yml" exec -T backend python manage.py migrate --noinput
echo -e "${GREEN}   ✓ Миграции применены${NC}"
echo ""

# Шаг 4: Сборка фронтенда
echo -e "${YELLOW}4️⃣  Сборка фронтенда...${NC}"
cd "$FRONTEND_DIR"

# Установка зависимостей
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}   Установка npm зависимостей...${NC}"
    npm install --silent
fi

# Удаление старой сборки
rm -rf build

# Сборка
echo -e "${BLUE}   Сборка production версии...${NC}"
npm run build

# Проверка результата
if [ ! -d "build" ] || [ ! -f "build/index.html" ]; then
    echo -e "${RED}   ✗ Ошибка сборки фронтенда${NC}"
    exit 1
fi

if [ ! -d "build/static" ]; then
    echo -e "${RED}   ✗ Папка static не создана${NC}"
    exit 1
fi

echo -e "${GREEN}   ✓ Фронтенд собран${NC}"
echo ""

# Шаг 5: Размещение фронтенда
echo -e "${YELLOW}5️⃣  Размещение фронтенда в Nginx...${NC}"

# Создание директории
mkdir -p "$NGINX_DIR"

# Копирование файлов
echo -e "${BLUE}   Копирование файлов...${NC}"
rm -rf "$NGINX_DIR"/*
cp -r build/* "$NGINX_DIR"/

# Установка прав
chown -R www-data:www-data "$NGINX_DIR"
chmod -R 755 "$NGINX_DIR"

# Проверка
if [ -f "$NGINX_DIR/index.html" ] && [ -d "$NGINX_DIR/static" ]; then
    JS_COUNT=$(find "$NGINX_DIR/static/js" -name "*.js" 2>/dev/null | wc -l)
    echo -e "${GREEN}   ✓ Файлы размещены (JS файлов: $JS_COUNT)${NC}"
else
    echo -e "${RED}   ✗ Ошибка размещения файлов${NC}"
    exit 1
fi
echo ""

# Шаг 6: Настройка Nginx
echo -e "${YELLOW}6️⃣  Настройка Nginx...${NC}"

# Копирование конфигурации
if [ -f "$INFRA_DIR/nginx.conf" ]; then
    cp "$INFRA_DIR/nginx.conf" /etc/nginx/sites-available/$DOMAIN
    
    # Создание символической ссылки
    ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/$DOMAIN
    
    # Удаление дефолтной конфигурации
    rm -f /etc/nginx/sites-enabled/default
    
    # Проверка конфигурации
    if nginx -t > /dev/null 2>&1; then
        systemctl reload nginx
        echo -e "${GREEN}   ✓ Nginx настроен и перезагружен${NC}"
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

# Шаг 7: Проверка работы
echo -e "${YELLOW}7️⃣  Проверка работы...${NC}"

# Проверка backend
if curl -s http://127.0.0.1:8000/api/ > /dev/null 2>&1; then
    echo -e "${GREEN}   ✓ Backend отвечает на порту 8000${NC}"
else
    echo -e "${YELLOW}   ⚠ Backend не отвечает (возможно, еще запускается)${NC}"
fi

# Проверка nginx
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}   ✓ Nginx работает${NC}"
else
    echo -e "${RED}   ✗ Nginx не работает${NC}"
fi

# Проверка файлов
if [ -f "$NGINX_DIR/index.html" ]; then
    echo -e "${GREEN}   ✓ Файлы фронтенда на месте${NC}"
else
    echo -e "${RED}   ✗ Файлы фронтенда не найдены${NC}"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Установка завершена!${NC}"
echo ""
echo -e "${BLUE}📝 Следующие шаги:${NC}"
echo ""
echo "1. Настройте DNS в Spaceship.com:"
echo "   - A запись @ → 5.101.67.195"
echo "   - A запись www → 5.101.67.195"
echo ""
echo "2. После настройки DNS (5-30 минут), получите SSL сертификат:"
echo "   sudo apt install certbot python3-certbot-nginx -y"
echo "   sudo certbot --nginx -d assetmanagement.team -d www.assetmanagement.team"
echo ""
echo "3. Настройте Webhook в Green API:"
echo "   https://assetmanagement.team/api/webhooks/greenapi/incoming/"
echo ""
echo -e "${GREEN}🌐 Сайт будет доступен по адресу: https://assetmanagement.team${NC}"
echo ""
echo -e "${YELLOW}💡 Для проверки статуса используйте:${NC}"
echo "   cd $PROJECT_DIR && ./CHECK_STATUS.sh"
echo ""
