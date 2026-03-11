import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRightIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Plus, Search, Landmark, Banknote } from 'lucide-react';
import client from '../api/client';
import Drawer from '../components/Drawer';
import AccountForm from '../components/AccountForm';
import ActionsMenu from '../components/ui/ActionsMenu';
import { formatCurrency } from '../utils/currency';
import PeriodFilterBar from '../components/PeriodFilterBar';
import { useDensity } from '../contexts/DensityContext';
import { useCompactStyles } from '../hooks/useCompactStyles';
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
  const { isCompact } = useDensity();
  const compact = useCompactStyles();
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
    setSelectedAccount(null);
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

  const getTypeIcon = useCallback((accountType: string) => {
    return accountType === 'cash' ? <Banknote className="h-4 w-4" /> : <Landmark className="h-4 w-4" />;
  }, []);

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  const totalKGS = accounts
    .filter(a => a.currency === 'KGS')
    .reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className={compact.sectionHeader + ' text-slate-900'}>Счета</h1>
          <p className={`mt-0.5 ${compact.smallText} text-slate-500`}>Управление счетами и балансами</p>
        </div>
        <button
          onClick={handleAdd}
          className={`flex items-center gap-1.5 ${compact.buttonPadding} bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors ${compact.buttonText} font-medium`}
        >
          <Plus className={compact.iconSize} />
          Добавить счет
        </button>
      </div>

      {/* KPI — 4 карточки в ряд */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Всего</p>
          <p className="text-lg font-semibold text-slate-800">{accounts.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Банковские</p>
          <p className="text-lg font-semibold text-slate-800">{accounts.filter(a => a.account_type === 'bank').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Наличные</p>
          <p className="text-lg font-semibold text-slate-800">{accounts.filter(a => a.account_type === 'cash').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2 shadow-sm">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Баланс KGS</p>
          <p className="text-lg font-semibold text-slate-800">{formatCurrency(totalKGS, 'KGS')}</p>
        </div>
      </div>

      {/* Поиск */}
      <div className={`bg-white ${compact.cardPaddingSmall} rounded-lg shadow-sm border border-gray-200`}>
        <div className="relative">
          <Search className={`absolute left-2 top-1/2 transform -translate-y-1/2 ${compact.iconSizeSmall} text-gray-400`} />
          <input
            type="text"
            placeholder="Название, номер счета..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className={`w-full pl-7 pr-2 ${compact.buttonPadding} ${compact.textSize} border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
          />
        </div>
      </div>

      {/* Фильтры */}
      <div className={`bg-white ${compact.cardPaddingSmall} rounded-lg shadow-sm border border-gray-200`}>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`${compact.smallText} font-medium text-gray-700`}>Показать:</span>
          <button
            onClick={() => setFilters({ ...filters, account_type: '', currency: '' })}
            className={`px-2 py-1 ${compact.smallText} font-medium rounded-lg transition-colors ${
              !filters.account_type && !filters.currency
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Все счета
          </button>
          <button
            onClick={() => setFilters({ ...filters, account_type: 'bank' })}
            className={`px-2 py-1 ${compact.smallText} font-medium rounded-lg transition-colors ${
              filters.account_type === 'bank'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Банковские
          </button>
          <button
            onClick={() => setFilters({ ...filters, account_type: 'cash' })}
            className={`px-2 py-1 ${compact.smallText} font-medium rounded-lg transition-colors ${
              filters.account_type === 'cash'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Наличные
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <select
              value={filters.currency}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
              className={`px-1.5 py-1 ${compact.smallText} border border-gray-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500`}
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

      {/* Таблица — стиль как в договорах */}
      <div className="bg-white shadow rounded-lg overflow-hidden max-w-full">
        <div className="overflow-x-auto no-scrollbar w-full">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none w-12`}>№</th>
              <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none`}>
                Название
              </th>
              <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none`}>
                Тип
              </th>
              <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none`}>
                Валюта
              </th>
              <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none`}>
                Владелец
              </th>
              <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none`}>
                Баланс
              </th>
              <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-left text-xs font-medium text-gray-500 tracking-wider leading-none`}>
                Статус
              </th>
              <th className={`${isCompact ? 'px-1 py-0.5' : 'px-2 py-1'} text-right text-xs font-medium text-gray-500 tracking-wider leading-none`}>
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {accounts.map((account, index) => (
              <tr key={account.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-primary-50'} leading-none`}>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs font-medium text-gray-900 leading-tight`}>{index + 1}</td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs font-medium text-gray-900 leading-tight`}>
                  {account.name}
                </td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight`}>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="shrink-0 text-slate-400">{getTypeIcon(account.account_type)}</span>
                    <span className="truncate">{account.account_type === 'cash' ? 'Наличные' : 'Банковский счет'}</span>
                  </div>
                </td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight`}>
                  {account.currency}
                </td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs text-gray-500 leading-tight`}>
                  {account.owner_name || 'Общий'}
                </td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-xs font-semibold text-gray-900 leading-tight`}>
                  {formatCurrency(account.balance, account.currency)}
                </td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap leading-tight`}>
                  <span className={`${isCompact ? 'px-1 py-0' : 'px-1.5 py-0.5'} text-xs rounded-full leading-none ${
                    account.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {account.is_active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
                <td className={`${isCompact ? 'px-1 py-0' : 'px-2 py-0.5'} whitespace-nowrap text-right leading-tight`}>
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
                          setEditingAccount(null);
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
