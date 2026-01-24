import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { formatAmount } from '../utils/currency';
import { useCompactStyles } from '../hooks/useCompactStyles';
import { ArrowLeft, FileText, Home, Calculator, CreditCard, Banknote, Edit, Trash2 } from 'lucide-react';
import { useUser } from '../contexts/UserContext';

interface Tenant {
  id: number;
  name: string;
  type: string;
  type_display: string;
  contact_person: string;
  email: string;
  phone: string;
  inn: string;
  address: string;
  comment: string;
}

interface Contract {
  id: number;
  number: string;
  property_name: string;
  property_address: string;
  start_date: string;
  end_date: string;
  rent_amount: string;
  currency: string;
  status: string;
}

interface Property {
  id: number;
  name: string;
  address: string;
  type: string;
  area: string;
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const compact = useCompactStyles();
  const { user, canWrite } = useUser();
  const canEdit = canWrite('tenants');
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalContracts: 0,
    activeContracts: 0,
    totalAccruals: '0',
    totalPayments: '0',
    balance: '0',
  });

  useEffect(() => {
    if (id) {
      fetchTenantData();
    }
  }, [id]);

  const fetchTenantData = async () => {
    try {
      setLoading(true);
      
      // Загружаем данные контрагента
      const tenantResponse = await client.get(`/tenants/${id}/`);
      setTenant(tenantResponse.data);
      
      // Загружаем договоры контрагента
      const contractsResponse = await client.get(`/contracts/?tenant=${id}`);
      const contractsData = contractsResponse.data.results || contractsResponse.data || [];
      setContracts(contractsData);
      
      // Извлекаем уникальные объекты недвижимости из договоров
      const propertyIdsSet = new Set(contractsData.map((c: any) => c.property).filter(Boolean));
      const propertyIds = Array.from(propertyIdsSet);
      const propertiesData: Property[] = [];
      
      for (const propId of propertyIds) {
        try {
          const propResponse = await client.get(`/properties/${propId}/`);
          propertiesData.push({
            id: propResponse.data.id,
            name: propResponse.data.name,
            address: propResponse.data.address || '',
            type: propResponse.data.type || '',
            area: propResponse.data.area || '',
          });
        } catch (err) {
          console.error(`Error fetching property ${propId}:`, err);
        }
      }
      setProperties(propertiesData);
      
      // Загружаем статистику
      const accrualsResponse = await client.get(`/accruals/?contract__tenant=${id}`);
      const accrualsData = accrualsResponse.data.results || accrualsResponse.data || [];
      const totalAccruals = accrualsData.reduce((sum: number, a: any) => sum + parseFloat(a.final_amount || 0), 0);
      const totalPaid = accrualsData.reduce((sum: number, a: any) => sum + parseFloat(a.paid_amount || 0), 0);
      const balance = accrualsData.reduce((sum: number, a: any) => sum + parseFloat(a.balance || 0), 0);
      
      const paymentsResponse = await client.get(`/payments/?contract__tenant=${id}`);
      const paymentsData = paymentsResponse.data.results || paymentsResponse.data || [];
      const totalPayments = paymentsData.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
      
      setStats({
        totalContracts: contractsData.length,
        activeContracts: contractsData.filter((c: Contract) => c.status === 'active').length,
        totalAccruals: totalAccruals.toString(),
        totalPayments: totalPayments.toString(),
        balance: balance.toString(),
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tenant data:', error);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!tenant) return;
    
    if (!window.confirm(`Вы уверены, что хотите удалить контрагента "${tenant.name}"? Это действие нельзя отменить.`)) {
      return;
    }

    try {
      await client.delete(`/tenants/${tenant.id}/`);
      navigate('/tenants');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка при удалении контрагента');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  if (!tenant) {
    return <div className="text-center py-12">Контрагент не найден</div>;
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/tenants')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </button>
          <div>
            <h1 className={`${compact.sectionHeader} text-slate-900`}>{tenant.name}</h1>
            <p className={`${compact.textSize} text-slate-500`}>{tenant.type_display}</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/tenants?edit=${tenant.id}`)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Edit className="h-4 w-4" />
              Редактировать
            </button>
            {tenant.type !== 'admin' && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Удалить
              </button>
            )}
          </div>
        )}
      </div>

      {/* Информация о контрагенте */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className={`${compact.sectionHeader} text-slate-900 mb-4`}>Информация о контрагенте</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className={`${compact.textSize} text-slate-500`}>Контактное лицо:</span>
            <p className={`${compact.textSize} font-medium text-slate-900`}>{tenant.contact_person || '—'}</p>
          </div>
          <div>
            <span className={`${compact.textSize} text-slate-500`}>Email:</span>
            <p className={`${compact.textSize} font-medium text-slate-900`}>{tenant.email || '—'}</p>
          </div>
          <div>
            <span className={`${compact.textSize} text-slate-500`}>Телефон:</span>
            <p className={`${compact.textSize} font-medium text-slate-900`}>{tenant.phone || '—'}</p>
          </div>
          <div>
            <span className={`${compact.textSize} text-slate-500`}>ИНН:</span>
            <p className={`${compact.textSize} font-medium text-slate-900`}>{tenant.inn || '—'}</p>
          </div>
          {tenant.address && (
            <div className="md:col-span-2">
              <span className={`${compact.textSize} text-slate-500`}>Адрес:</span>
              <p className={`${compact.textSize} font-medium text-slate-900`}>{tenant.address}</p>
            </div>
          )}
          {tenant.comment && (
            <div className="md:col-span-2">
              <span className={`${compact.textSize} text-slate-500`}>Комментарий:</span>
              <p className={`${compact.textSize} text-slate-700`}>{tenant.comment}</p>
            </div>
          )}
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className={`${compact.smallText} text-slate-500 mb-1`}>Всего договоров</div>
          <div className={`${compact.kpiNumber} font-bold text-slate-900`}>{stats.totalContracts}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className={`${compact.smallText} text-slate-500 mb-1`}>Активных</div>
          <div className={`${compact.kpiNumber} font-bold text-green-600`}>{stats.activeContracts}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className={`${compact.smallText} text-slate-500 mb-1`}>Начислено</div>
          <div className={`${compact.kpiNumber} font-bold text-slate-900`}>{formatAmount(stats.totalAccruals)} с</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className={`${compact.smallText} text-slate-500 mb-1`}>Оплачено</div>
          <div className={`${compact.kpiNumber} font-bold text-green-600`}>{formatAmount(stats.totalPayments)} с</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className={`${compact.smallText} text-slate-500 mb-1`}>Остаток</div>
          <div className={`${compact.kpiNumber} font-bold ${parseFloat(stats.balance) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {formatAmount(stats.balance)} с
          </div>
        </div>
      </div>

      {/* Объекты недвижимости */}
      {properties.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className={`${compact.sectionHeader} text-slate-900 flex items-center gap-2`}>
              <Home className="h-5 w-5" />
              Объекты недвижимости ({properties.length})
            </h2>
          </div>
          <div className="space-y-2">
            {properties.map((property) => (
              <div
                key={property.id}
                className="p-3 border border-gray-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => navigate(`/properties/${property.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${compact.textSize} font-medium text-slate-900`}>{property.name}</p>
                    {property.address && (
                      <p className={`${compact.smallText} text-slate-500`}>{property.address}</p>
                    )}
                  </div>
                  <div className="text-right">
                    {property.type && (
                      <p className={`${compact.smallText} text-slate-600`}>{property.type}</p>
                    )}
                    {property.area && (
                      <p className={`${compact.smallText} text-slate-500`}>{property.area} м²</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Договоры */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`${compact.sectionHeader} text-slate-900 flex items-center gap-2`}>
            <FileText className="h-5 w-5" />
            Договоры ({contracts.length})
          </h2>
        </div>
        {contracts.length === 0 ? (
          <p className={`${compact.textSize} text-slate-500 text-center py-8`}>Нет договоров</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-gray-200">
                <tr>
                  <th className={`${compact.headerPadding} ${compact.headerText} text-left text-slate-700`}>№ договора</th>
                  <th className={`${compact.headerPadding} ${compact.headerText} text-left text-slate-700`}>Объект</th>
                  <th className={`${compact.headerPadding} ${compact.headerText} text-left text-slate-700`}>Период</th>
                  <th className={`${compact.headerPadding} ${compact.headerText} text-left text-slate-700`}>Ставка</th>
                  <th className={`${compact.headerPadding} ${compact.headerText} text-left text-slate-700`}>Статус</th>
                  <th className={`${compact.headerPadding} ${compact.headerText} text-right text-slate-700`}>Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-slate-50 transition-colors">
                    <td className={`${compact.cellPadding} ${compact.tableText} font-medium text-slate-900`}>
                      {contract.number}
                    </td>
                    <td className={`${compact.cellPadding} ${compact.tableText} text-slate-600`}>
                      <div>
                        <p className="font-medium">{contract.property_name}</p>
                        {contract.property_address && (
                          <p className={`${compact.smallText} text-slate-500`}>{contract.property_address}</p>
                        )}
                      </div>
                    </td>
                    <td className={`${compact.cellPadding} ${compact.tableText} text-slate-600`}>
                      {new Date(contract.start_date).toLocaleDateString('ru-RU')} → {new Date(contract.end_date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className={`${compact.cellPadding} ${compact.tableText} font-medium text-slate-900`}>
                      {formatAmount(contract.rent_amount)} {contract.currency || 'сом'}
                    </td>
                    <td className={`${compact.cellPadding} ${compact.tableText}`}>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        contract.status === 'active' ? 'bg-green-100 text-green-700' :
                        contract.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {contract.status === 'active' ? 'Активный' :
                         contract.status === 'draft' ? 'Черновик' :
                         'Завершен'}
                      </span>
                    </td>
                    <td className={`${compact.cellPadding} text-right`}>
                      <button
                        onClick={() => navigate(`/contracts/${contract.id}`)}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Открыть →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
