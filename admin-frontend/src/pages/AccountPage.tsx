import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { formatCurrency } from '../utils/currency';

interface AccountBalance {
  balance: string;
  total_income: string;
  total_expenses: string;
}

export default function AccountPage() {
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const response = await client.get('/account/balance/');
      setBalance(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Счёт</h1>

      {balance && (
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Текущий баланс</h3>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(balance.balance, 'KGS')}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Всего поступлений</h3>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(balance.total_income, 'KGS')}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Всего расходов</h3>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(balance.total_expenses, 'KGS')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
