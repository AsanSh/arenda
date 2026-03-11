#!/bin/bash
# AMT Production Deploy Script
# Путь: /root/arenda/infra/deploy.sh
# Запуск: sudo /root/arenda/infra/deploy.sh или amt-deploy

set -euo pipefail

# --- Конфигурация ---
PROJECT_ROOT="/root/arenda"
FRONTEND_DIR="${PROJECT_ROOT}/admin-frontend"
BACKEND_DIR="${PROJECT_ROOT}/backend"
INFRA_DIR="${PROJECT_ROOT}/infra"
COMPOSE_FILE="${INFRA_DIR}/docker-compose.yml"
NGINX_WWW="/var/www/assetmanagement.team"
LOG_DIR="${PROJECT_ROOT}/logs"
LOG_FILE="${LOG_DIR}/deploy.log"
DEPLOY_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Цвета
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo -e "$msg" | tee -a "$LOG_FILE"
}

log_err() {
  local msg="[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*"
  echo -e "${RED}${msg}${NC}" | tee -a "$LOG_FILE" >&2
}

# --- Инициализация ---
mkdir -p "$LOG_DIR"
{
  echo "=========================================="
  echo "AMT DEPLOY START: $DEPLOY_TIMESTAMP"
  echo "=========================================="
} >> "$LOG_FILE"

# Проверка root
if [ "$EUID" -ne 0 ]; then
  log_err "Запустите скрипт от root: sudo $0"
  exit 1
fi

# Проверка docker compose
if docker compose version &>/dev/null; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE_CMD="docker-compose"
else
  log_err "docker compose или docker-compose не найден"
  exit 1
fi

log "Используется: $COMPOSE_CMD"
log "Compose file: $COMPOSE_FILE"

# --- 1. Обновление кода ---
log "${YELLOW}1. Обновление кода (git pull)...${NC}"
cd "$PROJECT_ROOT"
if [ -d .git ]; then
  PREV_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  if git pull origin main 2>&1 | tee -a "$LOG_FILE"; then
    GIT_HASH=$(git rev-parse --short HEAD)
    log "Git: $PREV_HASH -> $GIT_HASH"
  else
    log "Предупреждение: git pull завершился с ошибкой (возможно, локальные изменения)"
    GIT_HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  fi
else
  GIT_HASH="no-git"
  log "Git не инициализирован, продолжаем без pull"
fi

# --- 2. Backend: Docker build & up ---
log "${YELLOW}2. Backend: сборка и запуск контейнеров...${NC}"
cd "$INFRA_DIR"
$COMPOSE_CMD -f "$COMPOSE_FILE" up -d --build db 2>&1 | tee -a "$LOG_FILE"
sleep 5
$COMPOSE_CMD -f "$COMPOSE_FILE" up -d --build backend 2>&1 | tee -a "$LOG_FILE"
sleep 3

# --- 3. Миграции ---
log "${YELLOW}3. Применение миграций...${NC}"
$COMPOSE_CMD -f "$COMPOSE_FILE" exec -T backend python manage.py migrate --noinput 2>&1 | tee -a "$LOG_FILE" || {
  log_err "Миграции завершились с ошибкой"
  exit 1
}

# --- 4. Django collectstatic ---
log "${YELLOW}4. Django collectstatic...${NC}"
$COMPOSE_CMD -f "$COMPOSE_FILE" exec -T backend python manage.py collectstatic --noinput 2>&1 | tee -a "$LOG_FILE" || true

# --- 5. Frontend: npm ci + build ---
log "${YELLOW}5. Frontend: npm ci + build...${NC}"
# Загрузка .env для REACT_APP_FEATURE_* (feature flags)
if [ -f "$INFRA_DIR/.env" ]; then
  set -a
  source "$INFRA_DIR/.env"
  set +a
  log "Loaded env from $INFRA_DIR/.env"
fi
cd "$FRONTEND_DIR"
if command -v npm &>/dev/null; then
  if [ -f package-lock.json ]; then
    npm ci --legacy-peer-deps 2>&1 | tee -a "$LOG_FILE"
  else
    npm install --legacy-peer-deps 2>&1 | tee -a "$LOG_FILE"
  fi
  npm run build 2>&1 | tee -a "$LOG_FILE"
else
  log "npm не найден на хосте, используем Docker (node:18-alpine)..."
  docker run --rm -v "$FRONTEND_DIR:/app" -w /app node:18-alpine sh -c "
    npm ci --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps
    npm run build
  " 2>&1 | tee -a "$LOG_FILE"
fi

if [ ! -d "build" ] || [ ! -f "build/index.html" ]; then
  log_err "Frontend build не создан (build/ или build/index.html отсутствует)"
  exit 1
fi

BUILD_JS_COUNT=$(find build/static/js -name "*.js" 2>/dev/null | wc -l)
log "Build готов: index.html + $BUILD_JS_COUNT JS файл(ов)"

# --- 6. Безопасное копирование frontend ---
log "${YELLOW}6. Копирование frontend в $NGINX_WWW...${NC}"
mkdir -p "$NGINX_WWW"

# Используем rsync для чистого деплоя: добавляем новое, удаляем старое (отжившие hashed файлы)
if command -v rsync &>/dev/null; then
  rsync -av --delete --exclude='.gitkeep' "$FRONTEND_DIR/build/" "$NGINX_WWW/" 2>&1 | tee -a "$LOG_FILE"
else
  # Fallback: rm + cp
  rm -rf "$NGINX_WWW"/*
  cp -r "$FRONTEND_DIR/build/"* "$NGINX_WWW/"
fi

chown -R www-data:www-data "$NGINX_WWW"
chmod -R 755 "$NGINX_WWW"

if [ ! -d "$NGINX_WWW/static" ]; then
  log_err "Папка static не скопирована в $NGINX_WWW"
  exit 1
fi

log "Файлы скопированы в $NGINX_WWW"

# --- 7. Nginx ---
log "${YELLOW}7. Nginx: проверка и reload...${NC}"
if ! nginx -t 2>&1 | tee -a "$LOG_FILE"; then
  log_err "Ошибка конфигурации nginx"
  exit 1
fi
systemctl reload nginx 2>&1 | tee -a "$LOG_FILE"
log "Nginx перезагружен"

# --- 8. Проверка после деплоя ---
log "${YELLOW}8. Проверка после деплоя...${NC}"
FAILED=0

if [ ! -f "$NGINX_WWW/index.html" ]; then
  log_err "index.html отсутствует в $NGINX_WWW"
  FAILED=1
fi

PROD_JS_COUNT=$(find "$NGINX_WWW/static/js" -name "*.js" 2>/dev/null | wc -l)
if [ "$PROD_JS_COUNT" -lt 1 ]; then
  log_err "Нет JS файлов в $NGINX_WWW/static/js"
  FAILED=1
fi

# Проверка backend (любой ответ = работает)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 http://127.0.0.1:8000/api/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "000" ]; then
  log "Предупреждение: backend на :8000 не отвечает"
fi

# Проверка контейнеров
if ! docker ps --format '{{.Names}}' | grep -q 'infra-backend'; then
  log_err "Контейнер backend не запущен"
  FAILED=1
fi

if [ "$FAILED" -eq 1 ]; then
  log_err "Проверки не прошли"
  exit 1
fi

# --- 9. Итоговый статус ---
log ""
log "${GREEN}=========================================="
log "✅ Деплой завершён успешно"
log "==========================================${NC}"
log "Дата:       $DEPLOY_TIMESTAMP"
log "Git hash:   $GIT_HASH"
log "Frontend:   $NGINX_WWW (static: $PROD_JS_COUNT js)"
log ""
log "Контейнеры:"
docker ps --format '  {{.Names}}: {{.Status}}' | grep -E 'infra-(backend|db)' 2>/dev/null | tee -a "$LOG_FILE" || true
log ""
log "Сайт: https://assetmanagement.team"
log "=========================================="
echo ""
