import React, { useState, Fragment, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { formatAmount } from '../utils/currency';
import client from '../api/client';

interface Accrual {
  id: number;
  period_start: string;
  period_end: string;
  due_date: string;
  final_amount: string;
  paid_amount: string;
  balance: string;
  currency?: string;
}

interface Account {
  id: number;
  name: string;
  currency: string;
  is_active: boolean;
}

interface AcceptPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  accrual: Accrual | null;
  onAccept: (data: { payment_date: string; amount: string; comment: string; account: number }) => Promise<void>;
}

export default function AcceptPaymentModal({
  isOpen,
  onClose,
  accrual,
  onAccept,
}: AcceptPaymentModalProps) {
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [account, setAccount] = useState<number | ''>('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Загружаем счета при открытии модального окна
  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
    }
  }, [isOpen, accrual]);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await client.get('/accounts/');
      const accountsList = response.data.results || response.data;
      // Фильтруем только активные счета в той же валюте, что и начисление
      const currency = accrual?.currency || 'KGS';
      const filteredAccounts = accountsList.filter(
        (acc: Account) => acc.is_active && acc.currency === currency
      );
      setAccounts(filteredAccounts);
      
      // Если есть счет "ОсОО ЖиВ сомы", выбираем его по умолчанию
      const defaultAccount = filteredAccounts.find((acc: Account) => 
        acc.name.includes('ЖиВ') && acc.currency === 'KGS'
      );
      if (defaultAccount) {
        setAccount(defaultAccount.id);
      } else if (filteredAccounts.length > 0) {
        setAccount(filteredAccounts[0].id);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Инициализируем значения при открытии модального окна
  useEffect(() => {
    if (isOpen && accrual) {
      // Дата по умолчанию - сегодня
      const today = new Date().toISOString().split('T')[0];
      setPaymentDate(today);
      // Сумма по умолчанию - баланс начисления
      setAmount(parseFloat(accrual.balance).toFixed(2));
      setComment('');
    }
  }, [isOpen, accrual]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accrual) return;
    
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Сумма должна быть больше нуля');
      return;
    }

    if (!paymentDate) {
      alert('Укажите дату платежа');
      return;
    }

    if (!account) {
      alert('Выберите счет для поступления');
      return;
    }

    setLoading(true);
    try {
      await onAccept({
        payment_date: paymentDate,
        amount: amount,
        comment: comment,
        account: account as number,
      });
      onClose();
    } catch (error) {
      console.error('Error accepting payment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!accrual) return null;

  const balance = parseFloat(accrual.balance);
  const currency = accrual.currency || 'сом';

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    <span className="sr-only">Закрыть</span>
                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>

                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <Dialog.Title as="h3" className="text-base font-semibold leading-6 text-gray-900 mb-4">
                      Принять платеж
                    </Dialog.Title>

                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Период:</span>{' '}
                        {new Date(accrual.period_start).toLocaleDateString('ru-RU')} -{' '}
                        {new Date(accrual.period_end).toLocaleDateString('ru-RU')}
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Срок оплаты:</span>{' '}
                        {new Date(accrual.due_date).toLocaleDateString('ru-RU')}
                      </div>
                      <div className="text-sm text-gray-600">
                        <span className="font-medium">Остаток к оплате:</span>{' '}
                        <span className="font-semibold text-gray-900">
                          {formatAmount(balance)} {currency}
                        </span>
                      </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="payment_date" className="block text-sm font-medium text-gray-700 mb-1">
                          Дата платежа <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          id="payment_date"
                          required
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Укажите фактическую дату получения платежа
                        </p>
                      </div>

                      <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                          Сумма платежа <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id="amount"
                          required
                          min="0.01"
                          step="0.01"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          placeholder="0.00"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Может быть меньше или больше остатка. Излишек будет распределен на следующие начисления.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="account" className="block text-sm font-medium text-gray-700 mb-1">
                          Счет для поступления <span className="text-red-500">*</span>
                        </label>
                        {loadingAccounts ? (
                          <div className="text-sm text-gray-500">Загрузка счетов...</div>
                        ) : (
                          <select
                            id="account"
                            required
                            value={account}
                            onChange={(e) => setAccount(parseInt(e.target.value))}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          >
                            <option value="">Выберите счет</option>
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name} ({acc.currency})
                              </option>
                            ))}
                          </select>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          Все деньги должны поступать на один счет
                        </p>
                      </div>

                      <div>
                        <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                          Комментарий
                        </label>
                        <textarea
                          id="comment"
                          rows={3}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                          placeholder="Дополнительная информация о платеже..."
                        />
                      </div>

                      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
                        <button
                          type="button"
                          onClick={onClose}
                          className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:col-start-1"
                        >
                          Отмена
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="inline-flex w-full justify-center rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 sm:col-start-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? 'Обработка...' : 'Принять платеж'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
