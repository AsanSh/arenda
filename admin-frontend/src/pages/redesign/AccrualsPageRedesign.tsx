import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../../components/redesign/layout/PageHeader';
import { ResponsiveDataView } from '../../components/redesign/data/ResponsiveDataView';
import { Column } from '../../components/redesign/data/DataTable';
import { Amount } from '../../components/redesign/ui/Amount';
import { StatusChip } from '../../components/redesign/ui/StatusChip';
import { EmptyState } from '../../components/redesign/ui/EmptyState';
import { ErrorState } from '../../components/redesign/ui/ErrorState';
import { Calculator, Plus } from 'lucide-react';
import client from '../../api/client';

interface Accrual {
  id: number;
  property_address: string;
  tenant_name: string;
  contract_number: string;
  due_date: string;
  final_amount: string;
  balance: string;
  status: 'overdue' | 'due_soon' | 'paid';
  overdue_days?: number;
}

export default function AccrualsPageRedesign() {
  const [accruals, setAccruals] = useState<Accrual[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccruals();
  }, []);

  const fetchAccruals = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await client.get('/api/accruals/');
      setAccruals(response.data.results || response.data || []);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<Accrual>[] = useMemo(
    () => [
      {
        key: 'property',
        header: 'Недвижимость',
        accessor: (row) => row.property_address,
        sortable: true,
      },
      {
        key: 'tenant',
        header: 'Контрагент',
        accessor: (row) => row.tenant_name,
        sortable: true,
      },
      {
        key: 'contract',
        header: 'Договор',
        accessor: (row) => row.contract_number,
        sortable: true,
      },
      {
        key: 'due_date',
        header: 'Срок оплаты',
        accessor: (row) =>
          new Date(row.due_date).toLocaleDateString('ru-RU'),
        sortable: true,
      },
      {
        key: 'amount',
        header: 'Сумма',
        accessor: (row) => <Amount value={row.final_amount} />,
        sortable: true,
        align: 'right',
      },
      {
        key: 'balance',
        header: 'Остаток',
        accessor: (row) => <Amount value={row.balance} />,
        sortable: true,
        align: 'right',
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

  const toCardData = (row: Accrual) => ({
    id: row.id,
    primary: row.property_address,
    secondary: row.tenant_name,
    tertiary: `Договор: ${row.contract_number} • Срок: ${new Date(row.due_date).toLocaleDateString('ru-RU')}`,
    amount: row.balance,
    status: row.status,
    date: row.overdue_days ? `${row.overdue_days} дн` : undefined,
  });

  if (error) {
    return <ErrorState onRetry={fetchAccruals} />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Начисления"
        subtitle="Управление начислениями по договорам"
        primaryAction={{
          label: 'Создать начисление',
          onClick: () => console.log('Create accrual'),
          icon: Plus,
        }}
      />

      {accruals.length === 0 && !loading ? (
        <EmptyState
          icon={Calculator}
          title="Нет начислений"
          description="Создайте первое начисление для начала работы"
          action={{
            label: 'Создать начисление',
            onClick: () => console.log('Create accrual'),
          }}
        />
      ) : (
        <ResponsiveDataView
          data={accruals}
          columns={columns}
          toCardData={toCardData}
          onRowClick={(row) => console.log('Row clicked', row)}
          loading={loading}
          emptyMessage="Нет начислений"
        />
      )}
    </div>
  );
}
