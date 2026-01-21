# AMT - Система управления арендой недвижимости

## Архитектура

Проект состоит из трех приложений:

1. **backend/** - Django + DRF API + PostgreSQL
2. **admin-frontend/** - React + TypeScript + Tailwind (админ-панель)
3. **client-frontend/** - React + TypeScript + Tailwind (личный кабинет арендатора) - в разработке
4. **infra/** - Docker Compose конфигурация

## Быстрый старт

### Требования
- Docker и Docker Compose
- Node.js 18+ (для локальной разработки frontend)

### Запуск через Docker

```bash
cd infra
docker-compose up -d
```

После запуска:
- Backend API: http://localhost:8000/api/
- Admin Frontend: http://localhost:3000
- Admin панель Django: http://localhost:8000/admin/

### Первоначальная настройка

1. Создать миграции и применить их:
```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

2. Создать суперпользователя:
```bash
docker-compose exec backend python manage.py createsuperuser
```

3. (Опционально) Загрузить тестовые данные

## Структура проекта

### Backend (Django)

Модули:
- `core/` - Пользователи, арендаторы
- `properties/` - Объекты недвижимости
- `contracts/` - Договоры аренды
- `accruals/` - Начисления
- `payments/` - Поступления и распределение платежей
- `deposits/` - Депозиты
- `account/` - Счёт и расходы
- `forecast/` - Прогноз поступлений

### Admin Frontend (React)

Страницы:
- `/properties` - Управление объектами недвижимости
- `/contracts` - Управление договорами
- `/accruals` - Просмотр начислений
- `/payments` - Просмотр поступлений
- `/deposits` - Управление депозитами
- `/account` - Счёт и баланс
- `/forecast` - Прогноз поступлений

## Этапы реализации

- ✅ **Этап 1**: Недвижимость, Договоры, Начисления, Поступления, Прогноз
- ⏳ **Этап 2**: Депозит, Аванс, Спецусловия (частично реализовано)
- ⏳ **Этап 3**: Допусловия (ContractAddon)
- ⏳ **Этап 4**: Услуги и коммуналка
- ⏳ **Этап 5**: Выплаты и P&L (частично реализовано)
- ⏳ **Этап 6**: Уведомления, задачи, календарь

## Основные функции (Этап 1)

### Недвижимость
- Создание и редактирование объектов
- Типы: офис, магазин, медкабинет, квартира, склад, прочее
- Статусы: свободен, сдан, бронь, неактивен

### Договоры
- Автогенерация номера договора (AMT-YYYY-XXXXXX)
- Настройка депозита и аванса
- Автоматическая генерация начислений при создании

### Начисления
- Автоматическая генерация по периодам
- Статусы: ожидает, к оплате, просрочено, частично оплачено, оплачено
- Автоматический пересчет при оплате

### Поступления
- Фиксация платежей
- Автоматическое распределение по начислениям (FIFO)
- Поддержка частичной оплаты и переплаты

### Прогноз
- Расчет ожидаемых поступлений
- Группировка по месяцам
- Учет просроченных начислений

## API Endpoints

- `GET /api/properties/` - Список объектов
- `POST /api/properties/` - Создать объект
- `GET /api/contracts/` - Список договоров
- `POST /api/contracts/` - Создать договор (автогенерация начислений)
- `GET /api/accruals/` - Список начислений
- `GET /api/payments/` - Список поступлений
- `POST /api/payments/` - Создать поступление (автораспределение)
- `GET /api/forecast/calculate/` - Расчет прогноза

## Разработка

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # или venv\Scripts\activate на Windows
pip install -r requirements.txt
python manage.py runserver
```

### Frontend
```bash
cd admin-frontend
npm install
npm start
```

## Лицензия

Проект в разработке.
