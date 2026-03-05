# Конвенции Frontend (React + TypeScript)

## Стиль

- ESLint + Prettier
- Компоненты — PascalCase, хуки — camelCase
- Предпочтительно абсолютные импорты из `src/` (настраивается в tsconfig)

## Типы (`src/types/`)

- Для каждой доменной сущности — отдельный файл с TS interface
- Decimal из API — тип `string`
- Даты — ISO string (`string`)
- Экспорт всех доменных типов из `src/types/index.ts`

Использовать типы из `src/types`, не дублировать интерфейсы в страницах/компонентах.

## API-слой (`src/api/`)

- Базовый HTTP-клиент — `src/api/client.ts` (axios)
- Явные функции по доменам в отдельных модулях:
  - `api/contracts.ts` — fetchContractList, fetchContract, createContract, updateContract, deleteContract, endContract, generateAccruals
  - `api/accruals.ts` — fetchAccrualList, fetchAccrual, createAccrual, updateAccrual, deleteAccrual, acceptAccrual, bulkUpdate, bulkDelete, bulkAccept и т.д.
  - `api/payments.ts` — fetchPaymentList, fetchPayment, createPayment, updatePayment, deletePayment, returnPayment

Не использовать общие имена вида `fetch/load/save` без указания сущности. Импорт: из `api/client` для axios-клиента, из `api` или `api/contracts` и т.д. для доменных функций.

## Страницы и маршруты

- Единая страница входа — **LoginPage** (`/login`): вкладки «Логин/Пароль» и «WhatsApp» (OTP). Отдельные LoginPageNew, LoginPageOTP в роутинг не входят (legacy, см. [audit-pages-routes.md](./audit-pages-routes.md)).
- Прогноз — только внутри раздела **Отчет** (`/reports`, таб «Прогноз»). В боковом меню отдельного пункта «Прогноз» нет. URL `/forecast` редиректит на `/reports?type=forecast`.
- Не дублировать функциональность двумя разными страницами в роутинге; при добавлении новой страницы проверять [audit-pages-routes.md](./audit-pages-routes.md).

## Компоненты

- Новые компоненты — в `components/` (layout, ui, data)
- Страницы — в `pages/`; новые/переработанные заменяют старые в `pages/` или добавляются явно в `App.tsx`

## Хуки

- Данные + loading + error
- Без бизнес-расчётов (расчёты в utils или на бэкенде)

## UI (финтех-стиль)

- Карточки KPI, чёткая типографика
- Цвета: позитив — green, риск — orange/red
- Tailwind

## Тестирование

- React Testing Library
- Тестировать поведение пользователя
