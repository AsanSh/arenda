# Конвенции AMT (Asset Management Team)

Подробные правила кодирования и структуры проекта.  
Краткая выжимка — в корне: [AMT_CURSOR_RULES.md](../../AMT_CURSOR_RULES.md).

## Содержание

- **[backend.md](./backend.md)** — Django REST API: структура, services.py, типы, API, тесты
- **[frontend.md](./frontend.md)** — React + TypeScript: типы, API-слой, компоненты, стиль
- **[user-roles.md](./user-roles.md)** — роли, права доступа, **защищённые админы (nimdaSan, Bahi)** — всегда доступны
- **[access-control.md](./access-control.md)** — матрица доступа по разделам и действиям
- **[audit-pages-routes.md](./audit-pages-routes.md)** — аудит страниц и маршрутов фронта, дубликаты, конвенции по роутингу

## Общие принципы

- Код для людей: явные имена, без лишнего усложнения
- Бизнес-логика **не** во views/serializers и **не** в React-компонентах
- Доменные термины строго по глоссарию (Contract, Accrual, Payment, Tenant и т.д.)
- Конвенции живые: при расхождении с кодом — правим код под конвенции или обновляем конвенции явно
