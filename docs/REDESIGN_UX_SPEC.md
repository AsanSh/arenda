# UI/UX Спецификация AMT Redesign

## Брейкпоинты
```
xs:  360-480px   (mobile small)
sm:  481-768px   (mobile large / tablet portrait)
md:  769-1024px  (tablet / desktop small)
lg:  1025-1440px (desktop)
xl:  >1440px     (desktop large)
```

## Сетка
- **Mobile (xs, sm):** 4 колонки, отступы 16px
- **Tablet (md):** 8 колонок, отступы 24px
- **Desktop (lg, xl):** 12 колонок, отступы 32px
- **Gutter:** 16px на mobile, 24px на tablet/desktop

## Типографика
- **H1:** 20-24px, font-weight: 600-700
- **H2:** 18-20px, font-weight: 600
- **H3:** 16-18px, font-weight: 600
- **Body:** 14-16px, font-weight: 400
- **Caption:** 12-13px, font-weight: 400
- **Small:** 11-12px, font-weight: 400
- **Line-height:** 1.5 для body, 1.4 для заголовков

## Цветовая палитра
- **Primary:** Indigo-600 (#4F46E5)
- **Success:** Green-600 (#16A34A)
- **Warning:** Amber-600 (#D97706)
- **Error:** Red-600 (#DC2626)
- **Info:** Blue-600 (#2563EB)
- **Background:** Slate-50 (#F8FAFC)
- **Surface:** White (#FFFFFF)
- **Text Primary:** Slate-900 (#0F172A)
- **Text Secondary:** Slate-600 (#475569)
- **Border:** Slate-200 (#E2E8F0)

## Компоненты

### AppShell
- **Desktop:** SideNav (240px) + TopBar + Content
- **Mobile:** TopBar + Content + BottomNav
- **Sticky:** TopBar всегда сверху, BottomNav всегда снизу

### TopBar
- **Высота:** 64px (desktop), 56px (mobile)
- **Элементы:** Logo, Search, Notifications, Profile
- **Mobile:** Logo + Search (collapsed) + Menu button

### SideNav (Desktop)
- **Ширина:** 240px (expanded), 64px (collapsed)
- **Группировка:** Финансы, Активы, Коммуникации, Система
- **Иконки:** 20px, отступы 12px
- **Активное состояние:** Indigo-600 background

### BottomNav (Mobile)
- **Высота:** 64px + safe-area
- **Элементы:** 4-5 основных + "Еще"
- **Иконки:** 24px, текст 11px
- **Активное состояние:** Indigo-600 цвет

### PageHeader
- **Высота:** Auto (min 56px)
- **Элементы:** Title, Breadcrumbs (опционально), Actions
- **Mobile:** Title + Actions (collapsed в menu)

### KPIStatCard
- **Размер:** Auto width, min-height 100px
- **Элементы:** Label, Value, Change indicator, Icon
- **Mobile:** Горизонтальный скролл с snap
- **Spacing:** 16px между карточками

### DataTable (Desktop)
- **Sticky header:** Да
- **Сортировка:** Клик по заголовку
- **Выбор:** Checkbox в первой колонке
- **Actions:** Dropdown в последней колонке
- **Hover:** Row highlight

### DataCardList (Mobile)
- **Карточка:** 3 строки (главное, вторичное, статус/сумма)
- **Spacing:** 12px между карточками
- **Actions:** Swipe или контекстное меню
- **Status:** Badge справа вверху

### FilterBar (Desktop)
- **Расположение:** Под PageHeader
- **Элементы:** Search, DateRange, Status, Counterparty, Actions
- **Sticky:** Да (при скролле)

### FilterSheet (Mobile)
- **Тип:** Bottom sheet
- **Высота:** 70vh max
- **Элементы:** Те же что FilterBar, вертикально
- **Actions:** Apply, Reset внизу (sticky)

### StatusChips
- **Размеры:** Small (24px), Medium (32px)
- **Цвета:** 
  - Просрочено: Red-100 bg, Red-700 text
  - К оплате: Amber-100 bg, Amber-700 text
  - Оплачено: Green-100 bg, Green-700 text
  - Новое: Blue-100 bg, Blue-700 text

### Amount
- **Формат:** "100 000 сом" или "100 000 KGS"
- **Разделитель:** Пробел каждые 3 цифры
- **Валюта:** "сом" для KGS, "KGS" для других
- **Размер:** Inherit от родителя

### Skeleton
- **Анимация:** Pulse
- **Цвет:** Slate-200 → Slate-100
- **Варианты:** Text, Card, Table, Chart

### EmptyState
- **Элементы:** Icon, Title, Description, CTA button
- **Центрирование:** Вертикально и горизонтально

### ErrorState
- **Элементы:** Icon, Title, Description, Retry button
- **Центрирование:** Вертикально и горизонтально

## Паттерны

### Таблица → Карточки
- **Триггер:** <768px
- **Автоматическое переключение:** DataTable компонент
- **Сохранение:** Сортировка и фильтры

### Фильтры → Bottom Sheet
- **Триггер:** <768px
- **Открытие:** Кнопка "Фильтры" в PageHeader
- **Синхронизация:** State + URL query params

### Bulk Actions
- **Desktop:** Checkbox selection + toolbar
- **Mobile:** Long-press для выбора, контекстное меню

### FAB (Floating Action Button)
- **Расположение:** Правый нижний угол (mobile)
- **Размер:** 56px
- **Safe-area:** Отступ от края
- **Видимость:** Только на страницах с созданием

### Sticky Summary
- **Desktop:** Sticky сверху при скролле
- **Mobile:** Collapsible секция
- **Элементы:** Итоги, суммы, счетчики

## Навигация

### Desktop структура
```
Финансы:
  - Счета
  - Депозиты
  - Начисления
  - Поступления
  - Отчет

Активы/Сущности:
  - Недвижимость
  - Контрагенты
  - Договоры

Коммуникации:
  - Рассылки
  - Заявки

Система:
  - Настройки
  - Помощь
  - Профиль
```

### Mobile структура
```
BottomNav:
  - Дашборд
  - Финансы (dropdown)
  - Активы (dropdown)
  - Заявки
  - Еще (sheet с остальными)
```

## Состояния

### Loading
- **Skeleton:** Для контента
- **Spinner:** Для действий
- **Progress:** Для длительных операций

### Empty
- **Icon:** Соответствующий контексту
- **Message:** Понятное объяснение
- **CTA:** Действие для заполнения

### Error
- **Icon:** Alert
- **Message:** Описание ошибки
- **Action:** Retry или альтернатива

### Success
- **Toast:** Временное уведомление
- **Duration:** 3-5 секунд
- **Position:** Top-right (desktop), Top-center (mobile)

## Форматирование

### Деньги
- **Формат:** `Intl.NumberFormat('ru-RU')`
- **Валюта:** "сом" для KGS
- **Пример:** "2 142 000 сом"

### Даты
- **Формат:** `Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })`
- **Пример:** "25.01.2026"

### Числа
- **Разделитель:** Пробел каждые 3 цифры
- **Пример:** "1 942 000"
