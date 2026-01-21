import React, { useState, useRef, useEffect } from 'react';
import { EllipsisVerticalIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';

interface TableActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  onView?: () => void;
  onMore?: Array<{ label: string; onClick: () => void; icon?: React.ReactNode }>;
}

export default function TableActions({ onEdit, onDelete, onView, onMore }: TableActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const actions = [];
  if (onView) actions.push({ label: 'Просмотр', onClick: onView, icon: <EyeIcon className="h-4 w-4" /> });
  if (onEdit) actions.push({ label: 'Редактировать', onClick: onEdit, icon: <PencilIcon className="h-4 w-4" /> });
  if (onDelete) actions.push({ label: 'Удалить', onClick: onDelete, icon: <TrashIcon className="h-4 w-4" /> });
  if (onMore) actions.push(...onMore);

  if (actions.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        aria-label="Действия"
      >
        <EllipsisVerticalIcon className="h-5 w-5" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-white rounded-card shadow-large border border-slate-200 py-1 z-50">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                action.onClick();
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
