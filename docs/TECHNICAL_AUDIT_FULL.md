# Полный технический аудит проекта AMT

**Дата:** 2026-03-11

---

## 1. СТРУКТУРА ПРОЕКТА

### Дерево проекта (глубина 3)

```
/root/arenda/
├── admin-frontend/          # Единственный frontend
│   ├── build/               # Артефакт npm run build (для prod)
│   ├── node_modules/
│   ├── public/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── contexts/
│       ├── hooks/
│       ├── pages/
│       ├── types/
│       └── utils/
├── backend/                 # Единственный backend
│   ├── account/
│   ├── accounts/
│   ├── accruals/
│   ├── amt/                 # Django project (settings, urls)
│   ├── contracts/
│   ├── core/
│   ├── dashboard/
│   ├── deposits/
│   ├── forecast/
│   ├── notifications/
│   ├── payments/
│   ├── properties/
│   ├── reports/
│   ├── sms/
│   ├── media/
│   └── staticfiles/
├── backups/
├── docs/
├── infra/
│   ├── systemd/
│   └── (docker-compose.yml, nginx.conf, deploy.sh)
├── scripts/
└── .vscode/
```

### Папки, похожие на frontend/admin/client/web/app/ui

| Путь | Тип |
|------|-----|
| admin-frontend/ | Frontend (единственный) |
| admin-frontend/src/ | Исходники |
| admin-frontend/src/components/ | Компоненты |
| admin-frontend/src/pages/ | Страницы |

**Нет:** client-frontend, web, app, ui как отдельных приложений.

### Папки, похожие на backend/api/server

| Путь | Тип |
|------|-----|
| backend/ | Django backend (единственный) |
| backend/amt/ | Django project |
| backend/core/ | Auth, User, Tenant |
| backend/*/ | Django apps |

**Нет:** api/, server/ как отдельных приложений.

### Итог

| Категория | Количество |
|-----------|------------|
| **Реальных frontend** | 1 (admin-frontend) |
| **Реальных backend** | 1 (backend — Django) |

---

## 2. КАКОЙ FRONTEND РЕАЛЬНО ИСПОЛЬЗУЕТСЯ

### package.json

| Поле | Значение |
|------|----------|
| **Файл** | admin-frontend/package.json |
| **Имя** | amt-admin-frontend |
| **Версия** | 1.0.0 |
| **Framework** | React 18.2 + Create React App (react-scripts 5.0.1) |
| **Build tool** | react-scripts (webpack под капотом) |
| **Entry** | src/index.tsx → App.tsx |
| **Dev port** | 3000 (CRA default) |
| **Build script** | `npm run build` → создаёт build/ |
| **Start script** | `npm start` → dev server на 3000 |

### Реально используемый frontend

**admin-frontend** — единственный; используется везде (docker, deploy, nginx).

### App.tsx — подключённые страницы

| Путь | Страница | Компонент |
|------|----------|-----------|
| /login | LoginPage | LoginPage |
| /access-denied | AccessDeniedPage | AccessDeniedPage |
| /forecast | Redirect | → /reports?type=forecast |
| / | Navigate | → /dashboard |
| /dashboard | DashboardPage | DashboardPage |
| /properties | PropertiesPage | PropertiesPage |
| /tenants | TenantsPage | TenantsPage |
| /tenants/:id | TenantDetailPage | TenantDetailPage |
| /contracts | ContractsPage | ContractsPage |
| /contracts/:id | ContractDetailPage | ContractDetailPage |
| /accruals | AccrualsPage | AccrualsPage |
| /payments | PaymentsPage | PaymentsPage |
| /deposits | DepositsPage | DepositsPage |
| /account | AccountPage | AccountPage |
| /accounts | AccountsPage | AccountsPage |
| /reports | ReportsPage | ReportsPage |
| /notifications | NotificationsPage | NotificationsPage |
| /settings | SettingsPage | SettingsPage |
| /help | HelpPage | HelpPage |
| /requests | RequestsPage | RequestsPage |

### Страницы, которые ЕСТЬ, но НЕ подключены в роутинге

| Файл | Статус |
|------|--------|
| LoginPageNew.tsx | Существует, не импортируется в App.tsx |
| LoginPageOTP.tsx | Существует, не импортируется в App.tsx |
| ForecastPage.tsx | Существует, /forecast редиректит на ReportsPage |

### Альтернативные LoginPage*

| Файл | Описание |
|------|----------|
| LoginPage.tsx | **Используется** — основной логин |
| LoginPageNew.tsx | Не используется |
| LoginPageOTP.tsx | Не используется (OTP-логин) |

### Альтернативные ForecastPage*

| Файл | Описание |
|------|----------|
| ForecastPage.tsx | Существует, но маршрут /forecast → Navigate to /reports?type=forecast |

### Redesign pages/components

| Путь | Содержимое | Использование |
|------|------------|---------------|
| pages/redesign/ | Только README.md (страницы удалены) | — |
| components/redesign/ | 15 файлов: SideNav, AppShell, KPIStatCard, DataTable, DataCardList, ResponsiveDataView, Toast, StatusChip, ErrorState, Skeleton, Amount, EmptyState, BottomNav, PageHeader, TopBar | **Ни один не импортируется** в pages/ или Layout |

### Неиспользуемые страницы (итог)

- LoginPageNew.tsx
- LoginPageOTP.tsx
- ForecastPage.tsx
- Вся папка components/redesign/ — мёртвый код

---

## 3. КАКОЙ BACKEND РЕАЛЬНО ИСПОЛЬЗУЕТСЯ

### Точки входа

| Файл | Назначение |
|------|------------|
| backend/manage.py | Django CLI |
| backend/amt/settings.py | Настройки |
| backend/amt/urls.py | Главный urlconf |
| backend/amt/wsgi.py | WSGI application |

### Количество backend-приложений

**1** — Django-проект `amt` в `backend/`.

### Подключённые Django apps (INSTALLED_APPS)

```
core, properties, contracts, accruals, payments, deposits,
account, accounts, forecast, dashboard, reports, notifications
```

### API endpoints (из amt/urls.py)

| Префикс | Модуль |
|---------|--------|
| api/admin/ | Django admin |
| api/auth/login/ | LoginView |
| api/auth/logout/ | LogoutView |
| api/auth/me/ | me |
| api/ | core.urls (tenants, exchange-rates, requests, employees, audit-logs, auth/*) |
| api/dashboard/ | dashboard.urls |
| api/properties/ | properties.urls |
| api/contracts/ | contracts.urls |
| api/accruals/ | accruals.urls |
| api/payments/ | payments.urls |
| api/deposits/ | deposits.urls |
| api/account/ | account.urls |
| api/accounts/ | accounts.urls |
| api/forecast/ | forecast.urls |
| api/reports/ | reports.urls |
| api/notifications/ | notifications.urls |

### Auth endpoints (core)

| Путь | Описание |
|------|----------|
| api/auth/login/ | Логин |
| api/auth/logout/ | Выход |
| api/auth/me/ | Профиль |
| api/auth/profile/ | Обновление профиля |
| api/auth/change-password/ | Смена пароля |
| api/auth/check-phone/ | Проверка телефона |
| api/auth/login-whatsapp/ | Deprecated |
| api/auth/whatsapp/start/ | WhatsApp start |
| api/auth/whatsapp/status/ | WhatsApp status |
| api/auth/whatsapp/request-code/ | Запрос кода |
| api/auth/whatsapp/verify-code/ | Верификация |
| api/webhooks/greenapi/incoming/ | Green API webhook |

### Contracts, Accruals, Payments, Deposits, Notifications

ViewSet-based REST (list, create, retrieve, update, destroy + custom actions). Полные маршруты формируются DefaultRouter.

---

## 4. НЕДОРЕАЛИЗОВАННЫЕ И НЕПОДКЛЮЧЕННЫЕ ЧАСТИ

### TODO / FIXME / pass / stub

| Файл | Строка | Что не реализовано |
|------|--------|---------------------|
| AccrualsPage.tsx | 853 | `{/* TODO: массовое редактирование группы */}` — пустой onClick |
| PaymentsPage.tsx | 279 | `{/* TODO: добавить редактирование */}` — пустой onClick |
| DepositsPage.tsx | 220 | `{/* TODO: добавить редактирование */}` — пустой onClick |
| notifications/services.py | 53 | `# TODO: Реализовать отправку email через Django EmailBackend` |
| notifications/services.py | 62-64 | print() вместо реальной отправки email |
| notifications/services.py | 70 | `# TODO: Реализовать отправку SMS через SMS-провайдер` |
| notifications/services.py | 74-75 | print() вместо реальной отправки SMS |
| accruals/views.py | 56, 63, 316, 321 | `pass` в except (типичные заглушки) |
| core/services.py | 41, 58, 75 | `pass` в except |
| contracts/serializers.py | 24 | `pass` в except (валидация) |

### Функции, которые печатают в консоль вместо реальной логики

| Файл | Что делает |
|------|------------|
| notifications/services.py:send_email | print(f"[EMAIL] To: ...") вместо SMTP |
| notifications/services.py:send_sms | print(f"[SMS] To: ...") вместо SMS API |
| core/auth_views.py | print для отладки логина (не блокирует работу) |
| DashboardPage.tsx | console.log для stats/overdue/payments (отладка) |
| UserContext.tsx | console.log для fetchUser (отладка) |
| greenApi.ts | console.log для QR (отладка) |
| LoginPageNew.tsx, LoginPageOTP.tsx | console.log (страницы не используются) |

### Страницы/компоненты, которые существуют, но не используются

| Файл/папка | Причина |
|------------|---------|
| LoginPageNew.tsx | Не в App.tsx |
| LoginPageOTP.tsx | Не в App.tsx |
| ForecastPage.tsx | Редирект на /reports?type=forecast |
| components/redesign/* (15 файлов) | Нигде не импортируются |

### API методы, объявленные в backend, но не используемые фронтом

Не проводилась полная трассировка; основные ViewSet-actions используются.

### Фронтенд-вызовы без backend-маршрута

Не обнаружены при проверке api/client и страниц.

---

## 5. КАКАЯ ВЕРСИЯ РЕАЛЬНО ЗАПУСКАЕТСЯ

### docker-compose.yml (infra/)

| Сервис | Образ/сборка | Volumes | Порты |
|--------|--------------|---------|-------|
| db | postgres:15 | postgres_data | 5432 |
| backend | build: ../backend | ../backend:/app | 8000 |
| admin-frontend | build: ../admin-frontend | ../admin-frontend:/app, /app/node_modules | 3000 |

### Контейнеры

| Контейнер | Команда | Монтируется |
|-----------|---------|-------------|
| backend | python manage.py runserver 0.0.0.0:8000 | backend → /app |
| admin-frontend | npm start | admin-frontend → /app |

### nginx (production, assetmanagement.team)

| Настройка | Значение |
|-----------|----------|
| root для статики | /var/www/assetmanagement.team |
| location / | try_files $uri $uri/ /index.html |
| frontend build | admin-frontend/build/* → копируется в /var/www/assetmanagement.team через deploy.sh |
| /media/ | proxy_pass http://127.0.0.1:8000 |
| /api/ | proxy_pass http://127.0.0.1:8000 |
| Backend порт | 8000 (localhost) |

### deploy.sh (ключевые шаги)

1. cd /root/arenda
2. docker-compose up (db, backend)
3. docker-compose exec backend python manage.py migrate
4. docker-compose exec backend python manage.py collectstatic
5. cd admin-frontend && npm install && npm run build
6. cp -r build/* /var/www/assetmanagement.team/
7. nginx -t && systemctl reload nginx
8. docker-compose restart backend

### Влияющие каталоги

| Среда | Каталог | Влияет? |
|-------|---------|---------|
| Dev (localhost:3000) | admin-frontend/ | Да (volume mount, hot reload) |
| Dev (localhost:8000) | backend/ | Да (volume mount) |
| Prod (assetmanagement.team) | admin-frontend/build/ → /var/www/ | Да только после deploy.sh |
| Prod | backend/ | Да (Docker volume, runserver) |

### Каталоги, которые не участвуют в проде

| Каталог | Причина |
|---------|---------|
| admin-frontend (исходники) | В проде отдаётся только build/ после копирования |
| backend/staticfiles | collectstatic копирует в container, nginx раздаёт /static/ из /var/www (если настроено) |
| infra/nginx.conf | Должен быть на сервере; deploy не копирует nginx |

---

## 6. ПОЧЕМУ ИЗМЕНЕНИЯ МОГУТ НЕ ПРИМЕНЯТЬСЯ

| Пункт | Проверка | Ответ |
|-------|----------|-------|
| Правится не тот frontend | Один frontend — admin-frontend | Нет |
| Правится не та страница | App.tsx использует конкретные импорты | Возможно, если правится LoginPageNew вместо LoginPage |
| Правится компонент, который не используется | components/redesign/ не импортируются | **Да, если править redesign** |
| Docker использует старый volume | Volume: ../admin-frontend:/app | Свежие файлы подхватываются |
| Nginx отдаёт старый build | root /var/www/assetmanagement.team; обновляется только через deploy.sh | **Да — без deploy.sh prod не обновится** |
| Не выполняется npm build | deploy.sh делает npm run build | **Да, если deploy не запускали** |
| Backend контейнер не пересобирается | volume mount — пересборка не нужна для кода | Нет |
| Frontend контейнер не пересобирается | volume mount — пересборка не нужна для dev | Для prod — build вне контейнера |
| Compose запускается не из той папки | deploy: cd /root/arenda/infra | **Да, если запускать из другой папки** |
| Есть второй репозиторий/копия на сервере | Не проверялось | Возможно |
| .env указывает не на тот backend | REACT_APP_API_URL: https://assetmanagement.team/api (prod) | Для localhost — client.ts берёт localhost:8000 |
| Browser cache / static cache | nginx: expires 1y для .js, .css | **Да — нужен hard refresh** |
| Dev и prod используют разные entrypoints | Dev: localhost:3000, Prod: nginx /var/www | **Да — разные** |

### Главная причина

**Production (assetmanagement.team):** nginx отдаёт статику из `/var/www/assetmanagement.team`, которая обновляется **только через deploy.sh** (npm run build + cp в /var/www). Без выполнения deploy.sh изменения в admin-frontend не попадут на прод.

**Dev (localhost:3000):** volume mount, hot reload — изменения видны сразу после сохранения.

**Browser cache:** агрессивное кэширование (expires 1y) для .js/.css — старый бандл может кэшироваться.

---

## 7. ЧЕКЛИСТ ДЛЯ ЛЮБОГО ИЗМЕНЕНИЯ

1. **Какой файл менять**
   - Страница: `admin-frontend/src/pages/<PageName>.tsx`
   - Компонент: `admin-frontend/src/components/<ComponentName>.tsx`
   - НЕ менять: `components/redesign/*` — не используются

2. **Какой компонент реально используется**
   - Проверить импорт в App.tsx или в родительской странице
   - Используются: LoginPage, DashboardPage, TenantsPage, ContractsPage, AccrualsPage, PaymentsPage, DepositsPage, ReportsPage, SettingsPage и т.д. (из App.tsx)

3. **Команда после изменения**
   - **Dev:** перезапуск не обязателен (hot reload); при сбое: `docker compose restart admin-frontend`
   - **Prod:** `cd /root/arenda && ./infra/deploy.sh` (или ручной npm run build + cp)

4. **Проверка, что изменение попало в build**
   - `ls -la admin-frontend/build/static/js/` — дата файлов
   - `grep -r "искомый текст" admin-frontend/build/static/js/*.js` — строка в бандле

5. **Проверка, что nginx отдаёт новую версию**
   - `ls -la /var/www/assetmanagement.team/static/js/`
   - Hard refresh в браузере (Ctrl+Shift+R)
   - Инкогнито / другой браузер

---

## 8. ФИНАЛЬНЫЙ ВЫВОД

| Параметр | Значение |
|----------|----------|
| **Реальных frontend** | 1 |
| **Реальных backend** | 1 |
| **Неиспользуемых страниц** | LoginPageNew, LoginPageOTP, ForecastPage (редирект) |
| **Неиспользуемых компонентов** | Вся папка components/redesign/ (15 файлов) |
| **Недореализованных мест** | Редактирование платежей/депозитов, массовое редактирование начислений, email/SMS в notifications (заглушки) |
| **Главная причина, почему изменения не отражаются** | Production: не выполняется deploy.sh (npm build + cp в /var/www). Без этого nginx продолжает отдавать старый build. Дополнительно: browser cache (expires 1y для static). |
