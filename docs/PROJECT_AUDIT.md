# Полный аудит проекта AMT (arenda)

**Дата:** 2026-03-11

---

## 1. Структура проекта

```
/root/arenda/
├── admin-frontend/     # Единственное фронтенд-приложение (React)
├── backend/            # Django REST API
├── infra/             # Docker, nginx, deploy
├── docs/              # Документация
├── scripts/           # Скрипты утилит
├── .cursorrules       # Правила Cursor
└── AMT_CURSOR_RULES.md # Полные правила проекта
```

**Нет:** client-frontend, mobile app. ZAKUP.ONE — другой проект, правила в .cursorrules устарели.

---

## 2. Версии фронтенда

| Параметр | Значение |
|----------|----------|
| **Количество приложений** | 1 (admin-frontend) |
| **Название** | amt-admin-frontend |
| **Версия** | 1.0.0 |
| **Путь** | admin-frontend/package.json |
| **Точка входа** | src/index.tsx → App.tsx |
| **Сборка** | Create React App 5.0.1 (react-scripts) |
| **React** | 18.2.0 |
| **Роутер** | react-router-dom 6.20.1 |

### Внутри admin-frontend

- **components/redesign/** — переиспользуемые компоненты (SideNav, KPIStatCard, DataTable и т.д.)
- **pages/redesign/** — README: redesign-страницы объединены в pages/
- **LoginPageNew.tsx**, **LoginPageOTP.tsx** — реализованы, но в App.tsx используется **LoginPage.tsx**
- **ForecastPage.tsx** — реализован, маршрут `/forecast` редиректит на `/reports?type=forecast`

---

## 3. Версии backend / админки

| Параметр | Значение |
|----------|----------|
| **Фреймворк** | Django 4.2.7 |
| **API** | Django REST Framework 3.14.0 |
| **БД** | PostgreSQL 15 |
| **Настройки** | backend/amt/settings.py |

### Django-приложения

| Приложение | Назначение |
|------------|------------|
| core | User, Tenant, auth, WhatsApp OTP, RBAC |
| properties | Объекты недвижимости |
| contracts | Договоры аренды, льготные периоды |
| accruals | Начисления |
| payments | Платежи, аллокации |
| deposits | Депозиты |
| account | Личный кабинет (персональный) |
| accounts | Бухгалтерские счета |
| dashboard | Аналитика, KPI |
| forecast | Прогнозы |
| reports | Отчёты |
| notifications | Уведомления |

---

## 4. Начатые, но не реализованные части

### TODO в коде

| Файл | Строка | Описание |
|------|--------|----------|
| AccrualsPage.tsx | 853 | `TODO: массовое редактирование группы` — пустой onClick для «Редактировать» в меню группы |
| PaymentsPage.tsx | 279 | `TODO: добавить редактирование` — пустой onClick для «Редактировать» платежа |
| DepositsPage.tsx | 220 | `TODO: добавить редактирование` — пустой onClick для «Редактировать» депозита |
| notifications/services.py | 53 | `TODO: Реализовать отправку email через Django EmailBackend` |
| notifications/services.py | 70 | `TODO: Реализовать отправку SMS через SMS-провайдер` |

### Заглушки (stub)

| Место | Описание |
|-------|----------|
| notifications/services.py:send_email | Печатает в консоль, реальный SMTP не настроен |
| notifications/services.py:send_sms | Печатает в консоль, SMS-провайдер не подключён |

### Неподключённые/альтернативные страницы

| Файл | Статус |
|------|--------|
| LoginPageNew.tsx | Есть, не используется в роутинге |
| LoginPageOTP.tsx | Есть, не используется в роутинге |
| ForecastPage.tsx | Есть, вместо него редирект на ReportsPage |

### Исправлено при аудите

- **contracts/views.py** — добавлен импорт `AccrualService` (использовался без импорта, мог вызвать NameError).

---

## 5. Основные функции по областям

### Auth

| Функция/класс | Файл | Описание |
|---------------|------|----------|
| LoginView | core/auth_views.py | Логин по username/password, выдаёт токен |
| LogoutView | core/auth_views.py | Удаляет токен |
| me | core/auth_views.py | Профиль и права текущего пользователя |
| whatsapp_start, whatsapp_verify_code | core/whatsapp_auth_views.py | WhatsApp OTP через Green API |
| get_user_type, get_user_permissions | core/permissions.py | RBAC, матрица доступа |

### Tenants (контрагенты)

| Функция/класс | Файл | Описание |
|---------------|------|----------|
| TenantViewSet | core/views.py | CRUD контрагентов, data scoping по ролям |
| TenantSerializer | core/serializers.py | Сериализация, валидация телефона, additional_contacts |

### Contracts

| Функция/класс | Файл | Описание |
|---------------|------|----------|
| ContractViewSet | contracts/views.py | CRUD, end_contract, generate_accruals, fix_accruals |
| ContractService | contracts/services.py | Генерация номера, создание с начислениями/депозитом, обновление/удаление |

### Accruals

| Функция/класс | Файл | Описание |
|---------------|------|----------|
| AccrualViewSet | accruals/views.py | CRUD, recalculate, cancel_payment, bulk_update/delete/accept |
| AccrualService | accruals/services.py | generate_accruals_for_contract, fix_accruals_for_contract (в т.ч. льготы) |

### Payments

| Функция/класс | Файл | Описание |
|---------------|------|----------|
| PaymentViewSet | payments/views.py | CRUD, reallocate, return_payment |
| PaymentAllocationService | payments/services.py | Аллокация платежей FIFO |

### Deposits

| Функция/класс | Файл | Описание |
|---------------|------|----------|
| DepositViewSet | deposits/views.py | CRUD, accept, withdraw, refund |
| DepositService | deposits/services.py | Логика accept/withdraw/refund |

### Properties

| Функция/класс | Файл | Описание |
|---------------|------|----------|
| PropertyViewSet | properties/views.py | CRUD объектов недвижимости |

### Accounts (счета)

| Функция/класс | Файл | Описание |
|---------------|------|----------|
| AccountViewSet | accounts/views.py | CRUD, add_income, add_expense |
| AccountService | accounts/services.py | Создание транзакций |

### Dashboard

| Функция/класс | Файл | Описание |
|---------------|------|----------|
| DashboardViewSet | dashboard/views.py | stats, overdue, recent_payments, upcoming_payments |

### Reports / Forecast

| Функция/класс | Файл | Описание |
|---------------|------|----------|
| ReportsViewSet | reports/views.py | Генерация отчётов |
| ForecastViewSet | forecast/views.py | Расчёт прогнозов |

### Notifications

| Функция/класс | Файл | Описание |
|---------------|------|----------|
| NotificationSettingsViewSet, NotificationLogViewSet | notifications/views.py | Настройки и лог уведомлений |
| NotificationService | notifications/services.py | Формирование и отправка; email/SMS — заглушки |

---

## 6. API маршруты (backend)

| Префикс | Ресурсы |
|---------|---------|
| api/auth/ | login, logout, me, profile, check-phone, whatsapp/* |
| api/tenants/ | TenantViewSet |
| api/properties/ | PropertyViewSet |
| api/contracts/ | ContractViewSet, end_contract, generate_accruals, fix_accruals, accruals, files |
| api/accruals/ | AccrualViewSet, recalculate, cancel_payment, bulk_*, accept |
| api/payments/ | PaymentViewSet, reallocate, return_payment |
| api/deposits/ | DepositViewSet |
| api/account/ | AccountViewSet, ExpenseViewSet |
| api/accounts/ | AccountViewSet |
| api/dashboard/ | stats, overdue, recent_payments, upcoming_payments |
| api/forecast/ | calculate |
| api/reports/ | reports |
| api/notifications/ | settings, logs |

---

## 7. Frontend API (admin-frontend)

| Модуль | Экспорты | Использование |
|--------|----------|---------------|
| api/client.ts | Axios с auth interceptor | Базовый клиент |
| api/contracts.ts | fetchContractList, createContract, endContract и др. | Явные вызовы API договоров |
| api/accruals.ts | fetchAccrualList, bulkUpdateAccruals и др. | API начислений |
| api/payments.ts | fetchPaymentList, createPayment и др. | API платежей |
| api/greenApi.ts | getSettings, getStateInstance | Green API (WhatsApp) |

Tenants, properties, deposits, dashboard, reports и др. вызываются через `client.get/post/...` в страницах, без отдельных API-модулей.

---

## 8. Рекомендации

1. Добавить в backend импорт `AccrualService` в `contracts/views.py` (уже исправлено).
2. Реализовать редактирование платежей и депозитов (сейчас TODO).
3. Реализовать массовое редактирование группы начислений (TODO в AccrualsPage).
4. Подключить реальные email/SMS в `notifications/services.py`.
5. Удалить или подключить `LoginPageNew`, `LoginPageOTP`, `ForecastPage` — либо использовать, либо убрать из кодовой базы.
