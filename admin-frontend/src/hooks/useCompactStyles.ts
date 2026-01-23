import { useDensity } from '../contexts/DensityContext';

/**
 * Хук для получения стилей компактного режима
 * Enterprise UI/UX - высокая плотность информации
 */
export function useCompactStyles() {
  const { isCompact } = useDensity();

  return {
    // === ТАБЛИЦЫ ===
    // Ячейки таблиц
    cellPadding: isCompact ? 'px-2 py-1' : 'px-3 py-1.5',
    // Заголовки таблиц
    headerPadding: isCompact ? 'px-2 py-1.5' : 'px-3 py-2',
    // Высота строк таблиц
    rowHeight: isCompact ? 'h-9' : 'h-10', // 36px / 40px
    // Размер текста в таблицах
    tableText: isCompact ? 'text-xs' : 'text-sm',
    headerText: isCompact ? 'text-xs font-medium' : 'text-sm font-medium',
    
    // === ТИПОГРАФИКА ===
    // Базовый размер текста
    textSize: isCompact ? 'text-xs' : 'text-sm', // 12px / 14px
    // Заголовки секций
    sectionHeader: isCompact ? 'text-sm font-semibold' : 'text-base font-semibold', // 14px / 16px
    // KPI числа
    kpiNumber: isCompact ? 'text-lg font-semibold' : 'text-xl font-semibold', // 18px / 20px
    // Малый текст
    smallText: isCompact ? 'text-[10px]' : 'text-xs', // 10px / 12px
    
    // === ИКОНКИ ===
    iconSize: isCompact ? 'h-4 w-4' : 'h-4 w-4', // 16px
    iconSizeSmall: isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5', // 12px / 14px
    iconSizeLarge: isCompact ? 'h-5 w-5' : 'h-6 w-6', // 20px / 24px
    
    // === ОТСТУПЫ ===
    // Компактные отступы
    gap: isCompact ? 'gap-2' : 'gap-3', // 8px / 12px
    gapSmall: isCompact ? 'gap-1' : 'gap-2', // 4px / 8px
    gapLarge: isCompact ? 'gap-3' : 'gap-4', // 12px / 16px
    
    // Padding для карточек
    cardPadding: isCompact ? 'p-3' : 'p-4', // 12px / 16px
    cardPaddingSmall: isCompact ? 'p-2' : 'p-3', // 8px / 12px
    
    // === КОМПОНЕНТЫ ===
    // Кнопки
    buttonPadding: isCompact ? 'px-2.5 py-1' : 'px-3 py-1.5',
    buttonText: isCompact ? 'text-xs' : 'text-sm',
    
    // Sidebar элементы
    sidebarItemHeight: isCompact ? 'h-9' : 'h-10', // 36px / 40px
    sidebarItemPadding: isCompact ? 'px-2 py-1.5' : 'px-3 py-2',
    sidebarIconSize: isCompact ? 'h-4 w-4' : 'h-4 w-4',
    sidebarText: isCompact ? 'text-xs' : 'text-sm',
    
    // KPI карточки
    kpiCardHeight: isCompact ? 'h-[70px]' : 'h-[90px]',
    kpiCardPadding: isCompact ? 'p-2.5' : 'p-3',
    
    // Компактный режим
    isCompact,
  };
}
