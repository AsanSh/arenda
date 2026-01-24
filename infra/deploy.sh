#!/bin/bash
# Скрипт для деплоя на сервер с доменом assetmanagement.team

set -e

echo "🚀 Начало деплоя AMT на assetmanagement.team"

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Проверка, что скрипт запущен от root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Пожалуйста, запустите скрипт от root: sudo ./deploy.sh${NC}"
    exit 1
fi

# 1. Обновление кода (если используется git)
echo -e "${YELLOW}1. Обновление кода...${NC}"
cd /root/arenda
# git pull origin main  # Раскомментируйте, если используете git

# 2. Запуск backend (если не запущен)
echo -e "${YELLOW}2. Проверка и запуск backend...${NC}"
cd /root/arenda/infra
if ! docker-compose ps | grep -q "backend.*Up"; then
    echo -e "${BLUE}   Запуск backend...${NC}"
    docker-compose up -d db
    sleep 5
    docker-compose up -d backend
    sleep 5
fi

# 3. Применение миграций
echo -e "${YELLOW}3. Применение миграций...${NC}"
cd /root/arenda/infra
docker-compose exec -T backend python manage.py migrate --noinput

# 4. Сборка статических файлов Django
echo -e "${YELLOW}4. Сборка статических файлов Django...${NC}"
cd /root/arenda/infra
docker-compose exec -T backend python manage.py collectstatic --noinput

# 5. Сборка фронтенда
echo -e "${YELLOW}5. Сборка фронтенда...${NC}"
cd /root/arenda/admin-frontend
npm install
npm run build

# Проверка, что сборка прошла успешно
if [ ! -d "build" ]; then
    echo -e "${RED}Ошибка: папка build не создана!${NC}"
    exit 1
fi

if [ ! -f "build/index.html" ]; then
    echo -e "${RED}Ошибка: index.html не найден в build!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Сборка завершена успешно${NC}"

# 6. Копирование фронтенда в nginx директорию
echo -e "${YELLOW}6. Копирование фронтенда...${NC}"
sudo mkdir -p /var/www/assetmanagement.team
sudo rm -rf /var/www/assetmanagement.team/*
sudo cp -r build/* /var/www/assetmanagement.team/
sudo chown -R www-data:www-data /var/www/assetmanagement.team
sudo chmod -R 755 /var/www/assetmanagement.team

# Проверка структуры файлов
if [ ! -d "/var/www/assetmanagement.team/static" ]; then
    echo -e "${RED}Ошибка: папка static не скопирована!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Файлы скопированы в /var/www/assetmanagement.team${NC}"
echo -e "${GREEN}  Структура: $(ls -la /var/www/assetmanagement.team/ | head -5)${NC}"

# 6. Перезагрузка nginx
echo -e "${YELLOW}6. Перезагрузка nginx...${NC}"
sudo nginx -t && sudo systemctl reload nginx

# 8. Перезапуск backend (если нужно)
echo -e "${YELLOW}8. Перезапуск backend...${NC}"
cd /root/arenda/infra
docker-compose restart backend

echo -e "${GREEN}✅ Деплой завершен успешно!${NC}"
echo -e "${GREEN}Сайт доступен по адресу: https://assetmanagement.team${NC}"
