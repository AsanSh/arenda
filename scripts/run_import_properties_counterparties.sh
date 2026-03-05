#!/bin/bash
# Запуск импорта контрагентов и недвижимости на том же сервере, где работает бэкенд.
# Использование:
#   Из корня репозитория: ./scripts/run_import_properties_counterparties.sh
#   На проде (где развёрнут backend): cd /path/to/arenda && docker compose -f infra/docker-compose.yml run --rm backend python manage.py import_properties_counterparties

set -e
cd "$(dirname "$0")/.."
echo "Запуск импорта контрагентов и недвижимости..."
docker compose -f infra/docker-compose.yml run --rm backend python manage.py import_properties_counterparties
echo "Готово."
