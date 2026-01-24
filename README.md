# AMT - Система управления арендой недвижимости

Система для управления договорами аренды, начислениями, платежами и контрагентами.

## Структура проекта

```
/root/arenda/
├── backend/              # Django REST Framework backend
├── admin-frontend/       # React/TypeScript frontend
├── infra/                # Docker, Nginx конфигурации
├── backups/              # Резервные копии проекта
├── docs/                 # Документация
│   ├── setup/           # Инструкции по настройке
│   ├── fixes/           # История исправлений
│   ├── refactoring/     # Документация рефакторинга
│   └── restore-points/  # Точки восстановления
└── scripts/              # Вспомогательные скрипты
    ├── setup/           # Скрипты настройки
    └── fixes/           # Скрипты исправлений
```

## Быстрый старт

1. **Настройка окружения:**
   ```bash
   cd infra
   cp .env.example .env
   # Отредактируйте .env файл
   ```

2. **Запуск проекта:**
   ```bash
   docker compose up -d
   ```

3. **Применение миграций:**
   ```bash
   docker compose exec backend python manage.py migrate
   ```

4. **Сборка frontend:**
   ```bash
   cd admin-frontend
   npm install
   npm run build
   ```

## Документация

- **Настройка:** См. `docs/setup/`
- **Исправления:** См. `docs/fixes/fixes-log.md`
- **Точки восстановления:** См. `docs/restore-points/`

## Основные функции

- Управление контрагентами (арендаторы, арендодатели, инвесторы)
- Управление договорами аренды
- Начисления и платежи
- Депозиты и возвраты
- Отчеты и аналитика
- WhatsApp OTP авторизация
- Ролевой доступ (RBAC)

## Технологии

- **Backend:** Django 4.2, Django REST Framework, PostgreSQL
- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Infrastructure:** Docker, Docker Compose, Nginx

## Авторизация

- **Администраторы:** Полный доступ ко всем функциям
- **Арендаторы:** Просмотр своих договоров, начислений и платежей
- **Арендодатели/Инвесторы:** Просмотр своих объектов и отчетов

## Контакты

Домен: https://assetmanagement.team
