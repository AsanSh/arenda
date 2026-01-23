import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon, ArrowRightIcon, ArrowLeftIcon, CurrencyDollarIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import { Search } from 'lucide-react';
import client from '../api/client';
import Drawer from '../components/Drawer';
import AccountForm from '../components/AccountForm';
import ActionsMenu from '../components/ui/ActionsMenu';
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

  const [formLoading, setFormLoading] = useState(false);

  const handleSubmit = useCallback(async (data: { id?: number; name: string; account_type: string; currency: string; owner?: number | null; account_number?: string; bank_name?: string; is_active: boolean; comment?: string }) => {
    setFormLoading(true);
    try {
      if (editingAccount?.id) {
        await client.patch(`/accounts/${editingAccount.id}/`, data);
      } else {
        await client.post('/accounts/', data);
      }
      setIsDrawerOpen(false);
      setEditingAccount(null);
      fetchAccounts();
    } catch (error: any) {
      console.error('Error saving account:', error);
      const errorMessage = error?.response?.data?.detail || error?.response?.data?.error || 'Ошибка при сохранении';
      alert(errorMessage);
    } finally {
      setFormLoading(false);
    }
  }, [editingAccount]);

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

  // Simple sparkline data (mock - in production should come from backend)
  const sparklineData = [100, 120, 110, 130, 125, 140, 135];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Счета</h1>
          <p className="mt-1 text-sm text-slate-500">Управление счетами и балансами</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-card shadow-medium hover:bg-indigo-700 transition-colors font-medium"
        >
          <PlusIcon className="h-5 w-5" />
          Добавить счет
        </button>
      </div>

      {/* Поиск - сверху отдельно */}
      <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 mb-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Название, номер счета..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Фильтры в виде вкладок */}
      <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-gray-700 mr-1">Показать:</span>
          <button
            onClick={() => setFilters({ ...filters, account_type: '', currency: '' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              !filters.account_type && !filters.currency
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Все счета
          </button>
          <button
            onClick={() => setFilters({ ...filters, account_type: 'bank' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filters.account_type === 'bank'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Банковские
          </button>
          <button
            onClick={() => setFilters({ ...filters, account_type: 'cash' })}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              filters.account_type === 'cash'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Наличные
          </button>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={filters.currency}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
              className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Все валюты</option>
              <option value="KGS">KGS</option>
              <option value="USD">USD</option>
              <option value="RUB">RUB</option>
              <option value="EUR">EUR</option>
            </select>
            <PeriodFilterBar
              value={dateFilter}
              onChange={setDateFilter}
              urlParamPrefix="created_at"
            />
          </div>
        </div>
      </div>

      {/* Balance Cards - уменьшены размеры */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white p-3 md:p-4 rounded-card shadow-medium border border-slate-200 relative overflow-hidden group hover:shadow-large transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-full -mr-10 -mt-10 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Общий баланс (сомы)</h3>
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <BanknotesIcon className="h-4 w-4 text-indigo-600" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-semibold text-slate-900 mb-2">
              {formatCurrency(totalKGS, 'KGS')}
            </p>
            {/* Simple sparkline */}
            <div className="h-8 flex items-end gap-1">
              {sparklineData.map((value, idx) => {
                const height = (value / Math.max(...sparklineData)) * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t"
                    style={{ height: `${height}%`, minHeight: '3px' }}
                  />
                );
              })}
            </div>
          </div>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-card shadow-medium border border-slate-200 relative overflow-hidden group hover:shadow-large transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-50 to-green-100 rounded-full -mr-10 -mt-10 opacity-50"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide">Общий баланс (доллары)</h3>
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <p className="text-xl md:text-2xl font-semibold text-slate-900 mb-2">
              {formatCurrency(totalUSD, 'USD')}
            </p>
            {/* Simple sparkline */}
            <div className="h-8 flex items-end gap-1">
              {sparklineData.map((value, idx) => {
                const height = (value / Math.max(...sparklineData)) * 100;
                return (
                  <div
                    key={idx}
                    className="flex-1 bg-gradient-to-t from-green-500 to-green-400 rounded-t"
                    style={{ height: `${height}%`, minHeight: '3px' }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-medium border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Название
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Тип
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Валюта
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Владелец
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Баланс
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {accounts.map((account) => (
              <tr key={account.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-sm font-medium text-slate-900">{account.name}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-xs text-slate-600">
                    {account.account_type === 'cash' ? 'Наличные' : 'Банковский счет'}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-xs text-slate-600">{account.currency}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-xs text-slate-600">{account.owner_name || 'Общий'}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-sm font-semibold text-slate-900">
                    {formatCurrency(account.balance, account.currency)}
                  </div>
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    account.is_active 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}>
                    {account.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex justify-end items-center gap-2">
                    <button
                      onClick={() => handleEdit(account)}
                      className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                      title="Редактировать"
                    >
                      Редактировать
                    </button>
                    <ActionsMenu
                      items={[
                        { label: 'Просмотр', onClick: () => {
                          setSelectedAccount(account);
                          setIsDrawerOpen(true);
                        }},
                        { label: 'Удалить', onClick: () => handleDelete(account), variant: 'danger' },
                      ]}
                      alwaysVisible={true}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </div>
      </div>

      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingAccount(null);
          setSelectedAccount(null);
        }}
        title={selectedAccount ? `Операции: ${selectedAccount.name}` : (editingAccount ? 'Редактировать счет' : 'Добавить счет')}
        footer={!selectedAccount ? (
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setIsDrawerOpen(false);
                setEditingAccount(null);
              }}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-card hover:bg-slate-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              form="account-form"
              disabled={formLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-card hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {formLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        ) : undefined}
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
            onSubmit={handleSubmit}
            loading={formLoading}
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
