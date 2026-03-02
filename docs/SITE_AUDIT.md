# Аудит сайта (assetmanagement.team / AMT)

**Дата:** 2 марта 2025  
**Предыдущий аудит:** 27 января 2025  
**Репозиторий:** arenda (админ-панель аренды/управления недвижимостью)

---

## 1. Обзор архитектуры

| Компонент | Технологии | Назначение |
|-----------|------------|------------|
| **admin-frontend** | React 18, TypeScript 4.9, Tailwind 3.3, React Router 6, Axios | SPA админ-панель |
| **backend** | Django 4.2, DRF, PostgreSQL 15 | REST API, бизнес-логика |
| **infra** | Docker Compose | Локальная разработка |

**Домен:** assetmanagement.team (HTTPS, Let's Encrypt).  
**Продакшен:** фронт — статика в `/var/www/assetmanagement.team`, API — прокси на `127.0.0.1:8000`.

---

## 2. Фронтенд (admin-frontend)

### 2.1 Роуты и страницы

| Путь | Страница | Защита |
|------|----------|--------|
| `/login` | LoginPage | Публичная |
| `/access-denied` | AccessDeniedPage | Публичная |
| `/forecast` | Редирект → `/reports?type=forecast` | — |
| `/` | Редирект → `/dashboard` | ProtectedRoute |
| `/dashboard` | DashboardPage | ProtectedRoute |
| `/properties` | PropertiesPage | ProtectedRoute |
| `/tenants`, `/tenants/:id` | TenantsPage, TenantDetailPage | ProtectedRoute |
| `/contracts`, `/contracts/:id` | ContractsPage, ContractDetailPage | ProtectedRoute |
| `/accruals` | AccrualsPage | ProtectedRoute |
| `/payments` | PaymentsPage | ProtectedRoute |
| `/deposits` | DepositsPage | ProtectedRoute |
| `/account` | AccountPage | ProtectedRoute |
| `/accounts` | AccountsPage | ProtectedRoute |
| `/reports` | ReportsPage | ProtectedRoute |
| `/notifications` | NotificationsPage | ProtectedRoute |
| `/settings` | SettingsPage | ProtectedRoute |
| `/help` | HelpPage | ProtectedRoute |
| `/requests` | RequestsPage | ProtectedRoute |

Защищённые роуты обёрнуты в `ProtectedRoute` и общий `Layout` (сайдбар + контент).

### 2.2 Навигация и роли

- **useUserMenu()** — меню строится по роли из `UserContext` и `utils/permissions.ts` (матрица доступа по разделам).
- **Layout:** десктоп — сайдбар (свёрнут 56px / развёрнут 200px, pin по localStorage); мобильный — drawer + нижняя панель (Дашборд, Счета, Договоры, Ещё).
- **PermissionGuard** — проверка прав на уровне компонентов (новый, см. `AccessDeniedPage`).

### 2.3 API-клиент

- **client.ts:** axios, `baseURL` из `REACT_APP_API_URL` или по домену assetmanagement.team, иначе `http://localhost:8000/api`.
- **Авторизация:** Token в заголовке `Authorization` из `localStorage.auth_token`.
- **401:** очистка токена и редирект на `/login` (кроме случая, когда уже на `/login`).
- **Явные API-модули:** `api/contracts.ts`, `api/accruals.ts`, `api/payments.ts`, `api/client.ts` — экспорт через `api/index.ts`.

### 2.4 Компоненты redesign vs использование

| Элемент | Статус | Рекомендация |
|---------|--------|--------------|
| **components/redesign/** | KPIStatCard, Amount, DataTable, PageHeader, AppShell и др. — 15 компонентов | **Нигде не импортируются.** AMT_CURSOR_RULES рекомендует их использовать, но страницы (Dashboard, Accruals, Payments и др.) их не используют |
| **pages/redesign/** | Только README (AccrualsPageRedesign, DashboardPageRedesign, PaymentsPageRedesign удалены) | Один дизайн — см. docs/ONE_DESIGN.md |
| **LoginPageNew.tsx** | Не в роутах | Удалить или заменить LoginPage |
| **LoginPageOTP.tsx** | Не в роутах | Удалить или подключить |
| **ForecastPage.tsx** | Не в роутах (есть редирект) | Удалить или подключить |

### 2.5 Зависимости (package.json)

- React 18, react-router-dom 6, axios, lucide-react, @heroicons/react, Tailwind, TypeScript 4.9.
- Нет Zustand/Redux — контексты (User, Density).
- **Нет Prettier** в devDependencies.
- Тесты: только `react-scripts test`, e2e нет.

### 2.6 Несоответствие конвенциям

- **AMT_CURSOR_RULES:** «Компоненты вне redesign/ считаются DEPRECATED. Использовать redesign.»  
  **Факт:** Страницы используют Tailwind и Heroicons напрямую, redesign-компоненты не импортируются.

---

## 3. Бэкенд (backend)

### 3.1 Приложения и API

| Префикс API | Приложение | services.py |
|-------------|------------|-------------|
| `/api/` | core | ✅ |
| `/api/dashboard/` | dashboard | — |
| `/api/properties/` | properties | — |
| `/api/contracts/` | contracts | ✅ |
| `/api/accruals/` | accruals | ✅ |
| `/api/payments/` | payments | ✅ |
| `/api/deposits/` | deposits | ✅ |
| `/api/account/` | account | — |
| `/api/accounts/` | accounts | ✅ |
| `/api/forecast/` | forecast | — |
| `/api/reports/` | reports | — |
| `/api/notifications/` | notifications | ✅ |

### 3.2 Авторизация (core)

- Логин по паролю: `POST /api/auth/login/`, токен в ответе.
- Профиль: `GET/PATCH /api/auth/me/`, `PATCH /api/auth/profile/`, смена пароля, check-phone.
- WhatsApp: `auth/whatsapp/start/`, `request-code/`, `verify-code/`; webhook Green API.

### 3.3 Аудит

- **AuditLog** (core), логирование через `core.audit.log_audit()`.
- API: список логов и действие **restore** для `profile_updated`, `employee_updated`.

### 3.4 Тесты

- `backend/core/tests/test_utils.py`, `test_whatsapp_auth.py`
- `backend/accruals/tests.py`
- Нет pytest.ini; coverage не зафиксирован.

### 3.5 Зависимости (requirements.txt)

Django 4.2.7, DRF 3.14, django-cors-headers, psycopg2-binary, Pillow, django-filter, python-dateutil, beautifulsoup4, requests, lxml.

---

## 4. Инфраструктура

### 4.1 Docker Compose (infra/)

- **db:** PostgreSQL 15, healthcheck.
- **backend:** runserver 0.0.0.0:8000 (⚠️ не gunicorn).
- **admin-frontend:** порт 3000, `REACT_APP_API_URL`, `DANGEROUSLY_DISABLE_HOST_CHECK=true` (только для dev).

Nginx в compose нет — внешний Nginx на хосте.

### 4.2 Продакшен

- Backend: `runserver` вместо gunicorn/uwsgi.
- SECRET_KEY: fallback `django-insecure-dev-key-change-in-production` при отсутствии env.

---

## 5. Безопасность

| Аспект | Статус |
|--------|--------|
| CORS | django-cors-headers |
| DEBUG | из env (0 в проде) |
| SECRET_KEY | из env, fallback insecure в dev |
| Токен | localStorage; при 401 — очистка и редирект |
| CSRF | Django CsrfViewMiddleware |
| DANGEROUSLY_DISABLE_HOST_CHECK | Только в docker-compose для dev |

---

## 6. Рекомендации

### Критичные

1. **Продакшен backend:** заменить `runserver` на gunicorn; убрать fallback SECRET_KEY в продакшене.
2. **Двойная проверка auth:** `ProtectedRoute` проверяет `localStorage.auth_token` и `whatsapp_authorized`, но API может вернуть 401 — токен тогда очищается. Убедиться, что нет race между проверкой и редиректом.

### Высокий приоритет

3. **Удалить неиспользуемые страницы:** LoginPageNew, LoginPageOTP, ForecastPage (или подключить, если нужны).
4. **Использовать redesign-компоненты:** Страницы должны импортировать KPIStatCard, Amount, DataTable и др. из `components/redesign/` — иначе конвенция AMT не соблюдается, и компоненты мёртвый код.
5. **Добавить Prettier** в devDependencies для единообразия форматирования.

### Средний приоритет

6. **Тесты:** расширить backend (pytest, coverage ≥ 80%); рассмотреть e2e (Playwright/Cypress) для ключевых сценариев.
7. **API-слой фронта:** дописать явные функции для всех доменов (deposits, properties, tenants, reports), а не только contracts/accruals/payments.
8. **Properties, forecast, dashboard, reports, account:** рассмотреть добавление services.py для бизнес-логики (по конвенции).

### Низкий приоритет

9. **TypeScript:** обновить до 5.x при возможности.
10. **Dependencies:** периодически проверять `npm audit` и `pip-audit`.

---

## 7. Документация (docs/)

- **conventions/** — доступ, роли, бэкенд, фронт, дашборд, аудит.
- **setup/** — домен, DNS, SSL, Green API, WhatsApp, быстрый старт.
- **fixes/** — сценарии исправлений.
- **restore-points/** — POINT_D и др.
- **ONE_DESIGN.md** — один файл на страницу, redesign-страницы удалены.

---

Аудит подготовлен по состоянию репозитория на 02.03.2025.
