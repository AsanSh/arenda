import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    id: 1,
    question: 'Как добавить новый объект недвижимости?',
    answer: 'Перейдите в раздел "Недвижимость" и нажмите кнопку "Добавить объект". Заполните все необходимые поля: название, адрес, тип, площадь и другие параметры. После заполнения нажмите "Сохранить".',
  },
  {
    id: 2,
    question: 'Как создать договор аренды?',
    answer: 'В разделе "Договоры" нажмите "Добавить договор". Выберите объект недвижимости и контрагента, укажите даты начала и окончания аренды, сумму арендной платы и другие условия. Договор будет автоматически сохранен в системе.',
  },
  {
    id: 3,
    question: 'Как создать начисление?',
    answer: 'Перейдите в раздел "Начисления" и нажмите "Добавить начисление". Выберите договор, укажите период, базовую сумму и дополнительные начисления (коммунальные услуги, сервисное обслуживание и т.д.). Система автоматически рассчитает итоговую сумму.',
  },
  {
    id: 4,
    question: 'Как зарегистрировать поступление платежа?',
    answer: 'В разделе "Поступления" нажмите "Добавить поступление". Выберите договор и начисление, к которому относится платеж, укажите сумму, дату и способ оплаты. Платеж будет автоматически зачислен на счет.',
  },
  {
    id: 5,
    question: 'Как настроить уведомления?',
    answer: 'Перейдите в раздел "Настройки" → "Уведомления". Здесь вы можете включить или отключить email и SMS уведомления, настроить триггеры для автоматических рассылок (например, за 3 дня до срока оплаты).',
  },
  {
    id: 6,
    question: 'Как работает компактный режим?',
    answer: 'Компактный режим уменьшает отступы и размеры элементов интерфейса, позволяя отобразить больше информации на экране. Включить его можно в разделе "Настройки" → "Интерфейс" → "Компактный режим".',
  },
  {
    id: 7,
    question: 'Как экспортировать отчеты?',
    answer: 'В разделе "Отчеты" выберите нужный тип отчета и период. Нажмите "Сформировать отчет". После генерации вы сможете экспортировать данные в Excel или PDF формате.',
  },
  {
    id: 8,
    question: 'Что делать, если не отображаются данные?',
    answer: 'Проверьте фильтры на странице - возможно, они скрывают нужные данные. Также убедитесь, что у вас есть права доступа к соответствующим разделам. Если проблема сохраняется, обратитесь к администратору системы.',
  },
];

export default function HelpPage() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const toggleItem = (id: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(id)) {
      newOpenItems.delete(id);
    } else {
      newOpenItems.add(id);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900">Помощь</h1>
        <p className="mt-1 text-xs md:text-sm text-slate-500">Часто задаваемые вопросы и инструкции</p>
      </div>

      <div className="bg-white rounded-card shadow-medium border border-slate-200">
        <div className="p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Часто задаваемые вопросы</h2>
          
          <div className="space-y-2">
            {faqData.map((item) => {
              const isOpen = openItems.has(item.id);
              return (
                <div
                  key={item.id}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleItem(item.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="text-sm font-medium text-slate-900 pr-4">
                      {item.question}
                    </span>
                    {isOpen ? (
                      <ChevronUpIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    )}
                  </button>
                  
                  {isOpen && (
                    <div className="px-3 pb-3 pt-0">
                      <p className="text-xs text-slate-600 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-indigo-900 mb-2">Нужна дополнительная помощь?</h3>
        <p className="text-xs text-indigo-700">
          Если вы не нашли ответ на свой вопрос, обратитесь в службу поддержки по email:{' '}
          <a href="mailto:support@amt.kg" className="underline hover:text-indigo-900">
            support@amt.kg
          </a>
        </p>
      </div>
    </div>
  );
}
