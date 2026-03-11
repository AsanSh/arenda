# POINT F — Периоды скидок, доп. контакты, технический аудит

**Дата создания:** 11 марта 2026  
**Статус:** ✅ Работоспособная версия  
**Домен:** https://assetmanagement.team  
**Буква по счёту:** F (6-я точка восстановления: A, B, C, D, E, **F**)  
**Git tag:** `point-f`

***

## Что добавлено / изменено с POINT E

### Договоры — периоды скидок (discount_periods)
- Модель `ContractDiscountPeriod`: start_date, end_date, discount_percent, reason, summary
- Миграция `contracts/0006_add_discount_period.py`
- API: сериализация/десериализация discount_periods в Contract
- Форма договора: добавление/редактирование периодов скидок (ContractForm, ContractDetailPage)

### Контрагенты — дополнительные контакты
- Поле `Tenant.additional_contacts` (JSONField) для нескольких контактов
- Миграция `core/0013_add_tenant_additional_contacts.py`
- TenantForm: кнопка + для добавления доп. контактов

### Backend
- accruals/services.py: правки логики
- contracts: admin, models, serializers, services, views — поддержка discount_periods
- core: models, serializers — additional_contacts

### Frontend
- ContractForm, ContractDetailPage: периоды скидок
- TenantForm: дополнительные контакты
- AccrualsPage, ContractsPage, PropertiesPage, TenantsPage: мелкие правки

### Документация
- docs/PROJECT_AUDIT.md
- docs/TECHNICAL_AUDIT_FULL.md — полный технический аудит (структура, роуты, deploy, причины «изменения не отражаются»)

***

## Восстановление POINT F

### Git
```bash
cd /root/arenda
git fetch origin
git checkout point-f
```

### Распаковка ZIP (если восстанавливаете из архива)
```bash
cd /root
unzip arenda-point-f-20260311.zip -d arenda
cd arenda
```

### Инициализация (после распаковки)
```bash
# Установка зависимостей frontend
cd admin-frontend && npm install --legacy-peer-deps && cd ..

# Запуск через Docker
cd infra
docker compose up -d db
sleep 5
docker compose up -d backend
docker compose up -d admin-frontend
```

### Деплой на production
```bash
cd /root/arenda
./infra/deploy.sh
```

### Проверка
- [ ] Договор: добавление периодов скидок
- [ ] Контрагент: дополнительные контакты (кнопка +)
- [ ] Загрузка/скачивание PDF в договоре
- [ ] Удаление недвижимости

***

## Структура проекта (без изменений)

| Компонент | Путь | Порт |
|-----------|------|------|
| Frontend | admin-frontend/ | 3000 (dev) |
| Backend | backend/ | 8000 |
| DB | postgres:15 | 5432 |
| Production static | /var/www/assetmanagement.team | nginx |

***

## ZIP-архив

**Файл:** `/root/arenda/arenda-point-f-20260311.zip` (~77 MB)

**Содержит:** весь проект (без node_modules, __pycache__, venv, .git, build, backend/media).

**Запуск на сервере из ZIP:**
```bash
cd /root
unzip arenda-point-f-20260311.zip -d arenda
cd arenda
cd admin-frontend && npm install --legacy-peer-deps && cd ..
cd infra && docker compose up -d
cd .. && ./infra/deploy.sh   # для production (nginx + /var/www)
```
