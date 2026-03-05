# Конвенции Backend (Django REST Framework)

## Стиль

- **PEP8**, Black (`line-length = 100`), isort (`profile = black`)
- Ruff или flake8 для линтинга
- Type hints — **обязательны**
- Деньги — только `Decimal`, не `float`

## Структура приложения

- **models.py** — только поля, связи, Meta; без бизнес-логики
- **serializers.py** — только валидация и сериализация; без бизнес-логики
- **views.py / viewsets** — HTTP, permissions, ответы; без бизнес-логики
- **services.py** — **обязателен** для приложений с нетривиальной логикой; вся бизнес-логика здесь

## services.py

Вся бизнес-логика (активация договора, генерация начислений, распределение платежей, удаление каскадом и т.д.) живёт в `services.py` в виде классов с статическими методами или функций. Views только вызывают сервисы.

Пример:

```python
class ContractService:
    @staticmethod
    @transaction.atomic
    def activate_contract(contract_id: int) -> Contract:
        """Активация договора с генерацией начислений."""
        ...
```

## API

- Базовый префикс: `/api/`
- REST + custom actions
- Примеры: `/api/contracts/{id}/`, `/api/accruals/?contract__tenant={id}`

Ошибки — с кодами:

```json
{
  "code": "CONTRACT_NOT_FOUND",
  "message": "Договор не найден",
  "details": {}
}
```

## Доменная модель

- **Contract** — `contracts.models`
- **Accrual** — `accruals.models`
- **Payment** — `payments.models`
- **Tenant** (контрагент) — только `core.models`
- **Property** — только `properties.models`

## Тестирование

- pytest + pytest-django
- Покрытие ≥ 80%
- Тесты в `tests/` или в приложении в `tests.py` / `tests/`
- Имена: `test_contract_activation_creates_accruals`
