#!/bin/bash
# Перенумерация договоров в формат AMT-YYYY-DDMM-XXX и создание начислений для договоров без начислений.
# Запуск из корня репозитория: ./scripts/renumber_contracts_and_accruals.sh
# Опции: --dry-run (только показать план), --no-accruals (только перенумеровать)

set -e
cd "$(dirname "$0")/.."

if command -v docker >/dev/null 2>&1 && [ -f infra/docker-compose.yml ]; then
  cd infra && docker compose run --rm backend python manage.py renumber_contracts_and_accruals "$@"
else
  cd backend && python manage.py renumber_contracts_and_accruals "$@"
fi
