import React, { useState, useMemo } from 'react';

interface Counterparty {
  id: number;
  name: string;
}

interface CounterpartyFilterProps {
  counterparts: Counterparty[];
  selected: number[];
  onChange: (selected: number[]) => void;
}

export default function CounterpartyFilter({ counterparts, selected, onChange }: CounterpartyFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCounterparts = useMemo(() => {
    if (!search) return counterparts;
    return counterparts.filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [counterparts, search]);

  const handleToggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter(s => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const handleSelectAll = () => {
    onChange(filteredCounterparts.map(c => c.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const displayText = () => {
    if (selected.length === 0) return 'Все контрагенты';
    if (selected.length === 1) {
      const counterpart = counterparts.find(c => c.id === selected[0]);
      return counterpart?.name || 'Выбрано: 1';
    }
    return `Выбрано: ${selected.length}`;
  };

  return (
    <div className="relative">
      <input
        type="text"
        readOnly
        value={displayText()}
        onClick={() => setIsOpen(!isOpen)}
        placeholder="Выберите контрагентов"
        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
      />
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 mt-1 w-80 bg-white border border-purple-200 rounded-lg shadow-lg">
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Найти контрагента..."
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="p-2 border-b border-gray-200 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectAll();
                }}
                className="text-primary-600 hover:text-primary-800"
              >
                Выбрать все
              </button>
              <span className="text-gray-400">/</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="text-primary-600 hover:text-primary-800"
              >
                Снять все
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <label className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.length === 0}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (e.target.checked) {
                      onChange([]);
                    }
                  }}
                  className="mr-2 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-700">Без контрагента</span>
              </label>
              {filteredCounterparts.map((counterpart) => (
                <label
                  key={counterpart.id}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(counterpart.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleToggle(counterpart.id);
                    }}
                    className="mr-2 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-xs text-gray-700">{counterpart.name}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
