#!/bin/bash
# Восстановление контрагентов, недвижимости и сотрудников из фикстуры
# после удаления данных.
#
# Запуск (из корня репозитория):
#   ./scripts/restore_tenants_properties.sh
# или через Docker:
#   cd infra && docker compose run --rm backend python manage.py restore_tenants_properties

set -e
cd "$(dirname "$0")/.."

if command -v docker >/dev/null 2>&1 && [ -f infra/docker-compose.yml ]; then
  echo "Запуск восстановления через Docker..."
  cd infra && docker compose run --rm backend python manage.py restore_tenants_properties
  echo ""
  echo "При необходимости создайте контрагента-администратора:"
  echo "  cd infra && docker compose run --rm backend python manage.py create_admin_tenant"
else
  echo "Запуск восстановления локально (нужен venv с Django)..."
  cd backend && python manage.py restore_tenants_properties
  echo ""
  echo "При необходимости: python manage.py create_admin_tenant"
fi
