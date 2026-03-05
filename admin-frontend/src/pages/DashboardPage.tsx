import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { formatCurrency, formatAmount } from '../utils/currency';
import {
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface DashboardStats {
  accruals: {
    total: string;
    paid: string;
    balance: string;
    overdue_count: number;
    overdue_amount: string;
    due_soon_count: number;
    due_soon_amount: string;
  };
  payments: {
    this_month_count: number;
    this_month_amount: string;
    last_30_days_amount: string;
  };
  general: {
    properties: number;
    tenants: number;
    contracts: number;
    account_balance: string;
  };
  deposits?: {
    total: string;
    balance: string;
    count: number;
  };
}

interface Accrual {
  id: number;
  property_address: string;
  tenant_name: string;
  due_date: string;
  balance: string;
  final_amount: string;
  currency?: string;
  overdue_days?: number;
}

interface Payment {
  id: number;
  contract_number: string;
  tenant_name: string;
  amount: string;
  payment_date: string;
  currency?: string;
}

// Simple chart component for payments visualization - Компактный
const PaymentChart: React.FC<{ data: number[] }> = ({ data }) => {
  const maxValue = Math.max(...data, 1);
  const chartHeight = 80; // Уменьшено с 120px
  
  return (
    <div className="relative w-full h-20 flex items-end justify-between gap-0.5">
      {data.map((value, index) => {
        const height = (value / maxValue) * chartHeight;
        return (
          <div
            key={index}
            className="flex-1 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t transition-all hover:opacity-80"
            style={{ height: `${height}px`, minHeight: value > 0 ? '2px' : '0' }}
            title={`${formatAmount(value.toString())} с`}
          />
        );
      })}
    </div>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overdue, setOverdue] = useState<Accrual[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [upcoming, setUpcoming] = useState<Accrual[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState<number[]>([]);
  const [incomePeriod, setIncomePeriod] = useState<'7d' | '30d' | '90d' | 'YTD'>('30d');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Загружаем статистику
      const statsResponse = await client.get('/dashboard/stats/');
      console.log('Dashboard stats response:', statsResponse.data);
      setStats(statsResponse.data);
      
      // Загружаем просроченные начисления
      const overdueResponse = await client.get('/dashboard/overdue/?limit=5');
      console.log('Dashboard overdue response:', overdueResponse.data);
      setOverdue(overdueResponse.data);
      
      // Загружаем последние платежи
      const paymentsResponse = await client.get('/dashboard/recent_payments/?limit=5');
      console.log('Dashboard payments response:', paymentsResponse.data);
      setRecentPayments(paymentsResponse.data);
      
      // Загружаем предстоящие платежи
      const upcomingResponse = await client.get('/dashboard/upcoming_payments/?limit=5');
      console.log('Dashboard upcoming response:', upcomingResponse.data);
      setUpcoming(upcomingResponse.data);
      
      // Генерируем тестовые данные для графика (в реальности нужно получать с бэкенда)
      // Имитируем данные за последние 30 дней
      const mockHistory = Array.from({ length: 30 }, () => 
        Math.random() * parseFloat(statsResponse.data.payments.last_30_days_amount || '0') / 30
      );
      setPaymentHistory(mockHistory);
      
      setLoading(false);
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      // Показываем более детальную ошибку
      if (error.response?.status === 401) {
        console.error('Unauthorized - redirecting to login');
        window.location.href = '/login';
      }
      setLoading(false);
    }
  };

  // Calculate trend indicators (mock data - in production should come from backend)
  const trends = useMemo(() => {
    if (!stats) return null;
    return {
      total: { value: 12.5, isPositive: true },
      paid: { value: 8.3, isPositive: true },
      balance: { value: -5.2, isPositive: false },
      overdue: { value: -15.7, isPositive: true }, // Negative is good for overdue
    };
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-sm text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-2">Ошибка загрузки данных</p>
        <p className="text-sm text-gray-500 mb-4">Проверьте консоль браузера для деталей</p>
        <button
          onClick={() => fetchDashboardData()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-h-screen bg-[#F5F7FA] p-4 md:p-6 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
          Дашборд
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">Обзор финансовых показателей</p>
      </div>

      {/* Top row: KPI cards — финтех: крупные числа, мало шума, 20–24px padding, 16–24px gap */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* 1. Остаток к оплате — главный KPI */}
        <div
          onClick={() => navigate('/accruals?status=unpaid')}
          className="bg-white rounded-2xl shadow-sm hover:shadow transition-all p-5 md:p-6 cursor-pointer border border-slate-100/80 flex flex-col justify-between min-h-[120px]"
        >
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Остаток к оплате</p>
          <p className="text-3xl md:text-4xl font-bold text-slate-900 mt-1 tracking-tight">
            {formatCurrency(stats.accruals.balance, 'KGS')}
          </p>
          {trends && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trends.balance.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trends.balance.isPositive ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
              {Math.abs(trends.balance.value)}% MoM
            </div>
          )}
        </div>

        {/* 2. Просрочено — с бейджем количества */}
        <div
          onClick={() => navigate('/accruals?status=overdue')}
          className="bg-white rounded-2xl shadow-sm hover:shadow transition-all p-5 md:p-6 cursor-pointer border border-slate-100/80 flex flex-col justify-between min-h-[120px]"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Просрочено</p>
            {stats.accruals.overdue_count > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                {stats.accruals.overdue_count} начисл.
              </span>
            )}
          </div>
          <p className="text-3xl md:text-4xl font-bold text-red-600 mt-1 tracking-tight">
            {formatCurrency(stats.accruals.overdue_amount, 'KGS')}
          </p>
          {trends && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trends.overdue.isPositive ? 'text-red-600' : 'text-emerald-600'}`}>
              {trends.overdue.isPositive ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
              {Math.abs(trends.overdue.value)}% MoM
            </div>
          )}
        </div>

        {/* 3. Итого начислено */}
        <div
          onClick={() => navigate('/accruals')}
          className="bg-white rounded-2xl shadow-sm hover:shadow transition-all p-5 md:p-6 cursor-pointer border border-slate-100/80 flex flex-col justify-between min-h-[120px]"
        >
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Итого начислено</p>
          <p className="text-3xl md:text-4xl font-bold text-slate-900 mt-1 tracking-tight">
            {formatCurrency(stats.accruals.total, 'KGS')}
          </p>
          {trends && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trends.total.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trends.total.isPositive ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
              {Math.abs(trends.total.value)}% MoM
            </div>
          )}
        </div>

        {/* 4. Итого оплачено */}
        <div
          onClick={() => navigate('/payments')}
          className="bg-white rounded-2xl shadow-sm hover:shadow transition-all p-5 md:p-6 cursor-pointer border border-slate-100/80 flex flex-col justify-between min-h-[120px]"
        >
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Итого оплачено</p>
          <p className="text-3xl md:text-4xl font-bold text-emerald-600 mt-1 tracking-tight">
            {formatCurrency(stats.accruals.paid, 'KGS')}
          </p>
          {trends && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trends.paid.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trends.paid.isPositive ? <ChevronUpIcon className="h-3.5 w-3.5" /> : <ChevronDownIcon className="h-3.5 w-3.5" />}
              {Math.abs(trends.paid.value)}% MoM
            </div>
          )}
        </div>
      </div>

      {/* Депозиты — компактная строка (опционально) */}
      {stats.deposits && (
        <div
          onClick={() => navigate('/deposits')}
          className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between cursor-pointer hover:shadow border border-slate-100/80"
        >
          <span className="text-sm font-medium text-slate-500">Депозиты</span>
          <span className="text-xl font-bold text-slate-900">{formatCurrency(stats.deposits.total, 'KGS')}</span>
          <span className="text-xs text-slate-500">Остаток: {formatCurrency(stats.deposits.balance, 'KGS')} · {stats.deposits.count}</span>
        </div>
      )}

      {/* Второй ряд: объекты, контрагенты, договоры, счета — компактно */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate('/properties')}
          className="bg-white rounded-2xl shadow-sm border border-slate-100/80 p-4 h-20 flex items-center justify-between cursor-pointer hover:shadow transition-all"
        >
          <div>
            <h3 className="text-xs font-medium text-slate-500 mb-0.5">Недвижимость</h3>
            <p className="text-lg font-bold text-slate-900">{stats.general.properties}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        </div>
        <div
          onClick={() => navigate('/tenants')}
          className="bg-white rounded-2xl shadow-sm border border-slate-100/80 p-4 h-20 flex items-center justify-between cursor-pointer hover:shadow transition-all"
        >
          <div>
            <h3 className="text-xs font-medium text-slate-500 mb-0.5">Контрагенты</h3>
            <p className="text-lg font-bold text-slate-900">{stats.general.tenants}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <div
          onClick={() => navigate('/contracts?status=active')}
          className="bg-white rounded-2xl shadow-sm border border-slate-100/80 p-4 h-20 flex items-center justify-between cursor-pointer hover:shadow transition-all"
        >
          <div>
            <h3 className="text-xs font-medium text-slate-500 mb-0.5">Активные договоры</h3>
            <p className="text-lg font-bold text-slate-900">{stats.general.contracts}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <div
          onClick={() => navigate('/accounts')}
          className="bg-white rounded-2xl shadow-sm border border-slate-100/80 p-4 h-20 flex items-center justify-between cursor-pointer hover:shadow transition-all"
        >
          <div>
            <h3 className="text-xs font-medium text-slate-500 mb-0.5">Баланс счетов</h3>
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(stats.general.account_balance, 'KGS')}
            </p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Поступления — финтех: период 7d/30d/90d/YTD, крупная сумма, бейдж */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/80 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Поступления</h2>
            <p className="text-xs text-slate-500 mt-0.5">Сумма за выбранный период</p>
          </div>
          <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
            {(['7d', '30d', '90d', 'YTD'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setIncomePeriod(p)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  incomePeriod === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <p className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          {formatCurrency(stats.payments.last_30_days_amount, 'KGS')}
        </p>
        <span className="inline-flex items-center mt-1 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
          {stats.payments.this_month_count} платежей
        </span>
        <div className="mt-4 min-h-[80px]">
          <PaymentChart data={paymentHistory} />
        </div>
        <Link to="/payments" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
          Все поступления <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Списки: Просрочено | К оплате — финтех: объект жирный, бейдж красный/оранжевый, сумма справа */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Просрочено */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Просрочено</h2>
            <Link to="/accruals?status=overdue" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Все</Link>
          </div>
          <div className="p-4 space-y-3">
            {overdue.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Нет просроченных начислений</p>
            ) : (
              overdue.map((accrual) => (
                <div key={accrual.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{accrual.property_address}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{accrual.tenant_name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {accrual.overdue_days != null && accrual.overdue_days > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-xs font-medium">
                        Просрочено +{accrual.overdue_days} дн.
                      </span>
                    )}
                    <span className="text-sm font-bold text-red-600 whitespace-nowrap">
                      {formatAmount(accrual.balance)} {accrual.currency || 'с'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* К оплате */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">К оплате</h2>
            <Link to="/accruals" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Все</Link>
          </div>
          <div className="p-4 space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Нет предстоящих платежей</p>
            ) : (
              upcoming.map((accrual) => {
                const dueDate = new Date(accrual.due_date);
                const daysLeft = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={accrual.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{accrual.property_address}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{accrual.tenant_name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {daysLeft <= 7 && daysLeft >= 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 text-xs font-medium">
                          Через {daysLeft} дн.
                        </span>
                      )}
                      <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
                        {formatAmount(accrual.balance)} {accrual.currency || 'с'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Последние платежи — таблица (финтех) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100/80 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Последние платежи</h2>
          <Link to="/payments" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Все</Link>
        </div>
        <div className="overflow-x-auto no-scrollbar w-full">
          {recentPayments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">Нет платежей</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3">ID / Договор</th>
                  <th className="px-5 py-3">Контрагент</th>
                  <th className="px-5 py-3">Дата</th>
                  <th className="px-5 py-3 text-right">Сумма</th>
                  <th className="px-5 py-3">Статус</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <Link to={`/payments`} className="font-medium text-indigo-600 hover:text-indigo-700">
                        #{payment.id}
                      </Link>
                      <span className="text-slate-500 ml-1">· {payment.contract_number}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{payment.tenant_name}</td>
                    <td className="px-5 py-3 text-slate-600">{new Date(payment.payment_date).toLocaleDateString('ru-RU')}</td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-900">
                      {formatAmount(payment.amount)} {payment.currency || 'с'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                        Оплачен
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
