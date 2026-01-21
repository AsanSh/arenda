import React, { useState, useEffect, useRef } from 'react';
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

export default function PeriodFilterBar({ 
  value, 
  onChange, 
  allowFuture = false,
  urlParamPrefix = 'date'
}: PeriodFilterBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);
  
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

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(event.target as Node)) {
        setIsPresetsOpen(false);
      }
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

      {/* Выпадающее меню с чипами пресетов */}
      {isPresetsOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 min-w-[320px]">
          {/* Кастомный диапазон дат */}
          <div className="mb-3 pb-3 border-b border-gray-200">
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Период</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={from || ''}
                onChange={(e) => handleFromChange(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 flex-1"
              />
              <span className="text-xs text-gray-500">-</span>
              <input
                type="date"
                value={to || ''}
                onChange={(e) => handleToChange(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 flex-1"
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
        </div>
      )}
    </div>
  );
}
