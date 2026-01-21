import React, { useState, useEffect } from 'react';
import { PlusIcon, ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import client from '../api/client';
import Drawer from '../components/Drawer';
import AccountForm from '../components/AccountForm';
import { formatCurrency } from '../utils/currency';
import PeriodFilterBar from '../components/PeriodFilterBar';
import { DatePreset } from '../utils/datePresets';

interface Account {
  id: number;
  name: string;
  account_type: string;
  currency: string;
  owner?: number | null;
  owner_name?: string;
  balance: string;
  account_number?: string;
  bank_name?: string;
  is_active: boolean;
  comment?: string;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [filters, setFilters] = useState({
    account_type: '',
    currency: '',
    search: '',
  });
  const [dateFilter, setDateFilter] = useState<{ preset: DatePreset | null; from: string | null; to: string | null }>({
    preset: null,
    from: null,
    to: null,
  });

  useEffect(() => {
    fetchAccounts();
  }, [filters, dateFilter]);

  const fetchAccounts = async () => {
    try {
      let url = '/accounts/';
      const params = new URLSearchParams();
      
      if (filters.account_type) params.append('account_type', filters.account_type);
      if (filters.currency) params.append('currency', filters.currency);
      if (filters.search) params.append('search', filters.search);
      
      if (dateFilter.from) params.append('created_at__gte', dateFilter.from);
      if (dateFilter.to) params.append('created_at__lte', dateFilter.to);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await client.get(url);
      setAccounts(response.data.results || response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setLoading(false);
    }
  };

  const handleSave = () => {
    setIsDrawerOpen(false);
    setEditingAccount(null);
    fetchAccounts();
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setIsDrawerOpen(true);
  };

  const handleDelete = async (account: Account) => {
    if (!window.confirm(`Вы уверены, что хотите удалить счет "${account.name}"?`)) {
      return;
    }

    try {
      await client.delete(`/accounts/${account.id}/`);
      fetchAccounts();
    } catch (error: any) {
      let errorMessage = 'Ошибка при удалении';
      if (error.response?.data) {
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (Array.isArray(error.response.data.non_field_errors)) {
          errorMessage = error.response.data.non_field_errors[0];
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      }
      alert(errorMessage);
    }
  };

  const handleAdd = () => {
    setEditingAccount(null);
    setIsDrawerOpen(true);
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  // Группировка по валютам
  const accountsKGS = accounts.filter(a => a.currency === 'KGS' && a.is_active);
  const accountsUSD = accounts.filter(a => a.currency === 'USD' && a.is_active);
  const totalKGS = accountsKGS.reduce((sum, a) => sum + parseFloat(a.balance), 0);
  const totalUSD = accountsUSD.reduce((sum, a) => sum + parseFloat(a.balance), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Счета</h1>
        <button
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Добавить счет
        </button>
      </div>

      {/* Фильтры */}
      <div className="bg-white p-3 rounded-lg shadow mb-4">
        <div className="flex items-end gap-3">
          <div className="flex-shrink-0">
            <label className="block text-xs font-medium text-gray-700 mb-1">Период</label>
            <PeriodFilterBar
              value={dateFilter}
              onChange={setDateFilter}
              urlParamPrefix="created_at"
            />
          </div>
          <div className="flex-shrink-0 min-w-[120px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Тип счета</label>
            <select
              value={filters.account_type}
              onChange={(e) => setFilters({ ...filters, account_type: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Все</option>
              <option value="cash">Наличные</option>
              <option value="bank">Банковский счет</option>
            </select>
          </div>
          <div className="flex-shrink-0 min-w-[100px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Валюта</label>
            <select
              value={filters.currency}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Все</option>
              <option value="KGS">KGS</option>
              <option value="USD">USD</option>
              <option value="RUB">RUB</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-700 mb-1">Поиск</label>
            <input
              type="text"
              placeholder="Название, номер счета..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Итоговые балансы */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Общий баланс (сомы)</h3>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(totalKGS, 'KGS')}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Общий баланс (доллары)</h3>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(totalUSD, 'USD')}
          </p>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Название
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Тип
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Валюта
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Владелец
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Баланс
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Статус
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {accounts.map((account, index) => (
              <tr key={account.id} className={index % 2 === 0 ? 'bg-white' : 'bg-primary-50'}>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {account.name}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {account.account_type === 'cash' ? 'Наличные' : 'Банковский счет'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {account.currency}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  {account.owner_name || 'Общий'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {formatCurrency(account.balance, account.currency)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {account.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setSelectedAccount(account);
                        setIsDrawerOpen(true);
                      }}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Операции
                    </button>
                    <button
                      onClick={() => handleEdit(account)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Редактировать
                    </button>
                    <button
                      onClick={() => handleDelete(account)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingAccount(null);
          setSelectedAccount(null);
        }}
        title={selectedAccount ? `Операции: ${selectedAccount.name}` : (editingAccount ? 'Редактировать счет' : 'Добавить счет')}
      >
        {selectedAccount ? (
          <AccountOperations account={selectedAccount} onClose={() => {
            setIsDrawerOpen(false);
            setSelectedAccount(null);
            fetchAccounts();
          }} />
        ) : (
          <AccountForm
            account={editingAccount}
            onSave={handleSave}
            onCancel={() => {
              setIsDrawerOpen(false);
              setEditingAccount(null);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

// Компонент для операций по счету
function AccountOperations({ account, onClose }: { account: Account; onClose: () => void }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationType, setOperationType] = useState<'income' | 'expense' | 'transfer' | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    comment: '',
    account_to: '',
  });

  useEffect(() => {
    fetchTransactions();
  }, [account.id]);

  const fetchTransactions = async () => {
    try {
      const response = await client.get(`/accounts/${account.id}/transactions/`);
      setTransactions(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setLoading(false);
    }
  };

  const handleOperation = async (type: 'income' | 'expense' | 'transfer') => {
    try {
      const amount = parseFloat(formData.amount);
      if (amount <= 0) {
        alert('Сумма должна быть больше 0');
        return;
      }

      if (type === 'transfer' && !formData.account_to) {
        alert('Выберите счет получателя');
        return;
      }

      let response;
      if (type === 'income') {
        response = await client.post(`/accounts/${account.id}/add_income/`, {
          amount: formData.amount,
          transaction_date: formData.transaction_date,
          comment: formData.comment,
        });
      } else if (type === 'expense') {
        response = await client.post(`/accounts/${account.id}/add_expense/`, {
          amount: formData.amount,
          transaction_date: formData.transaction_date,
          comment: formData.comment,
        });
      } else {
        response = await client.post(`/accounts/${account.id}/transfer/`, {
          amount: formData.amount,
          transaction_date: formData.transaction_date,
          comment: formData.comment,
          account_to: formData.account_to,
        });
      }

      alert('Операция выполнена успешно');
      setOperationType(null);
      setFormData({ amount: '', transaction_date: new Date().toISOString().split('T')[0], comment: '', account_to: '' });
      fetchTransactions();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Ошибка при выполнении операции');
    }
  };

  const [allAccounts, setAllAccounts] = useState<Account[]>([]);
  useEffect(() => {
    client.get('/accounts/').then(res => {
      setAllAccounts((res.data.results || res.data).filter((a: Account) => a.id !== account.id && a.currency === account.currency));
    });
  }, [account.id, account.currency]);

  return (
    <div className="space-y-4">
      {/* Кнопки операций */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setOperationType('income')}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <ArrowRightIcon className="h-5 w-5 inline mr-2" />
          Поступление
        </button>
        <button
          onClick={() => setOperationType('expense')}
          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          <ArrowLeftIcon className="h-5 w-5 inline mr-2" />
          Расход
        </button>
        <button
          onClick={() => setOperationType('transfer')}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Перевод
        </button>
      </div>

      {/* Форма операции */}
      {operationType && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <h3 className="font-semibold">
            {operationType === 'income' && 'Поступление'}
            {operationType === 'expense' && 'Расход'}
            {operationType === 'transfer' && 'Перевод'}
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сумма *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата *</label>
            <input
              type="date"
              required
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          {operationType === 'transfer' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Счет получателя *</label>
              <select
                required
                value={formData.account_to}
                onChange={(e) => setFormData({ ...formData, account_to: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Выберите счет</option>
                {allAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency}) - {formatCurrency(acc.balance, acc.currency)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => handleOperation(operationType)}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Выполнить
            </button>
            <button
              onClick={() => {
                setOperationType(null);
                setFormData({ amount: '', transaction_date: new Date().toISOString().split('T')[0], comment: '', account_to: '' });
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* История операций */}
      <div className="mt-6">
        <h3 className="font-semibold mb-3">История операций</h3>
        {loading ? (
          <div className="text-center py-4">Загрузка...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-4 text-gray-500">Нет операций</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {transactions.map((tr) => (
              <div key={tr.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="text-sm font-medium">
                    {tr.transaction_type === 'income' && 'Поступление'}
                    {tr.transaction_type === 'expense' && 'Расход'}
                    {tr.transaction_type === 'transfer_in' && 'Перевод (входящий)'}
                    {tr.transaction_type === 'transfer_out' && 'Перевод (исходящий)'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(tr.transaction_date).toLocaleDateString('ru-RU')}
                  </div>
                  {tr.comment && (
                    <div className="text-xs text-gray-500 mt-1">{tr.comment}</div>
                  )}
                </div>
                <div className={`text-sm font-medium ${
                  tr.transaction_type === 'income' || tr.transaction_type === 'transfer_in' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {tr.transaction_type === 'income' || tr.transaction_type === 'transfer_in' ? '+' : '-'}
                  {formatCurrency(tr.amount, account.currency)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
