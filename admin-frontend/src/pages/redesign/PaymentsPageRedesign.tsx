import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/redesign/layout/PageHeader';
import { ResponsiveDataView } from '../../components/redesign/data/ResponsiveDataView';
import { Column } from '../../components/redesign/data/DataTable';
import { Amount } from '../../components/redesign/ui/Amount';
import { StatusChip } from '../../components/redesign/ui/StatusChip';
import { EmptyState } from '../../components/redesign/ui/EmptyState';
import { ErrorState } from '../../components/redesign/ui/ErrorState';
import { CreditCard, Plus } from 'lucide-react';
import client from '../../api/client';

interface Payment {
  id: number;
  contract_number: string;
  tenant_name: string;
  amount: string;
  payment_date: string;
  payment_method?: string;
  status: 'paid' | 'pending';
}

export default function PaymentsPageRedesign() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get('/api/payments/');
      setPayments(response.data.results || response.data || []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Payment>[] = useMemo(
    () => [
      {
        key: 'contract',
        header: 'Договор',
        accessor: (row) => row.contract_number,
        sortable: true,
      },
      {
        key: 'tenant',
        header: 'Контрагент',
        accessor: (row) => row.tenant_name,
        sortable: true,
      },
      {
        key: 'amount',
        header: 'Сумма',
        accessor: (row) => <Amount value={row.amount} />,
        sortable: true,
        align: 'right',
      },
      {
        key: 'date',
        header: 'Дата',
        accessor: (row) =>
          new Date(row.payment_date).toLocaleDateString('ru-RU'),
        sortable: true,
      },
      {
        key: 'method',
        header: 'Способ',
        accessor: (row) => row.payment_method || '—',
        sortable: false,
      },
      {
        key: 'status',
        header: 'Статус',
        accessor: (row) => <StatusChip status={row.status} size="small" />,
        sortable: false,
        align: 'center',
      },
    ],
    []
  );

  const toCardData = (row: Payment) => ({
    id: row.id,
    primary: row.contract_number,
    secondary: row.tenant_name,
    tertiary: `${new Date(row.payment_date).toLocaleDateString('ru-RU')}${row.payment_method ? ` • ${row.payment_method}` : ''}`,
    amount: row.amount,
    status: row.status,
  });

  if (error) {
    return <ErrorState onRetry={fetchPayments} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Поступления"
        subtitle="История платежей и поступлений"
        primaryAction={{
          label: 'Добавить платеж',
          onClick: () => console.log('Add payment'),
          icon: Plus,
        }}
      />

      {payments.length === 0 && !loading ? (
        <EmptyState
          icon={CreditCard}
          title="Нет платежей"
          description="Добавьте первый платеж для начала работы"
          action={{
            label: 'Добавить платеж',
            onClick: () => console.log('Add payment'),
          }}
        />
      ) : (
        <ResponsiveDataView
          data={payments}
          columns={columns}
          toCardData={toCardData}
          onRowClick={(row) => console.log('Row clicked', row)}
          loading={loading}
          emptyMessage="Нет платежей"
        />
      )}
    </div>
  );
}
