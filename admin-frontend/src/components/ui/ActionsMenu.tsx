import React, { useState, useEffect, useRef, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Pencil, Trash2, Eye } from 'lucide-react';
import { Transition } from '@headlessui/react';

export interface ActionsMenuItem {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'danger';
}

interface ActionsMenuProps {
  items: ActionsMenuItem[];
  alwaysVisible?: boolean;
  triggerClassName?: string;
}

export default function ActionsMenu({
  items,
  alwaysVisible = false,
  triggerClassName = '',
}: ActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom-end' as 'bottom-end' | 'top-end' });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const updatePosition = () => {
        if (!buttonRef.current) return;

        const rect = buttonRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        const menuHeight = 200;
        const menuWidth = 192;

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        const shouldPlaceAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;
        
        let left = rect.right - menuWidth;
        if (left < 8) {
          left = 8;
        } else if (left + menuWidth > viewportWidth - 8) {
          left = viewportWidth - menuWidth - 8;
        }

        const top = shouldPlaceAbove 
          ? rect.top - menuHeight - 4
          : rect.bottom + 4;

        setPosition({
          top,
          left,
          placement: shouldPlaceAbove ? 'top-end' : 'bottom-end',
        });
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
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

  if (items.length === 0) return null;

  const handleItemClick = (item: ActionsMenuItem) => {
    item.onClick();
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ${alwaysVisible ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} ${triggerClassName}`}
        aria-label="Действия"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {isOpen &&
        createPortal(
          <Transition
            show={isOpen}
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <div
              ref={menuRef}
              className="fixed z-[9999] w-48 origin-top-right bg-white rounded-card shadow-large border border-slate-100 p-1"
              style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                transformOrigin: position.placement === 'top-end' ? 'bottom right' : 'top right',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {items.map((item, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(item);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors rounded-md ${
                    item.variant === 'danger'
                      ? 'text-red-600 hover:bg-red-50'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {item.icon || (
                    item.variant === 'danger' ? (
                      <Trash2 className="h-4 w-4" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )
                  )}
                  {item.label}
                </button>
              ))}
            </div>
          </Transition>,
          document.body
        )}
    </>
  );
}
