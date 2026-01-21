/**
 * Helper для вычисления диапазонов дат по пресетам
 */

export type DatePreset = 
  | 'today'
  | 'yesterday'
  | 'today_plus_7'
  | 'today_plus_30'
  | 'current_week'
  | 'current_month'
  | 'current_quarter'
  | 'current_year'
  | 'last_week'
  | 'last_month'
  | 'last_quarter'
  | 'last_year'
  | 'all_time'
  | 'custom';

export interface DateRange {
  from: string | null;
  to: string | null;
}

/**
 * Вычисляет диапазон дат для заданного пресета
 */
export function getPresetRange(preset: DatePreset | null, timezone: string = 'Asia/Bishkek'): DateRange {
  const now = new Date();
  
  // Конвертируем в локальное время (Asia/Bishkek = UTC+6)
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  switch (preset) {
    case 'today': {
      const today = new Date(localDate);
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      return { from: todayStr, to: todayStr };
    }
    
    case 'yesterday': {
      const yesterday = new Date(localDate);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      return { from: yesterdayStr, to: yesterdayStr };
    }
    
    case 'today_plus_7': {
      const from = new Date(localDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 7);
      return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
    }
    
    case 'today_plus_30': {
      const from = new Date(localDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(from);
      to.setDate(to.getDate() + 30);
      return { from: from.toISOString().split('T')[0], to: to.toISOString().split('T')[0] };
    }
    
    case 'current_week': {
      const monday = new Date(localDate);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1); // Понедельник
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: monday.toISOString().split('T')[0], to: sunday.toISOString().split('T')[0] };
    }
    
    case 'current_month': {
      const firstDay = new Date(localDate.getFullYear(), localDate.getMonth(), 1);
      const lastDay = new Date(localDate.getFullYear(), localDate.getMonth() + 1, 0);
      return { from: firstDay.toISOString().split('T')[0], to: lastDay.toISOString().split('T')[0] };
    }
    
    case 'current_quarter': {
      const quarter = Math.floor(localDate.getMonth() / 3);
      const firstDay = new Date(localDate.getFullYear(), quarter * 3, 1);
      const lastDay = new Date(localDate.getFullYear(), (quarter + 1) * 3, 0);
      return { from: firstDay.toISOString().split('T')[0], to: lastDay.toISOString().split('T')[0] };
    }
    
    case 'current_year': {
      const firstDay = new Date(localDate.getFullYear(), 0, 1);
      const lastDay = new Date(localDate.getFullYear(), 11, 31);
      return { from: firstDay.toISOString().split('T')[0], to: lastDay.toISOString().split('T')[0] };
    }
    
    case 'last_week': {
      const monday = new Date(localDate);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff - 7); // Прошлая неделя
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: monday.toISOString().split('T')[0], to: sunday.toISOString().split('T')[0] };
    }
    
    case 'last_month': {
      const firstDay = new Date(localDate.getFullYear(), localDate.getMonth() - 1, 1);
      const lastDay = new Date(localDate.getFullYear(), localDate.getMonth(), 0);
      return { from: firstDay.toISOString().split('T')[0], to: lastDay.toISOString().split('T')[0] };
    }
    
    case 'last_quarter': {
      const quarter = Math.floor(localDate.getMonth() / 3);
      const lastQuarter = quarter === 0 ? 3 : quarter - 1;
      const year = lastQuarter === 3 ? localDate.getFullYear() - 1 : localDate.getFullYear();
      const firstDay = new Date(year, lastQuarter * 3, 1);
      const lastDay = new Date(year, (lastQuarter + 1) * 3, 0);
      return { from: firstDay.toISOString().split('T')[0], to: lastDay.toISOString().split('T')[0] };
    }
    
    case 'last_year': {
      const firstDay = new Date(localDate.getFullYear() - 1, 0, 1);
      const lastDay = new Date(localDate.getFullYear() - 1, 11, 31);
      return { from: firstDay.toISOString().split('T')[0], to: lastDay.toISOString().split('T')[0] };
    }
    
    case 'all_time':
    case null:
      return { from: null, to: null };
    
    case 'custom':
    default:
      return { from: null, to: null };
  }
}

/**
 * Определяет пресет по диапазону дат
 */
export function detectPreset(from: string | null, to: string | null): DatePreset | null {
  if (!from || !to) return 'all_time';
  
  const range = getPresetRange('today');
  if (from === range.from && to === range.to) return 'today';
  
  const yesterdayRange = getPresetRange('yesterday');
  if (from === yesterdayRange.from && to === yesterdayRange.to) return 'yesterday';
  
  const weekRange = getPresetRange('current_week');
  if (from === weekRange.from && to === weekRange.to) return 'current_week';
  
  const monthRange = getPresetRange('current_month');
  if (from === monthRange.from && to === monthRange.to) return 'current_month';
  
  const quarterRange = getPresetRange('current_quarter');
  if (from === quarterRange.from && to === quarterRange.to) return 'current_quarter';
  
  const yearRange = getPresetRange('current_year');
  if (from === yearRange.from && to === yearRange.to) return 'current_year';
  
  return 'custom';
}

/**
 * Форматирует дату для отображения
 */
export function formatDateRange(from: string | null, to: string | null): string {
  if (!from || !to) return '';
  const fromDate = new Date(from);
  const toDate = new Date(to);
  return `${fromDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })} - ${toDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
}
