import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { formatCurrency, formatAmount } from '../utils/currency';
import { useCompactStyles } from '../hooks/useCompactStyles';
import { 
  ExclamationTriangleIcon, 
  ClockIcon, 
  ArrowTrendingUpIcon,
  ArrowRightIcon,
  ChevronUpIcon,
  ChevronDownIcon
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
  const compact = useCompactStyles();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overdue, setOverdue] = useState<Accrual[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [upcoming, setUpcoming] = useState<Accrual[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState<number[]>([]);

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
    <div className="w-full space-y-4 md:space-y-6">
      {/* Header */}
      <div className="mb-4 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          Дашборд
        </h1>
        <p className="mt-1 text-xs md:text-sm text-gray-500">Обзор финансовых показателей</p>
      </div>

      {/* Top KPI Metrics Row - включая депозиты */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3">
        <div 
          onClick={() => navigate('/accruals')}
          className={`bg-white ${compact.kpiCardPadding} ${compact.kpiCardHeight} rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 cursor-pointer hover:border-indigo-300 flex flex-col justify-between`}
        >
          <div className="flex items-start justify-between">
            <h3 className={`${compact.smallText} font-medium text-gray-500 uppercase tracking-wide`}>Итого начислено</h3>
            {trends && (
              <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${compact.smallText} font-semibold ${
                trends.total.isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {trends.total.isPositive ? (
                  <ChevronUpIcon className="h-2.5 w-2.5" />
                ) : (
                  <ChevronDownIcon className="h-2.5 w-2.5" />
                )}
                {Math.abs(trends.total.value)}%
              </div>
            )}
          </div>
          <p className={`${compact.kpiNumber} font-semibold text-gray-900 leading-tight`}>
            {formatCurrency(stats.accruals.total, 'KGS')}
          </p>
        </div>

        <div 
          onClick={() => navigate('/payments')}
          className={`bg-white ${compact.kpiCardPadding} ${compact.kpiCardHeight} rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 cursor-pointer hover:border-green-300 flex flex-col justify-between`}
        >
          <div className="flex items-start justify-between">
            <h3 className={`${compact.smallText} font-medium text-gray-500 uppercase tracking-wide`}>Итого оплачено</h3>
            {trends && (
              <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${compact.smallText} font-semibold ${
                trends.paid.isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {trends.paid.isPositive ? (
                  <ChevronUpIcon className="h-2.5 w-2.5" />
                ) : (
                  <ChevronDownIcon className="h-2.5 w-2.5" />
                )}
                {Math.abs(trends.paid.value)}%
              </div>
            )}
          </div>
          <p className={`${compact.kpiNumber} font-semibold text-green-600 leading-tight`}>
            {formatCurrency(stats.accruals.paid, 'KGS')}
          </p>
        </div>

        <div 
          onClick={() => navigate('/accruals?status=unpaid')}
          className={`bg-white ${compact.kpiCardPadding} ${compact.kpiCardHeight} rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 cursor-pointer hover:border-blue-300 flex flex-col justify-between`}
        >
          <div className="flex items-start justify-between">
            <h3 className={`${compact.smallText} font-medium text-gray-500 uppercase tracking-wide`}>Остаток к оплате</h3>
            {trends && (
              <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${compact.smallText} font-semibold ${
                trends.balance.isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {trends.balance.isPositive ? (
                  <ChevronUpIcon className="h-2.5 w-2.5" />
                ) : (
                  <ChevronDownIcon className="h-2.5 w-2.5" />
                )}
                {Math.abs(trends.balance.value)}%
              </div>
            )}
          </div>
          <p className={`${compact.kpiNumber} font-semibold text-blue-600 leading-tight`}>
            {formatCurrency(stats.accruals.balance, 'KGS')}
          </p>
        </div>

        <div 
          onClick={() => navigate('/accruals?status=overdue')}
          className={`bg-white ${compact.kpiCardPadding} ${compact.kpiCardHeight} rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 cursor-pointer hover:border-red-300 flex flex-col justify-between`}
        >
          <div className="flex items-start justify-between">
            <h3 className={`${compact.smallText} font-medium text-gray-500 uppercase tracking-wide`}>Просрочено</h3>
            {trends && (
              <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full ${compact.smallText} font-semibold ${
                trends.overdue.isPositive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {trends.overdue.isPositive ? (
                  <ChevronUpIcon className="h-2.5 w-2.5" />
                ) : (
                  <ChevronDownIcon className="h-2.5 w-2.5" />
                )}
                {Math.abs(trends.overdue.value)}%
              </div>
            )}
          </div>
          <div>
            <p className={`${compact.kpiNumber} font-semibold text-red-600 leading-tight`}>
              {formatCurrency(stats.accruals.overdue_amount, 'KGS')}
            </p>
            {stats.accruals.overdue_count > 0 && (
              <p className={`${compact.smallText} text-gray-500 mt-0.5`}>
                {stats.accruals.overdue_count} начислений
              </p>
            )}
          </div>
        </div>

        {/* Депозит KPI - в первой строке */}
        {stats.deposits && (
          <div 
            onClick={() => navigate('/deposits')}
            className={`bg-white ${compact.kpiCardPadding} ${compact.kpiCardHeight} rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 cursor-pointer hover:border-purple-300 flex flex-col justify-between`}
          >
            <div className="flex items-start justify-between">
              <h3 className={`${compact.smallText} font-medium text-gray-500 uppercase tracking-wide`}>Депозиты</h3>
            </div>
            <div>
              <p className={`${compact.kpiNumber} font-semibold text-purple-600 leading-tight`}>
                {formatCurrency(stats.deposits.total, 'KGS')}
              </p>
              <p className={`${compact.smallText} text-gray-500 mt-0.5`}>
                Остаток: {formatCurrency(stats.deposits.balance, 'KGS')} ({stats.deposits.count})
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Metrics Row - Компактные */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div 
          onClick={() => navigate('/properties')}
          className={`bg-white ${compact.cardPaddingSmall} h-16 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 cursor-pointer hover:border-blue-300 flex items-center justify-between`}
        >
          <div>
            <h3 className={`${compact.smallText} font-medium text-gray-500 mb-0.5`}>Недвижимость</h3>
            <p className={`${compact.kpiNumber} font-bold text-gray-900`}>{stats.general.properties}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
        </div>
        <div 
          onClick={() => navigate('/tenants')}
          className={`bg-white ${compact.cardPaddingSmall} h-16 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 cursor-pointer hover:border-purple-300 flex items-center justify-between`}
        >
          <div>
            <h3 className={`${compact.smallText} font-medium text-gray-500 mb-0.5`}>Контрагенты</h3>
            <p className={`${compact.kpiNumber} font-bold text-gray-900`}>{stats.general.tenants}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>
        <div 
          onClick={() => navigate('/contracts?status=active')}
          className={`bg-white ${compact.cardPaddingSmall} h-16 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 cursor-pointer hover:border-green-300 flex items-center justify-between`}
        >
          <div>
            <h3 className={`${compact.smallText} font-medium text-gray-500 mb-0.5`}>Активные договоры</h3>
            <p className={`${compact.kpiNumber} font-bold text-gray-900`}>{stats.general.contracts}</p>
          </div>
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <div 
          onClick={() => navigate('/accounts')}
          className={`bg-white ${compact.cardPaddingSmall} h-16 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 cursor-pointer hover:border-indigo-300 flex items-center justify-between`}
        >
          <div>
            <h3 className={`${compact.smallText} font-medium text-gray-500 mb-0.5`}>Баланс счетов</h3>
            <p className={`${compact.kpiNumber} font-bold text-purple-600`}>
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

      {/* Payments Chart Section - Компактный */}
      <div className={`bg-white ${compact.cardPadding} rounded-lg shadow-sm border border-gray-100`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
          <div>
            <h2 className={`${compact.sectionHeader} text-gray-900 mb-0.5`}>Поступления за текущий месяц</h2>
            <p className={`${compact.textSize} text-gray-500`}>Динамика за последние 30 дней</p>
          </div>
          <Link 
            to="/payments" 
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${compact.textSize} font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors`}
          >
            Все поступления
            <ArrowRightIcon className={compact.iconSizeSmall} />
          </Link>
        </div>
        
        {/* Chart - Компактный */}
        <div className="mb-3">
          <PaymentChart data={paymentHistory} />
        </div>

        {/* Stats Grid - Компактный */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100">
          <div>
            <p className={`${compact.smallText} font-medium text-gray-500 uppercase tracking-wide mb-0.5`}>Количество платежей</p>
            <p className={`${compact.kpiNumber} font-bold text-gray-900`}>{stats.payments.this_month_count}</p>
          </div>
          <div>
            <p className={`${compact.smallText} font-medium text-gray-500 uppercase tracking-wide mb-0.5`}>Сумма за месяц</p>
            <p className={`${compact.kpiNumber} font-bold text-green-600`}>
              {formatCurrency(stats.payments.this_month_amount, 'KGS')}
            </p>
          </div>
          <div>
            <p className={`${compact.smallText} font-medium text-gray-500 uppercase tracking-wide mb-0.5`}>За последние 30 дней</p>
            <p className={`${compact.kpiNumber} font-semibold text-gray-700`}>
              {formatCurrency(stats.payments.last_30_days_amount, 'KGS')}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Lists Row - Компактные */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Просроченные начисления */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className={`${compact.cardPaddingSmall} border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-transparent`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                <ExclamationTriangleIcon className={`${compact.iconSize} text-red-600`} />
              </div>
              <h2 className={`${compact.sectionHeader} text-gray-900`}>Просроченные</h2>
            </div>
            <Link 
              to="/accruals?status=overdue" 
              className={`inline-flex items-center gap-1 px-2 py-1 ${compact.smallText} font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors`}
            >
              Все
              <ArrowRightIcon className={compact.iconSizeSmall} />
            </Link>
          </div>
          <div className={compact.cardPaddingSmall}>
            {overdue.length === 0 ? (
              <p className={`${compact.textSize} text-gray-500 text-center py-4`}>Нет просроченных начислений</p>
            ) : (
              <div className="space-y-1.5">
                {overdue.map((accrual) => (
                  <div 
                    key={accrual.id} 
                    className={`${compact.cardPaddingSmall} rounded-lg border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors cursor-pointer`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 min-w-0">
                        <p className={`${compact.textSize} font-medium text-gray-900 truncate`}>{accrual.property_address}</p>
                        <p className={`${compact.smallText} text-gray-600 truncate mt-0.5`}>{accrual.tenant_name}</p>
                      </div>
                      <span className={`${compact.textSize} font-bold text-red-600 whitespace-nowrap ml-2`}>
                        {formatAmount(accrual.balance)} {accrual.currency || 'с'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`${compact.smallText} text-gray-500`}>Срок: {new Date(accrual.due_date).toLocaleDateString('ru-RU')}</span>
                      {accrual.overdue_days && accrual.overdue_days > 0 && (
                        <span className={`px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium ${compact.smallText}`}>
                          {accrual.overdue_days} дн.
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Предстоящие платежи - Компактные */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className={`${compact.cardPaddingSmall} border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-transparent`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                <ClockIcon className={`${compact.iconSize} text-orange-600`} />
              </div>
              <h2 className={`${compact.sectionHeader} text-gray-900`}>К оплате</h2>
            </div>
            <Link 
              to="/accruals" 
              className={`inline-flex items-center gap-1 px-2 py-1 ${compact.smallText} font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors`}
            >
              Все
              <ArrowRightIcon className={compact.iconSizeSmall} />
            </Link>
          </div>
          <div className={compact.cardPaddingSmall}>
            {upcoming.length === 0 ? (
              <p className={`${compact.textSize} text-gray-500 text-center py-4`}>Нет предстоящих платежей</p>
            ) : (
              <div className="space-y-1.5">
                {upcoming.map((accrual) => (
                  <div 
                    key={accrual.id} 
                    className={`${compact.cardPaddingSmall} rounded-lg border border-orange-100 bg-orange-50/50 hover:bg-orange-50 transition-colors cursor-pointer`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 min-w-0">
                        <p className={`${compact.textSize} font-medium text-gray-900 truncate`}>{accrual.property_address}</p>
                        <p className={`${compact.smallText} text-gray-600 truncate mt-0.5`}>{accrual.tenant_name}</p>
                      </div>
                      <span className={`${compact.textSize} font-bold text-blue-600 whitespace-nowrap ml-2`}>
                        {formatAmount(accrual.balance)} {accrual.currency || 'с'}
                      </span>
                    </div>
                    <div className={`${compact.smallText} text-gray-500`}>
                      Срок: {new Date(accrual.due_date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Последние платежи - Компактные */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className={`${compact.cardPaddingSmall} border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-green-50 to-transparent`}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                <ArrowTrendingUpIcon className={`${compact.iconSize} text-green-600`} />
              </div>
              <h2 className={`${compact.sectionHeader} text-gray-900`}>Последние платежи</h2>
            </div>
            <Link 
              to="/payments" 
              className={`inline-flex items-center gap-1 px-2 py-1 ${compact.smallText} font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors`}
            >
              Все
              <ArrowRightIcon className={compact.iconSizeSmall} />
            </Link>
          </div>
          <div className={compact.cardPaddingSmall}>
            {recentPayments.length === 0 ? (
              <p className={`${compact.textSize} text-gray-500 text-center py-4`}>Нет платежей</p>
            ) : (
              <div className="space-y-1.5">
                {recentPayments.map((payment) => (
                  <div 
                    key={payment.id} 
                    className={`${compact.cardPaddingSmall} rounded-lg border border-green-100 bg-green-50/50 hover:bg-green-50 transition-colors cursor-pointer`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 min-w-0">
                        <p className={`${compact.textSize} font-medium text-gray-900 truncate`}>{payment.contract_number}</p>
                        <p className={`${compact.smallText} text-gray-600 truncate mt-0.5`}>{payment.tenant_name}</p>
                      </div>
                      <span className={`${compact.textSize} font-bold text-green-600 whitespace-nowrap ml-2`}>
                        {formatAmount(payment.amount)} {payment.currency || 'с'}
                      </span>
                    </div>
                    <div className={`${compact.smallText} text-gray-500`}>
                      {new Date(payment.payment_date).toLocaleDateString('ru-RU')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
