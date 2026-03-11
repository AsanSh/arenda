# AMT — План подготовки к SaaS (Safe Extension)

**Дата:** 2026-03-11  
**Принцип:** Расширение без breaking changes. Текущий сайт не трогается.

---

## ЭТАП 1. SAFE AUDIT — ИТОГ

### Что используется в production

| Компонент | Путь | Статус |
|-----------|------|--------|
| Frontend | admin-frontend | Единственный, активен |
| Backend | backend (Django) | Единственный, активен |
| Deploy | infra/deploy.sh | Работает |
| Nginx | /var/www/assetmanagement.team | Статика + API proxy :8000 |

### Страницы (все активны)

`/login`, `/dashboard`, `/properties`, `/tenants`, `/contracts`, `/accruals`, `/payments`, `/deposits`, `/account`, `/accounts`, `/reports`, `/notifications`, `/settings`, `/help`, `/requests`, `/access-denied`

### API (все активны)

`/api/auth/`, `/api/tenants/`, `/api/properties/`, `/api/contracts/`, `/api/accruals/`, `/api/payments/`, `/api/deposits/`, `/api/account/`, `/api/accounts/`, `/api/dashboard/`, `/api/forecast/`, `/api/reports/`, `/api/notifications/`

### Что можно расширять без риска

- Новые Django apps (analytics, investor_portal)
- Новые модели (Company, InvestorPosition, InvestorPayout и т.д.)
- Новые endpoints (префикс /api/analytics/, /api/investor/, /api/forecast-smart/)
- Новые страницы (добавить в App.tsx за feature flag)
- Nullable поля company_id в существующих моделях
- Feature flags в settings.py

### Что НЕ трогать

- Существующие views, serializers, querysets без необходимости
- Текущие URL
- deploy.sh, docker-compose, nginx
- Layout, Dashboard, Reports (текущие)

---

## ЭТАП 2. COMPANY / ORGANIZATION (SaaS Foundation)

### Модель Company

```python
class Company(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True)  # для subdomain
    is_active = models.BooleanField(default=True)
    settings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### company_id — безопасное добавление

| Модель | Миграция | Стратегия |
|--------|----------|-----------|
| Property | nullable, default=None | При запросе: filter(company_id__isnull=True) \| filter(company_id=current) |
| Contract | nullable | Аналогично |
| Tenant | nullable | Аналогично |
| Accrual | через contract | Не добавляем, наследуется |
| Payment | через contract | Не добавляем |
| Deposit | через contract | Не добавляем |
| User | nullable company | Текущий режим: company_id=None = «все данные» |
| Account | nullable | |
| Expense | nullable | через property/contract |
| InvestorLink | без изменений | Через investor (Tenant) |
| NotificationSettings | nullable | |

### TODO markers

В mixins, views — комментарии:
`# TODO SaaS: filter by request.user.company_id when multi-tenant enabled`

---

## ЭТАП 3. ФИНАНСОВАЯ АНАЛИТИКА НЕДВИЖИМОСТИ

### Новый модуль: backend/analytics/

- `analytics/views.py` — PropertyAnalyticsViewSet
- `analytics/services.py` — PropertyAnalyticsService
- Endpoints: `/api/analytics/properties/`, `/api/analytics/properties/<id>/`

### Метрики (из существующих Accrual, Payment, Deposit, Expense)

- Total Accrued, Total Paid, Outstanding Debt, Overdue Amount
- Deposit Held, Expenses, Net Cashflow
- Collection Rate, Occupancy Rate

### Frontend: /analytics/properties (за FEATURE_ANALYTICS)

---

## ЭТАП 4. ИНВЕСТОРСКИЙ КАБИНЕТ

### Уже есть

- InvestorLink (investor → property/contract, share, status)
- Роль User.investor
- DataScopingMixin._scope_for_investor

### Новые модели (foundation)

- InvestmentProject — проект/объект инвестирования (расширение InvestorLink)
- InvestorPosition — позиция инвестора (сумма, дата входа)
- InvestorPayout — выплата инвестору
- InvestorReport — отчёт для инвестора

### Новый модуль: backend/investor_portal/

- Viewsets для позиций, выплат, отчётов
- Endpoints: `/api/investor/` (за FEATURE_INVESTOR_PORTAL)

### Frontend: /investor (за FEATURE_INVESTOR_PORTAL)

---

## ЭТАП 5. SMART FORECAST

### Сохранить

- Текущий /api/forecast/ — без изменений
- Reports с type=forecast — без изменений

### Новый слой

- `forecast/smart_services.py` — rule-based engine
- Метрики: payment_discipline, avg_delay_days, risk_score
- Endpoint: `/api/forecast-smart/` (отдельный app или action в forecast)

### Frontend: /analytics/forecast-smart (за FEATURE_SMART_FORECAST)

---

## ЭТАП 6–7. FEATURE FLAGS

```python
# settings.py
FEATURE_ANALYTICS = os.environ.get('FEATURE_ANALYTICS', 'false').lower() == 'true'
FEATURE_INVESTOR_PORTAL = os.environ.get('FEATURE_INVESTOR_PORTAL', 'false').lower() == 'true'
FEATURE_SMART_FORECAST = os.environ.get('FEATURE_SMART_FORECAST', 'false').lower() == 'true'
```

Frontend: переменные REACT_APP_FEATURE_* при build.

---

## ОТКАТ

| Модуль | Откат |
|--------|-------|
| Analytics | FEATURE_ANALYTICS=false, REACT_APP_FEATURE_ANALYTICS=false |
| Investor Portal | FEATURE_INVESTOR_PORTAL=false, REACT_APP_FEATURE_INVESTOR_PORTAL=false |
| Smart Forecast | FEATURE_SMART_FORECAST=false, REACT_APP_FEATURE_SMART_FORECAST=false |
| Company | Миграции с company_id reversible (можно сделать nullable обратно) |

---

## ВКЛЮЧЕНИЕ МОДУЛЕЙ

### Backend (.env или docker-compose environment)

```
FEATURE_ANALYTICS=true
FEATURE_INVESTOR_PORTAL=true
FEATURE_SMART_FORECAST=true
```

### Frontend (при build)

```
REACT_APP_FEATURE_ANALYTICS=true
REACT_APP_FEATURE_INVESTOR_PORTAL=true
REACT_APP_FEATURE_SMART_FORECAST=true
```

В docker-compose для admin-frontend добавить в environment. В deploy.sh — передать при npm run build.

---

## ФАЙЛЫ (РЕАЛИЗОВАНО)

### Новые

- backend/core/models.py — Company
- backend/analytics/ — app (services, views, urls)
- backend/investor_portal/ — app (models, views, urls)
- backend/forecast/smart_services.py, smart_views.py
- admin-frontend: pages/AnalyticsPropertiesPage, InvestorCabinetPage, ForecastSmartPage

### Изменённые

- backend/amt/settings.py — FEATURE_*, INSTALLED_APPS
- backend/amt/urls.py — условные include
- backend/core/models.py — Company, User.company, Tenant.company
- backend/core/admin.py — CompanyAdmin
- backend/properties/models.py — company nullable
- backend/contracts/models.py — company nullable
- backend/forecast/urls.py — smart forecast
- admin-frontend/src/App.tsx — условные Route
- admin-frontend/src/hooks/useUserMenu.ts — условные пункты меню

### Миграции

- core: 0014_add_company_and_company_id
- properties: 0003_add_company_id
- contracts: 0007_add_company_id
- investor_portal: 0001_initial
