# AMT (Asset Management Team) — Cursor AI Rules & Conventions

Ты — AI-ассистент, который помогает развивать **AMT** — систему управления арендой недвижимости
(Django REST Framework + React + TypeScript).

**ЭТИ ПРАВИЛА ОБЯЗАТЕЛЬНЫ** при генерации, рефакторинге и анализе кода.
Если есть сомнение — следуй этому документу, а не "общим best practices".

---

## 🎯 1. ОБЩИЕ ПРИНЦИПЫ

**Цель:**
Читаемый, масштабируемый код с чётким разделением доменной логики.

**Философия:**

* Код пишется **для людей**
* Явные имена > сокращения
* DRY, но без overengineering
* Бизнес-логика **НИКОГДА** не живёт во views, serializers или React-компонентах

**Важно:**
Этот документ — **живой**. Подробная версия хранится в `docs/conventions/`.

---

## 📂 2. СТРУКТУРА ПРОЕКТА

### Backend — Django REST API

/backend/

* **core/**        — User, Tenant (контрагенты), auth (login/logout), WhatsApp OTP (services.py ✅)
* **account/**     — ресурс account (личный счёт/профиль)
* **accounts/**    — бухгалтерские счета (services.py ✅)
* **accruals/**    — начисления (services.py ✅)
* **amt/**         — settings, urls
* **contracts/**   — договоры аренды (**services.py обязателен**)
* **dashboard/**   — аналитика
* **deposits/**    — депозиты (**services.py обязателен**)
* **forecast/**    — прогнозирование
* **notifications/** — уведомления (services.py ✅)
* **payments/**    — платежи (services.py ✅)
* **properties/**  — объекты недвижимости
* **reports/**     — отчёты
* **tests/**       — unit + integration тесты

---

### Frontend — React + TypeScript

/admin-frontend/src/

* **api/**         — API клиент (axios)
* **components/**
  * **redesign/**  — **НОВЫЕ компоненты (использовать!)**
* **pages/**
  * **redesign/**  — **НОВЫЕ страницы (использовать!)**
* **hooks/**       — кастомные хуки
* **contexts/**    — auth, theme
* **types/**       — TypeScript типы доменных сущностей
* **utils/**       — утилиты

❗ Компоненты вне `redesign/` считаются **DEPRECATED**.

---

## 🧠 3. ДОМЕННАЯ МОДЕЛЬ (СТРОГО)

Используй **ТОЛЬКО** эти термины:

| Русский        | English  | Backend             | Frontend |
| -------------- | -------- | ------------------- | -------- |
| Договор аренды | Contract | contracts.Contract  | Contract |
| Недвижимость   | Property | properties.Property | Property |
| Арендатор      | Tenant   | core.Tenant         | Tenant   |
| Арендодатель   | Landlord | core.Tenant (type=landlord) | Tenant   |
| Начисление     | Accrual  | accruals.Accrual    | Accrual  |
| Платёж         | Payment  | payments.Payment    | Payment  |
| Счёт           | Account  | accounts.Account    | Account  |
| Депозит        | Deposit  | deposits.Deposit    | Deposit  |

**ЗАПРЕЩЕНО:**

* Agreement / Lease → ❌ вместо Contract
* Customer / Client → ❌ вместо Tenant
* Charge / Invoice → ❌ вместо Accrual
* Transaction → ❌ вместо Payment

**Импорты:**

* `Tenant` — **ТОЛЬКО** из `core.models`
* `Property` — **ТОЛЬКО** из `properties.models`

---

## 🐍 4. BACKEND (Django REST Framework)

### Стиль

* PEP8
* Black (`line-length = 100`)
* isort (`profile = black`)
* ruff или flake8
* type hints — **обязательны**
* Деньги → `Decimal`, НЕ `float`

---

### Архитектура (КРИТИЧНО)

**models.py**

* только поля, связи, Meta
* без бизнес-логики

**serializers.py**

* только валидация и сериализация
* ❌ без бизнес-логики

**views.py / viewsets**

* HTTP, permissions, response
* ❌ без бизнес-логики

### services.py — ОБЯЗАТЕЛЕН

Вся бизнес-логика живёт здесь.

Пример:

```python
class ContractService:
    @staticmethod
    @transaction.atomic
    def activate_contract(contract_id: int) -> Contract:
        """
        Активация договора с генерацией начислений
        """
        ...
```

---

### API

* Base: `/api/` (в проекте без v1)
* REST + custom actions

Примеры:

* `/api/contracts/{id}/`
* `/api/accruals/?contract={id}`

**Ошибки — с кодами:**

```json
{
  "code": "CONTRACT_NOT_FOUND",
  "message": "Договор не найден",
  "details": {}
}
```

---

### Тестирование

* pytest + pytest-django
* coverage ≥ **80%**
* тесты в `tests/` или в app в `tests.py` / `tests/`
* имена: `test_contract_activation_creates_accruals`

---

## ⚛️ 5. FRONTEND (React + TypeScript)

### Стиль

* ESLint + Prettier
* Components → PascalCase
* hooks → camelCase
* абсолютные импорты из `src/`

---

### Типы

Для каждой доменной сущности — TS interface
Decimal → `string`
Дата → ISO string

---

### API слой

НЕ использовать общие `fetch/load/save`.

Только явные функции:

* `getContract`
* `createPayment`
* `updateAccrual`

---

### Hooks

* данные + loading + error
* без бизнес-расчётов

---

### UI (финтех-стиль)

* Карточки KPI, чёткая сетка, доминирующие денежные метрики
* Чёткая типографика (12/14/16/20/32/40), суммы крупно и жирно
* Цвета: позитив/нейтрал — green/blue; риск — orange/red
* Tailwind; фон светлый нейтральный, карточки белые с тенью и скруглением 16–20px
* **Полная спецификация дашборда:** `docs/conventions/dashboard-design.md`

---

### Тесты

* React Testing Library
* тестировать поведение пользователя

---

## 🔀 6. GIT WORKFLOW

### Ветки

* main
* develop
* feature/*
* bugfix/*
* hotfix/*

---

### Коммиты — Conventional Commits

```
feat(contracts): добавить активацию договора
fix(payments): исправлен расчёт остатка
refactor(accruals): логика вынесена в services
docs: обновлён README
```

---

## 📚 7. ДОКУМЕНТАЦИЯ

Обязательно:

* README.md
* CONTRIBUTING.md
* docs/conventions/

Каждый крупный каталог — с README.md.

---

## ✅ 8. ЧЕКЛИСТ ПЕРЕД КОММИТОМ

Backend:

* services.py используется
* type hints есть
* тесты есть

Frontend:

* redesign компоненты
* типы определены
* тесты есть

Общее:

* Conventional Commit
* документация обновлена

---

## 🚀 PROMPT ДЛЯ МАССОВОГО РЕФАКТОРИНГА

Проект: AMT (Django + React)

Задача:

* Вынести бизнес-логику в services.py
* Добавить type hints
* Привести код к доменным терминам
* Использовать redesign компоненты
* Добавить тесты (coverage ≥ 80%)
* Обновить документацию

Готовь аккуратные PR с описанием изменений.

---

**Напоминание:**
Contract, Accrual, Payment, Tenant — не изобретай новые сущности.
services.py — единственное место для бизнес-логики.
