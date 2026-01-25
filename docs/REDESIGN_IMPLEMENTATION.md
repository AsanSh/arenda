# AMT Redesign - Руководство по внедрению

## Структура компонентов

### UI Components (`/components/redesign/ui/`)
- `KPIStatCard.tsx` - Карточки KPI с индикаторами изменения
- `StatusChip.tsx` - Чипы статусов (просрочено, к оплате, оплачено и т.д.)
- `Amount.tsx` - Форматирование денежных сумм
- `Skeleton.tsx` - Состояния загрузки
- `EmptyState.tsx` - Пустое состояние
- `ErrorState.tsx` - Состояние ошибки
- `Toast.tsx` - Уведомления

### Data Components (`/components/redesign/data/`)
- `DataTable.tsx` - Таблица для desktop
- `DataCardList.tsx` - Карточки для mobile
- `ResponsiveDataView.tsx` - Универсальный компонент (автопереключение)

### Layout Components (`/components/redesign/layout/`)
- `AppShell.tsx` - Основная оболочка приложения
- `TopBar.tsx` - Верхняя панель (поиск, уведомления, профиль)
- `SideNav.tsx` - Боковое меню для desktop
- `BottomNav.tsx` - Нижняя навигация для mobile
- `PageHeader.tsx` - Заголовок страницы с действиями

### Example Pages (`/pages/redesign/`)
- `DashboardPageRedesign.tsx` - Пример дашборда
- `AccrualsPageRedesign.tsx` - Пример страницы начислений
- `PaymentsPageRedesign.tsx` - Пример страницы платежей

## Как использовать

### 1. Замена Layout

В `App.tsx` замените старый `Layout` на новый `AppShell`:

```tsx
import { AppShell } from './components/redesign/layout/AppShell';

// Вместо <Layout><DashboardPage /></Layout>
<AppShell>
  <DashboardPage />
</AppShell>
```

### 2. Использование ResponsiveDataView

```tsx
import { ResponsiveDataView } from '../components/redesign/data/ResponsiveDataView';
import { Column } from '../components/redesign/data/DataTable';

const columns: Column<YourType>[] = [
  {
    key: 'name',
    header: 'Название',
    accessor: (row) => row.name,
    sortable: true,
  },
  // ...
];

const toCardData = (row: YourType) => ({
  id: row.id,
  primary: row.name,
  secondary: row.description,
  amount: row.amount,
  status: 'paid',
});

<ResponsiveDataView
  data={yourData}
  columns={columns}
  toCardData={toCardData}
  loading={loading}
  emptyMessage="Нет данных"
/>
```

### 3. Использование PageHeader

```tsx
import { PageHeader } from '../components/redesign/layout/PageHeader';

<PageHeader
  title="Название страницы"
  subtitle="Описание"
  primaryAction={{
    label: 'Создать',
    onClick: () => handleCreate(),
    icon: Plus,
  }}
/>
```

### 4. Использование KPI Cards

```tsx
import { KPIStatCard } from '../components/redesign/ui/KPIStatCard';
import { Amount } from '../components/redesign/ui/Amount';

<div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
  <KPIStatCard
    label="ИТОГО НАЧИСЛЕНО"
    value={<Amount value="2142000" />}
    change={{ value: 12.5, isPositive: false }}
    icon={Calculator}
  />
</div>
```

## Миграция существующих страниц

### Шаг 1: Замените Layout
- Удалите старый `<Layout>`
- Добавьте `<AppShell>` в `App.tsx`

### Шаг 2: Обновите страницы
- Замените таблицы на `ResponsiveDataView`
- Добавьте `PageHeader` вместо обычных заголовков
- Используйте новые UI компоненты (`Amount`, `StatusChip`)

### Шаг 3: Тестирование
- Проверьте на mobile (<768px)
- Проверьте на tablet (768-1024px)
- Проверьте на desktop (>1024px)

## Особенности

### Mobile-First
- Все компоненты сначала разработаны для mobile
- Desktop версии добавляются через media queries
- Автоматическое переключение таблиц → карточек

### Производительность
- Мемоизация через `useMemo`
- Lazy loading для графиков
- Виртуализация для длинных списков (можно добавить react-window)

### Доступность
- Минимальный размер клика 44px
- ARIA labels
- Keyboard navigation
- Контрастность WCAG AA

## Следующие шаги

1. Создать FilterBar/FilterSheet компоненты
2. Добавить виртуализацию для длинных списков
3. Реализовать остальные страницы
4. Добавить графики с lazy loading
5. Оптимизировать производительность
