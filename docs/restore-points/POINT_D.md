# POINT D — Рабочая версия с обновлёнными конвенциями

**Дата создания:** 31 января 2026, 22:00 +06  
**Статус:** ✅ Работоспособная, протестированная версия  
**Домен:** https://assetmanagement.team

***

## Что работает

### Frontend (admin-frontend)
- ✅ Логин через логин/пароль
- ✅ Логин через WhatsApp OTP
- ✅ Дашборд с финтех-дизайном
- ✅ Договоры (формат номеров AMT-YYYY-DDMM-XXX)
- ✅ Начисления
- ✅ Платежи
- ✅ Депозиты
- ✅ Объекты недвижимости
- ✅ Контрагенты
- ✅ Счета
- ✅ Отчёты (включая P&L с выпадающим периодом)
- ✅ Настройки (вкладка "Логи изменений")
- ✅ Адаптивный сайдбар (свёрнутый/развёрнутый)
- ✅ Матрица прав доступа по ролям

### Backend (backend)
- ✅ Django 4.2 + DRF
- ✅ PostgreSQL 15
- ✅ Авторизация: логин/пароль + WhatsApp OTP
- ✅ API для всех разделов
- ✅ Аудит (логи изменений)
- ✅ Нумерация договоров AMT-YYYY-DDMM-XXX
- ✅ Management-команда renumber_contracts_and_accruals

### Infrastructure
- ✅ Docker Compose (db, backend, admin-frontend)
- ✅ Nginx на хосте (SSL Let's Encrypt)
- ✅ Деплой: фронт в /var/www/assetmanagement.team
- ✅ Backend на порту 8000 (прокси через Nginx)

***

## Структура проекта

### Фронтенды (1)
| Папка | Назначение | Стек | Порт |
|-------|-----------|------|------|
| admin-frontend/ | Админ-панель AMT | React 18, TypeScript, Tailwind | 3000 |

### Бэкенды (1)
| Папка | Назначение | Стек | Порт |
|-------|-----------|------|------|
| backend/ | API и бизнес-логика | Django 4.2, DRF, PostgreSQL 15 | 8000 |

### Инфраструктура
- `infra/docker-compose.yml` — сервисы db, backend, admin-frontend
- `infra/deploy.sh` — скрипт деплоя фронта
- Nginx на хосте — раздача статики и прокси API

***

## Конвенции (обновлены в POINT D)

### Доменная модель
| Русский | English | Backend | Frontend |
|---------|---------|---------|----------|
| Договор аренды | Contract | Contract | Contract |
| Объект недвижимости | Property | Property | Property |
| Контрагент | Tenant/Counterparty | Tenant | Tenant |
| Начисление | Accrual | Accrual | Accrual |
| Платёж | Payment | Payment | Payment |
| Депозит | Deposit | Deposit | Deposit |
| Счёт | Account | Account | Account |

### Типы пользователей
1. **administrator** — полный доступ
2. **owner** — владелец компании
3. **landlord** — хозяин недвижимости
4. **investor** — инвестор
5. **tenant** — арендатор
6. **employee** — сотрудник
7. **master** — мастер

### Формат номеров договоров
**AMT-YYYY-DDMM-XXX**

- **AMT** — префикс
- **YYYY** — год (2025, 2026)
- **DDMM** — день и месяц (3101 = 31 января)
- **XXX** — порядковый номер за день (001, 002, ...)

Пример: `AMT-2026-3101-001`

### Матрица прав доступа
См. `docs/conventions/access-control.md` для детальной матрицы.

### Дизайн (финтех-стиль)
- Фон: `bg-gray-50`
- Карточки: `bg-white`, `rounded-2xl`, `shadow-sm`
- Акцент (доходы): `text-green-600`
- Риск (расходы): `text-red-600`
- Компактные строки: `py-4` для секций, `py-3` для таблиц
- Размеры шрифтов:
  - Заголовки: `text-base font-semibold`
  - Суммы: `text-lg font-bold`
  - Итоги: `text-2xl font-bold`
  - Таблицы: `text-sm`
  - Заголовки таблиц: `text-xs uppercase`

***

## Файлы и директории

### Backend
```
backend/
├── account/          # Авторизация
├── accounts/         # Счета
├── accruals/         # Начисления
├── amt/              # Основное приложение
├── contracts/        # Договоры
├── core/             # Контрагенты, общая логика
│   ├── permissions.py   # Матрица прав (POINT D)
│   └── decorators.py   # @require_permission (POINT D)
├── dashboard/        # Дашборд
├── deposits/         # Депозиты
├── forecast/         # Прогноз
├── notifications/    # Уведомления
├── payments/         # Платежи
├── properties/       # Объекты
└── reports/          # Отчёты
```

### Frontend
```
admin-frontend/
├── src/
│   ├── api/
│   │   └── client.ts           # Axios клиент
│   ├── components/
│   │   ├── ui/                  # UI компоненты
│   │   ├── Layout.tsx           # Общий layout
│   │   └── PermissionGuard.tsx  # Проверка прав (POINT D)
│   ├── contexts/
│   │   └── UserContext.tsx      # Авторизация
│   ├── pages/
│   │   ├── DashboardPage.tsx
│   │   ├── ContractsPage.tsx
│   │   ├── AccrualsPage.tsx
│   │   ├── PaymentsPage.tsx
│   │   ├── DepositsPage.tsx
│   │   ├── PropertiesPage.tsx
│   │   ├── TenantsPage.tsx
│   │   ├── AccountsPage.tsx
│   │   ├── ReportsPage.tsx
│   │   └── SettingsPage.tsx
│   ├── utils/
│   │   └── permissions.ts      # Матрица прав (POINT D)
│   └── App.tsx
└── package.json
```

### Documentation
```
docs/
├── conventions/
│   ├── README.md           # Общие конвенции (POINT D)
│   ├── access-control.md   # Матрица прав (POINT D)
│   ├── backend.md          # Backend конвенции
│   ├── frontend.md         # Frontend конвенции
│   └── user-roles.md       # Роли пользователей
├── fixes/
│   └── fixes-log.md
├── restore-points/
│   ├── POINT_A.md
│   ├── POINT_B.md
│   ├── POINT_C.md
│   └── POINT_D.md          # 👈 ЭТОТ ФАЙЛ
└── setup/
    └── ...
```

***

## Деплой (текущая конфигурация)

### 1. Пересборка Docker
```bash
cd /root/arenda
docker compose build --no-cache
```

### 2. Сборка фронта
```bash
docker compose run --rm admin-frontend npm run build
```

### 3. Копирование статики
```bash
sudo cp -r admin-frontend/build/* /var/www/assetmanagement.team/
sudo chown -R www-data:www-data /var/www/assetmanagement.team/
sudo chmod -R 755 /var/www/assetmanagement.team/
```

### 4. Перезапуск
```bash
docker compose up -d backend
sudo nginx -t
sudo systemctl reload nginx
```

---

## Восстановление POINT D

### Автоматическое восстановление через Cursor

**Промпт для Cursor:**

```
ЗАДАЧА: Восстановить проект до состояния POINT D

Прочитай файл docs/restore-points/POINT_D.md и выполни:

1. Удали все изменения, сделанные после создания POINT D
2. Восстанови все файлы из коммита с тегом point-d
3. Проверь целостность:
   - backend/core/permissions.py существует
   - backend/core/decorators.py существует
   - admin-frontend/src/utils/permissions.ts существует
   - admin-frontend/src/components/PermissionGuard.tsx существует
   - docs/conventions/ содержит все файлы
4. Выполни:
   - docker compose build --no-cache
   - docker compose up -d
   - docker compose run --rm admin-frontend npm run build

Восстановление завершено, когда сайт работает идентично описанию в POINT_D.md.
```

### Ручное восстановление
```bash
# 1. Откат Git
cd /root/arenda
git checkout point-d
git log --oneline | head -5  # Проверить хэш коммита

# 2. Пересборка
docker compose down
docker compose build --no-cache
docker compose up -d

# 3. Миграции (если нужно)
docker compose exec backend python manage.py migrate

# 4. Сборка фронта
docker compose run --rm admin-frontend npm run build

# 5. Деплой
sudo cp -r admin-frontend/build/* /var/www/assetmanagement.team/
sudo chown -R www-data:www-data /var/www/assetmanagement.team/
sudo systemctl reload nginx

# 6. Проверка
curl -I https://assetmanagement.team
curl https://assetmanagement.team/api/auth/me/
```

### Тестирование после восстановления
- [ ] Сайт открывается по HTTPS
- [ ] Логин работает (логин/пароль)
- [ ] Логин через WhatsApp работает
- [ ] Дашборд отображается корректно
- [ ] Договоры имеют формат AMT-2026-DDMM-XXX
- [ ] Отчёты открываются (P&L с выпадающим периодом)
- [ ] Настройки → Логи изменений работают
- [ ] Сайдбар сворачивается/разворачивается
- [ ] Меню фильтруется по роли пользователя
