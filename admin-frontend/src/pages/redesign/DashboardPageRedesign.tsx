import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/redesign/layout/PageHeader';
import { KPIStatCard } from '../../components/redesign/ui/KPIStatCard';
import { Amount } from '../../components/redesign/ui/Amount';
import { StatusChip } from '../../components/redesign/ui/StatusChip';
import { DataCardList, CardData } from '../../components/redesign/data/DataCardList';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import {
  Calculator,
  CreditCard,
  FileText,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import client from '../../api/client';

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
}

interface Accrual {
  id: number;
  property_address: string;
  tenant_name: string;
  due_date: string;
  balance: string;
  final_amount: string;
  overdue_days?: number;
}

interface Payment {
  id: number;
  contract_number: string;
  tenant_name: string;
  amount: string;
  payment_date: string;
}

export default function DashboardPageRedesign() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [overdue, setOverdue] = useState<Accrual[]>([]);
  const [upcoming, setUpcoming] = useState<Accrual[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overdue' | 'upcoming' | 'payments'>('overdue');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, overdueRes, upcomingRes, paymentsRes] = await Promise.all([
        client.get('/api/dashboard/stats/'),
        client.get('/api/dashboard/overdue/'),
        client.get('/api/dashboard/upcoming/'),
        client.get('/api/dashboard/recent-payments/'),
      ]);

      setStats(statsRes.data);
      setOverdue(overdueRes.data.results || overdueRes.data || []);
      setUpcoming(upcomingRes.data.results || upcomingRes.data || []);
      setRecentPayments(paymentsRes.data.results || paymentsRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // KPI Cards Data
  const kpiCards = useMemo(() => {
    if (!stats) return [];

    return [
      {
        label: 'ИТОГО НАЧИСЛЕНО',
        value: <Amount value={stats.accruals.total} />,
        change: { value: 12.5, isPositive: false },
        icon: Calculator,
        variant: 'default' as const,
      },
      {
        label: 'ИТОГО ОПЛАЧЕНО',
        value: <Amount value={stats.accruals.paid} />,
        change: { value: 8.3, isPositive: false },
        icon: CreditCard,
        variant: 'success' as const,
      },
      {
        label: 'ОСТАТОК К ОПЛАТЕ',
        value: <Amount value={stats.accruals.balance} />,
        change: { value: 5.2, isPositive: false },
        icon: FileText,
        variant: 'warning' as const,
      },
      {
        label: 'ПРОСРОЧЕНО',
        value: (
          <div>
            <Amount value={stats.accruals.overdue_amount} />
            <span className="text-xs font-normal text-slate-600 ml-2">
              ({stats.accruals.overdue_count} начислений)
            </span>
          </div>
        ),
        change: { value: 15.7, isPositive: true },
        icon: TrendingUp,
        variant: 'error' as const,
      },
    ];
  }, [stats]);

  // Convert to CardData
  const overdueCards: CardData[] = useMemo(
    () =>
      overdue.map((item) => ({
        id: item.id,
        primary: item.property_address,
        secondary: item.tenant_name,
        tertiary: `Срок: ${new Date(item.due_date).toLocaleDateString('ru-RU')}`,
        amount: item.balance,
        status: 'overdue' as const,
        date: item.overdue_days ? `${item.overdue_days} дн` : undefined,
      })),
    [overdue]
  );

  const upcomingCards: CardData[] = useMemo(
    () =>
      upcoming.map((item) => ({
        id: item.id,
        primary: item.property_address,
        secondary: item.tenant_name,
        tertiary: `Срок: ${new Date(item.due_date).toLocaleDateString('ru-RU')}`,
        amount: item.balance,
        status: 'due_soon' as const,
      })),
    [upcoming]
  );

  const paymentCards: CardData[] = useMemo(
    () =>
      recentPayments.map((item) => ({
        id: item.id,
        primary: item.contract_number,
        secondary: item.tenant_name,
        tertiary: new Date(item.payment_date).toLocaleDateString('ru-RU'),
        amount: item.amount,
        status: 'paid' as const,
      })),
    [recentPayments]
  );

  const activeCards =
    activeTab === 'overdue'
      ? overdueCards
      : activeTab === 'upcoming'
      ? upcomingCards
      : paymentCards;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-slate-200 rounded animate-pulse" />
        <div className="flex gap-4 overflow-x-auto pb-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[200px] h-32 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Дашборд"
        subtitle="Обзор финансовых показателей"
        primaryAction={{
          label: 'Создать начисление',
          onClick: () => console.log('Create accrual'),
          icon: Calculator,
        }}
      />

      {/* KPI Cards - Horizontal scroll on mobile */}
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {kpiCards.map((kpi, index) => (
          <KPIStatCard key={index} {...kpi} />
        ))}
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 mb-1">Недвижимость</p>
          <p className="text-2xl font-semibold text-slate-900">
            {stats?.general.properties || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 mb-1">Контрагенты</p>
          <p className="text-2xl font-semibold text-slate-900">
            {stats?.general.tenants || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 mb-1">Активные договоры</p>
          <p className="text-2xl font-semibold text-slate-900">
            {stats?.general.contracts || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 mb-1">Баланс счетов</p>
          <p className="text-2xl font-semibold text-slate-900">
            <Amount value={stats?.general.account_balance || '0'} />
          </p>
        </div>
      </div>

      {/* Lists - Tabs on mobile, side-by-side on desktop */}
      {isMobile ? (
        <div>
          <div className="flex gap-2 mb-4 border-b border-slate-200">
            {[
              { key: 'overdue', label: 'Просроченные' },
              { key: 'upcoming', label: 'К оплате' },
              { key: 'payments', label: 'Последние платежи' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`
                  px-4 py-2 text-sm font-medium border-b-2 transition-colors
                  ${
                    activeTab === tab.key
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <DataCardList
            data={activeCards}
            onCardClick={(card) => console.log('Card clicked', card)}
            emptyMessage={`Нет ${activeTab === 'overdue' ? 'просроченных' : activeTab === 'upcoming' ? 'к оплате' : 'платежей'}`}
          />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Просроченные
              </h2>
              <Link
                to="/accruals?status=overdue"
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Все <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <DataCardList
              data={overdueCards.slice(0, 5)}
              emptyMessage="Нет просроченных"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                К оплате
              </h2>
              <Link
                to="/accruals?status=due_soon"
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Все <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <DataCardList
              data={upcomingCards.slice(0, 5)}
              emptyMessage="Нет к оплате"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Последние платежи
              </h2>
              <Link
                to="/payments"
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                Все <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <DataCardList
              data={paymentCards.slice(0, 5)}
              emptyMessage="Нет платежей"
            />
          </div>
        </div>
      )}
    </div>
  );
}
