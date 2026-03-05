import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { DatePreset, getPresetRange, detectPreset, formatDateRange } from '../utils/datePresets';

interface PeriodFilterBarProps {
  value?: { preset?: DatePreset | null; from?: string | null; to?: string | null };
  onChange?: (value: { preset: DatePreset | null; from: string | null; to: string | null }) => void;
  allowFuture?: boolean;
  urlParamPrefix?: string; // Префикс для URL параметров (например, 'due_date', 'payment_date')
}

const PRESETS: Array<{ value: DatePreset; label: string }> = [
  { value: 'today_plus_7', label: 'Сегодня ± 7 дней' },
  { value: 'today_plus_30', label: 'Сегодня ± 30 дней' },
  { value: 'current_week', label: 'Текущая неделя' },
  { value: 'current_month', label: 'Текущий месяц' },
  { value: 'current_quarter', label: 'Текущий квартал' },
  { value: 'current_year', label: 'Текущий год' },
  { value: 'last_week', label: 'Прошлая неделя' },
  { value: 'last_month', label: 'Прошлый месяц' },
  { value: 'last_quarter', label: 'Прошлый квартал' },
  { value: 'last_year', label: 'Прошлый год' },
  { value: 'all_time', label: 'Все время' },
];

const DROPDOWN_WIDTH = 320;
const DROPDOWN_MARGIN = 8;

export default function PeriodFilterBar({ 
  value, 
  onChange, 
  allowFuture = false,
  urlParamPrefix = 'date'
}: PeriodFilterBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const presetsRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  // Инициализация из URL или props
  const [preset, setPreset] = useState<DatePreset | null>(() => {
    if (value?.preset) return value.preset;
    const urlPreset = searchParams.get(`${urlParamPrefix}_preset`);
    if (urlPreset) return urlPreset as DatePreset;
    return null;
  });
  
  const [from, setFrom] = useState<string | null>(() => {
    if (value?.from !== undefined) return value.from;
    return searchParams.get(`${urlParamPrefix}_from`);
  });
  
  const [to, setTo] = useState<string | null>(() => {
    if (value?.to !== undefined) return value.to;
    return searchParams.get(`${urlParamPrefix}_to`);
  });

  // При открытии — считаем позицию выпадающего блока (fixed), чтобы он всегда был в пределах экрана
  useEffect(() => {
    if (!isPresetsOpen || !buttonRef.current || typeof window === 'undefined') return;
    const rect = buttonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = rect.left;
    let width = DROPDOWN_WIDTH;
    if (rect.left + width > vw - DROPDOWN_MARGIN) {
      left = vw - width - DROPDOWN_MARGIN;
    }
    if (left < DROPDOWN_MARGIN) {
      left = DROPDOWN_MARGIN;
      width = vw - DROPDOWN_MARGIN * 2;
    }
    const top = rect.bottom + 4;
    const maxHeight = vh - top - DROPDOWN_MARGIN;
    setDropdownPosition({ top, left, width });
  }, [isPresetsOpen]);

  // Закрытие при клике вне компонента (кнопка или выпадающий блок)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target)) return;
      const dropdownEl = document.getElementById('period-filter-dropdown');
      if (dropdownEl?.contains(target)) return;
      setIsPresetsOpen(false);
    };

    if (isPresetsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPresetsOpen]);

  // Синхронизация с URL
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    
    if (preset && preset !== 'custom' && preset !== 'all_time') {
      newParams.set(`${urlParamPrefix}_preset`, preset);
      const range = getPresetRange(preset);
      if (range.from) newParams.set(`${urlParamPrefix}_from`, range.from);
      if (range.to) newParams.set(`${urlParamPrefix}_to`, range.to);
    } else if (preset === 'custom' || (!preset && (from || to))) {
      newParams.delete(`${urlParamPrefix}_preset`);
      if (from) newParams.set(`${urlParamPrefix}_from`, from);
      else newParams.delete(`${urlParamPrefix}_from`);
      if (to) newParams.set(`${urlParamPrefix}_to`, to);
      else newParams.delete(`${urlParamPrefix}_to`);
    } else if (preset === 'all_time') {
      newParams.delete(`${urlParamPrefix}_preset`);
      newParams.delete(`${urlParamPrefix}_from`);
      newParams.delete(`${urlParamPrefix}_to`);
    } else {
      newParams.delete(`${urlParamPrefix}_preset`);
      newParams.delete(`${urlParamPrefix}_from`);
      newParams.delete(`${urlParamPrefix}_to`);
    }
    
    setSearchParams(newParams, { replace: true });
  }, [preset, from, to, urlParamPrefix]);

  // Уведомление родителя об изменении (только если значения действительно изменились)
  const prevValuesRef = useRef<{ preset: DatePreset | null; from: string | null; to: string | null }>({ preset, from, to });
  
  useEffect(() => {
    const prev = prevValuesRef.current;
    // Проверяем, действительно ли изменились значения
    if (
      prev.preset !== preset ||
      prev.from !== from ||
      prev.to !== to
    ) {
      prevValuesRef.current = { preset, from, to };
      if (onChange) {
        onChange({ preset, from, to });
      }
    }
  }, [preset, from, to, onChange]);

  const handlePresetClick = (selectedPreset: DatePreset) => {
    if (selectedPreset === 'all_time') {
      setPreset('all_time');
      setFrom(null);
      setTo(null);
    } else {
      setPreset(selectedPreset);
      const range = getPresetRange(selectedPreset);
      setFrom(range.from);
      setTo(range.to);
    }
    setIsPresetsOpen(false);
  };

  const getButtonLabel = () => {
    if (preset && preset !== 'custom' && preset !== 'all_time') {
      const presetObj = PRESETS.find(p => p.value === preset);
      return presetObj ? presetObj.label : 'Период';
    }
    if (preset === 'all_time') {
      return 'Все время';
    }
    if (from || to) {
      return 'Период';
    }
    return 'Период';
  };

  const handleFromChange = (newFrom: string) => {
    setFrom(newFrom || null);
    // Если даты не совпадают с пресетом, переключаемся на custom
    const detected = detectPreset(newFrom || null, to);
    if (detected === 'custom' || !detected) {
      setPreset('custom');
    } else {
      setPreset(detected);
    }
  };

  const handleToChange = (newTo: string) => {
    setTo(newTo || null);
    // Если даты не совпадают с пресетом, переключаемся на custom
    const detected = detectPreset(from, newTo || null);
    if (detected === 'custom' || !detected) {
      setPreset('custom');
    } else {
      setPreset(detected);
    }
  };

  return (
    <div className="relative inline-block" ref={presetsRef}>
      {/* Кнопка для открытия пресетов */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsPresetsOpen(!isPresetsOpen)}
        className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
          preset && preset !== 'custom' && preset !== 'all_time'
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
        }`}
      >
        {getButtonLabel()}
      </button>

      {/* Выпадающее меню через портал — рендер в body, position: fixed, чтобы не обрезалось родителями */}
      {isPresetsOpen && dropdownPosition && typeof document !== 'undefined' && createPortal(
        <div
          id="period-filter-dropdown"
          className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-[9999]"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            maxHeight: 'calc(100vh - ' + (dropdownPosition.top + DROPDOWN_MARGIN) + 'px)',
            overflowY: 'auto',
          }}
        >
          {/* Кастомный диапазон дат */}
          <div className="mb-3 pb-3 border-b border-gray-200">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Период</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from || ''}
                onChange={(e) => handleFromChange(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 flex-1 min-w-0"
              />
              <span className="text-xs text-gray-500 shrink-0">-</span>
              <input
                type="date"
                value={to || ''}
                onChange={(e) => handleToChange(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 flex-1 min-w-0"
              />
            </div>
          </div>

          {/* Чипы пресетов */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => {
              const isActive = preset === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => handlePresetClick(p.value)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-white border border-primary-500 text-primary-700 shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-transparent'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
