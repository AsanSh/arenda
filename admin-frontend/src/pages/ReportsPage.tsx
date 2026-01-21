import React, { useState, useEffect } from 'react';
import client from '../api/client';
import { formatCurrency } from '../utils/currency';
import PeriodFilterBar from '../components/PeriodFilterBar';
import { DatePreset, getPresetRange } from '../utils/datePresets';

interface Property {
  id: number;
  name: string;
  address: string;
}

interface Tenant {
  id: number;
  name: string;
}

type ReportType = 'profit_loss' | 'cash_flow' | 'overdue';

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('profit_loss');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  
  const [dateFilter, setDateFilter] = useState<{ preset: DatePreset | null; from: string | null; to: string | null }>({
    preset: 'current_month',
    from: null,
    to: null,
  });
  
  const [selectedProperty, setSelectedProperty] = useState<number | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<number | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<number | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  
  const [expandedSections, setExpandedSections] = useState<{
    revenue: boolean;
    received: boolean;
    expenses: boolean;
    profit: boolean;
  }>({
    revenue: false,
    received: false,
    expenses: false,
    profit: false,
  });

  useEffect(() => {
    fetchProperties();
    fetchTenants();
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (dateFilter.preset || (dateFilter.from && dateFilter.to)) {
      fetchReport();
    }
  }, [reportType, dateFilter, selectedProperty, selectedTenant, selectedAccount]);

  const fetchProperties = async () => {
    try {
      const response = await client.get('/properties/');
      setProperties(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await client.get('/tenants/');
      setTenants(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const response = await client.get('/accounts/');
      setAccounts(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      let url = '';
      const params = new URLSearchParams();
      
      // Определяем период
      let fromDateStr: string | null = null;
      let toDateStr: string | null = null;
      let isAllTime = false;
      
      if (dateFilter.preset) {
        if (dateFilter.preset === 'all_time') {
          isAllTime = true;
        } else {
          const range = getPresetRange(dateFilter.preset);
          fromDateStr = range.from;
          toDateStr = range.to;
        }
      } else if (dateFilter.from && dateFilter.to) {
        fromDateStr = dateFilter.from;
        toDateStr = dateFilter.to;
      }
      
      if (isAllTime) {
        params.append('all_time', 'true');
      } else {
        if (fromDateStr) params.append('from', fromDateStr);
        if (toDateStr) params.append('to', toDateStr);
      }
      
      if (selectedProperty) params.append('property_id', selectedProperty.toString());
      if (selectedTenant) params.append('tenant_id', selectedTenant.toString());
      if (selectedAccount && reportType === 'cash_flow') params.append('account_id', selectedAccount.toString());
      
      // Выбираем endpoint в зависимости от типа отчета
      if (reportType === 'profit_loss') {
        url = '/reports/profit_and_loss/';
      } else if (reportType === 'cash_flow') {
        url = '/reports/cash_flow/';
      } else if (reportType === 'overdue') {
        url = '/reports/overdue_payments/';
        // Для просроченных не нужны даты периода
        params.delete('from');
        params.delete('to');
        params.delete('all_time');
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await client.get(url);
      setReportData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching report:', error);
      setLoading(false);
    }
  };

  const toggleSection = (section: 'revenue' | 'received' | 'expenses' | 'profit') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderProfitLossReport = () => {
    if (!reportData || !reportData.summary) return null;
    
    const { summary, details } = reportData;
    const periodText = reportData.period?.all_time 
      ? 'Все время'
      : reportData.period?.from && reportData.period?.to
      ? `${new Date(reportData.period.from).toLocaleDateString('ru-RU')} - ${new Date(reportData.period.to).toLocaleDateString('ru-RU')}`
      : '';
    
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Отчет о прибылях и убытках</h2>
            {periodText && (
              <p className="text-sm text-gray-500 mt-1">Период: {periodText}</p>
            )}
          </div>
          
          <div className="divide-y divide-gray-200">
            {/* Доходы */}
            <div>
              <button
                onClick={() => toggleSection('revenue')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Доходы (начислено)</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-bold text-gray-900">
                    {formatCurrency(summary.revenue || '0', 'KGS')}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transform transition-transform ${
                      expandedSections.revenue ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expandedSections.revenue && details?.revenue && (
                <div className="px-6 py-4 bg-gray-50 border-t">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Недвижимость</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Контрагент</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Договор</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Период</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Сумма</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {details.revenue.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-sm">
                              <div className="font-medium text-gray-900">{item.property_name}</div>
                              <div className="text-xs text-gray-500">{item.property_address}</div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">{item.tenant_name}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{item.contract_number}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {new Date(item.period_start).toLocaleDateString('ru-RU')} - {new Date(item.period_end).toLocaleDateString('ru-RU')}
                            </td>
                            <td className="px-3 py-2 text-sm font-medium text-right">
                              {formatCurrency(item.amount, item.currency || 'KGS')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Поступления */}
            <div>
              <button
                onClick={() => toggleSection('received')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Поступления</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(summary.received || '0', 'KGS')}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transform transition-transform ${
                      expandedSections.received ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expandedSections.received && details?.received && (
                <div className="px-6 py-4 bg-gray-50 border-t">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Недвижимость</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Контрагент</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Договор</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Дата</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Счет</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Сумма</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {details.received.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-sm">
                              <div className="font-medium text-gray-900">{item.property_name}</div>
                              <div className="text-xs text-gray-500">{item.property_address}</div>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">{item.tenant_name}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{item.contract_number}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {new Date(item.payment_date).toLocaleDateString('ru-RU')}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">{item.account_name || '-'}</td>
                            <td className="px-3 py-2 text-sm font-medium text-green-600 text-right">
                              {formatCurrency(item.amount, item.currency || 'KGS')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Расходы */}
            <div>
              <button
                onClick={() => toggleSection('expenses')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Расходы</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(summary.expenses || '0', 'KGS')}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transform transition-transform ${
                      expandedSections.expenses ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expandedSections.expenses && details?.expenses && (
                <div className="px-6 py-4 bg-gray-50 border-t">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Дата</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Категория</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Получатель</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Счет</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Комментарий</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Сумма</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {details.expenses.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-3 py-2 text-sm text-gray-500">
                              {new Date(item.transaction_date).toLocaleDateString('ru-RU')}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-500">{item.category || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{item.recipient || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{item.account_name || '-'}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{item.comment || '-'}</td>
                            <td className="px-3 py-2 text-sm font-medium text-red-600 text-right">
                              {formatCurrency(item.amount, item.currency || 'KGS')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Прибыль */}
            <div>
              <button
                onClick={() => toggleSection('profit')}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-gray-700">Прибыль/Убыток</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`text-lg font-bold ${parseFloat(summary.profit_loss || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.profit_loss || '0', 'KGS')}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transform transition-transform ${
                      expandedSections.profit ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {expandedSections.profit && (
                <div className="px-6 py-4 bg-gray-50 border-t">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Поступления:</span>
                      <span className="font-medium text-green-600">{formatCurrency(summary.received || '0', 'KGS')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Расходы:</span>
                      <span className="font-medium text-red-600">-{formatCurrency(summary.expenses || '0', 'KGS')}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-medium text-gray-900">Прибыль/Убыток:</span>
                      <span className={`font-bold ${parseFloat(summary.profit_loss || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(summary.profit_loss || '0', 'KGS')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCashFlowReport = () => {
    if (!reportData) return null;
    
    const periodText = reportData.period?.all_time 
      ? 'Все время'
      : reportData.period?.from && reportData.period?.to
      ? `${new Date(reportData.period.from).toLocaleDateString('ru-RU')} - ${new Date(reportData.period.to).toLocaleDateString('ru-RU')}`
      : '';

    const monthlyRows = Array.isArray(reportData.monthly)
      ? reportData.monthly
      : Object.entries(reportData.monthly || {})
          .map(([month, data]) => ({ month, ...(data as any) }))
          .sort((a, b) => (a.month || '').localeCompare(b.month || ''));
    
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Поступления</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.summary?.income || '0', 'KGS')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Расходы</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(reportData.summary?.expenses || '0', 'KGS')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Переводы входящие</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(reportData.summary?.transfers_in || '0', 'KGS')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Переводы исходящие</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(reportData.summary?.transfers_out || '0', 'KGS')}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Чистый поток</p>
              <p className={`text-2xl font-bold ${parseFloat(reportData.summary?.net_cash_flow || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(reportData.summary?.net_cash_flow || '0', 'KGS')}
              </p>
            </div>
          </div>
          {periodText && <p className="text-xs text-gray-500 mt-3">Период: {periodText}</p>}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="px-6 py-4 text-lg font-semibold border-b">По месяцам</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Месяц</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Поступления</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Расходы</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Переводы входящие</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Переводы исходящие</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Чистый поток</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyRows.map((row: any, idx: number) => {
                  const [year, monthNum] = (row.month || '').split('-');
                  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
                  const monthName = monthNum ? monthNames[parseInt(monthNum, 10) - 1] : '';
                  const displayMonth = monthName && year ? `${monthName} ${year}` : row.month || '-';
                  const netFlow = parseFloat(row.net_cash_flow || row.net_flow || '0');
                  return (
                    <tr key={row.month || idx}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{displayMonth}</td>
                      <td className="px-4 py-2 text-sm text-green-600">{formatCurrency(row.income || '0', 'KGS')}</td>
                      <td className="px-4 py-2 text-sm text-red-600">{formatCurrency(row.expenses || '0', 'KGS')}</td>
                      <td className="px-4 py-2 text-sm text-blue-600">{formatCurrency(row.transfers_in || '0', 'KGS')}</td>
                      <td className="px-4 py-2 text-sm text-orange-600">{formatCurrency(row.transfers_out || '0', 'KGS')}</td>
                      <td className={`px-4 py-2 text-sm font-medium ${netFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(row.net_cash_flow || row.net_flow || '0', 'KGS')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderOverdueReport = () => {
    if (!reportData) return null;

    const summary = reportData.summary || {};
    const tenants = Array.isArray(reportData.data) ? reportData.data : [];

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Отчет о просроченных платежах</h2>
          <p className="text-sm text-gray-500 mt-1">
            На дату: {reportData.as_of_date ? new Date(reportData.as_of_date).toLocaleDateString('ru-RU') : ''}
          </p>
          <div className="mt-3 grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Всего просрочено</p>
              <p className="text-lg font-bold text-red-600">
                {formatCurrency(summary.total_overdue ?? '0', summary.currency || 'KGS')}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Контрагентов</p>
              <p className="text-lg font-bold text-gray-900">{summary.tenants_count ?? 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Начислений</p>
              <p className="text-lg font-bold text-gray-900">{summary.accruals_count ?? 0}</p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {tenants.length === 0 && (
            <div className="px-6 py-6 text-sm text-gray-500">Нет просроченных начислений</div>
          )}
          {tenants.map((tenantData: any, idx: number) => (
            <div key={tenantData?.tenant_id ?? idx} className="border-b border-gray-200 last:border-0">
              <div className="px-6 py-4 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-gray-900">{tenantData?.tenant_name || '-'}</h3>
                    <p className="text-sm text-gray-500">
                      {(tenantData?.accruals_count ?? 0)} начислений на сумму {formatCurrency(tenantData?.total_overdue ?? '0', tenantData?.currency || 'KGS')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">
                      Макс. просрочка: {tenantData?.oldest_overdue_days ?? 0} дн.
                    </p>
                  </div>
                </div>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Недвижимость</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Договор</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Срок оплаты</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Просрочка</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Сумма</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(tenantData?.accruals || []).map((accrual: any, j: number) => (
                    <tr key={accrual?.id ?? j}>
                      <td className="px-4 py-2 text-sm">
                        <div className="font-medium text-gray-900">{accrual?.property_name || '-'}</div>
                        <div className="text-xs text-gray-500">{accrual?.property_address || ''}</div>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{accrual?.contract_number || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {accrual?.due_date ? new Date(accrual.due_date).toLocaleDateString('ru-RU') : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-red-600 font-medium">
                        {accrual?.overdue_days ?? 0} дн.
                      </td>
                      <td className="px-4 py-2 text-sm font-bold text-red-600">
                        {formatCurrency(accrual?.amount ?? '0', accrual?.currency || 'KGS')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Отчеты</h1>
      </div>

      {/* Выбор типа отчета */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setReportType('profit_loss')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === 'profit_loss'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Прибыли и убытки
          </button>
          <button
            onClick={() => setReportType('cash_flow')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === 'cash_flow'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Движение денежных средств
          </button>
          <button
            onClick={() => setReportType('overdue')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === 'overdue'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Просроченные платежи
          </button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportType !== 'overdue' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Период</label>
              <PeriodFilterBar
                value={dateFilter}
                onChange={setDateFilter}
                urlParamPrefix="report_date"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Недвижимость</label>
            <select
              value={selectedProperty || ''}
              onChange={(e) => setSelectedProperty(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Все</option>
              {properties.map(prop => (
                <option key={prop.id} value={prop.id}>{prop.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Контрагент</label>
            <select
              value={selectedTenant || ''}
              onChange={(e) => setSelectedTenant(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Все</option>
              {tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
              ))}
            </select>
          </div>
          {reportType === 'cash_flow' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Счет</label>
              <select
                value={selectedAccount || ''}
                onChange={(e) => setSelectedAccount(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Все</option>
                {accounts.map(account => (
                  <option key={account.id} value={account.id}>{account.name} ({account.currency})</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Отчет */}
      {loading ? (
        <div className="text-center py-12">Загрузка...</div>
      ) : (
        <>
          {reportType === 'profit_loss' && renderProfitLossReport()}
          {reportType === 'cash_flow' && renderCashFlowReport()}
          {reportType === 'overdue' && renderOverdueReport()}
        </>
      )}
    </div>
  );
}
