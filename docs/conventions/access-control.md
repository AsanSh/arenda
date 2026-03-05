# Матрица доступа по типам пользователей AMT

**Защищённые админы:** учётные записи **nimdaSan** и **Bahi** должны всегда быть доступны (см. [user-roles.md](./user-roles.md)).

## Типы пользователей

| Ключ в коде | Название |
|-------------|----------|
| administrator | Администратор |
| owner | Владелец компании |
| landlord | Хозяин недвижимости |
| investor | Инвестор |
| tenant | Арендатор |
| employee | Сотрудник |
| master | Мастер |

## Маппинг из БД

- `Tenant.type`: admin → administrator, company_owner → owner, property_owner → landlord, staff → employee, tenant/landlord/investor/master — без изменений.
- `User.role`: admin → administrator, staff → employee, tenant/landlord/investor — без изменений.

## Сводная таблица доступа к разделам

| Раздел | Admin | Owner | Landlord | Investor | Tenant | Employee | Master |
|--------|-------|-------|----------|----------|--------|----------|--------|
| Дашборд | ✅ Полный | ✅ Полный | 🔒 Свои | 👁️ Отчёты | 🔒 Личный | 👁️ Рабочий | 🔒 Задачи |
| Договоры | ✅ Все | ✅ Все | 🔒 Свои объекты | 👁️ Свои объекты | 🔒 Свои | ✏️ Все | ❌ |
| Начисления | ✅ Все | ✅ Все | 🔒 Свои объекты | 🔒 Свои объекты | 🔒 Свои | ✏️ Все | ❌ |
| Платежи | ✅ Все | ✅ Все | 🔒 Свои объекты | 🔒 Свои объекты | 🔒 Свои + создание | ✏️ Все | ❌ |
| Депозиты | ✅ Все | ✅ Все | 🔒 Свои объекты | 👁️ Общая сумма | 🔒 Свои | ✏️ Все | ❌ |
| Объекты | ✅ Все | ✅ Все | 🔒 Свои | 🔒 Свои инвестиции | 🔒 Свой | ✏️ Все | 🔒 Для работы |
| Контрагенты | ✅ Все | ✅ Все | 🔒 Свои арендаторы | ❌ | ❌ | ✏️ Все | ❌ |
| Прогноз | ✅ Все | ✅ Все | 🔒 Свои объекты | 👁️ Свои инвестиции | ❌ | 👁️ Все | ❌ |
| Счета | ✅ Все | ✅ Все | ❌ | ❌ | ❌ | ✏️ Все | ❌ |
| Отчёты | ✅ Все | ✅ Все | 🔒 Свои объекты | 🔒 Свои инвестиции | 🔒 История | 👁️ Операционные | ❌ |
| Настройки | ✅ Все | ✏️ Компания | 🔒 Личные | 🔒 Личные | 🔒 Личные | 🔒 Личные | 🔒 Личные |

Легенда: ✅ Полный доступ | ✏️ Редактирование | 👁️ Просмотр | 🔒 Только свои данные | ❌ Нет доступа

## Реализация

- **Backend:** `core/permissions.py` — `SECTION_PERMISSIONS`, `has_permission()`, `get_user_type()`, `get_user_permissions()`.
- **Backend:** `core/decorators.py` — декоратор `@require_permission(section, action)`.
- **Frontend:** `utils/permissions.ts` — матрица, `hasPermission()`, `getAllowedSections()`, `dbTypeToUserType()`.
- **Frontend:** `components/PermissionGuard.tsx` — условный рендеринг по правам.
- **Меню:** `hooks/useUserMenu.ts` — пункты меню фильтруются по `getAllowedSections(userType)`.

## Использование в коде

**Backend (view):**
```python
from core.decorators import require_permission

@require_permission('contracts', 'create')
def create(self, request):
    ...
```

**Frontend (кнопка):**
```tsx
<PermissionGuard section="contracts" action="create">
  <button>Создать договор</button>
</PermissionGuard>
```
