import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import client from '../api/client';
import Drawer from '../components/Drawer';
import { useUser } from '../contexts/UserContext';
import { useCompactStyles } from '../hooks/useCompactStyles';

interface Request {
  id: number;
  created_at: string;
  created_by_name: string;
  role: string;
  type: string;
  type_display: string;
  subject: string;
  message: string;
  status: string;
  status_display: string;
  assigned_to_name?: string;
  public_reply?: string;
  related_contract_number?: string;
  related_property_name?: string;
  updated_at: string;
}

const REQUEST_TYPES = [
  { value: 'CHANGE_CONTACTS', label: 'Изменение контактов' },
  { value: 'CHANGE_REQUISITES', label: 'Изменение реквизитов' },
  { value: 'CONTRACT_QUESTION', label: 'Вопрос по договору' },
  { value: 'PAYMENT_QUESTION', label: 'Вопрос по платежам' },
  { value: 'REQUEST_DOCUMENT', label: 'Запрос документа/справки' },
  { value: 'PROPERTY_ISSUE', label: 'Проблема с объектом' },
  { value: 'OTHER', label: 'Прочее' },
];

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  IN_REVIEW: 'bg-yellow-100 text-yellow-800',
  NEED_INFO: 'bg-orange-100 text-orange-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  DONE: 'bg-gray-100 text-gray-800',
};

export default function RequestsPage() {
  const { user } = useUser();
  const compact = useCompactStyles();
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
  });
  const [formData, setFormData] = useState({
    type: '',
    subject: '',
    message: '',
    related_contract: '',
    related_property: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filters]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      
      const response = await client.get(`/requests/${params.toString() ? '?' + params.toString() : ''}`);
      setRequests(response.data.results || response.data);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({
      type: '',
      subject: '',
      message: '',
      related_contract: '',
      related_property: '',
    });
    setSelectedRequest(null);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    
    try {
      const payload: any = {
        type: formData.type,
        subject: formData.subject,
        message: formData.message,
      };
      
      if (formData.related_contract) {
        payload.related_contract = parseInt(formData.related_contract);
      }
      if (formData.related_property) {
        payload.related_property = parseInt(formData.related_property);
      }
      
      await client.post('/requests/', payload);
      setIsDrawerOpen(false);
      fetchRequests();
    } catch (error: any) {
      console.error('Error creating request:', error);
      alert(error.response?.data?.detail || 'Ошибка при создании заявки');
    } finally {
      setFormLoading(false);
    }
  };

  const handleReply = async (requestId: number, message: string) => {
    try {
      await client.post(`/requests/${requestId}/reply/`, { message });
      fetchRequests();
    } catch (error: any) {
      console.error('Error replying to request:', error);
      alert(error.response?.data?.error || 'Ошибка при отправке ответа');
    }
  };

  const handleStatusChange = async (requestId: number, status: string, reply?: string) => {
    try {
      await client.post(`/requests/${requestId}/reply/`, {
        status,
        public_reply: reply || '',
      });
      fetchRequests();
    } catch (error: any) {
      console.error('Error updating request status:', error);
      alert(error.response?.data?.error || 'Ошибка при обновлении статуса');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  const isStaff = user?.is_staff || false;

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className={compact.sectionHeader + ' text-slate-900'}>Заявки</h1>
          <p className={`mt-0.5 ${compact.smallText} text-slate-500`}>
            {isStaff ? 'Управление заявками клиентов' : 'Мои заявки и запросы'}
          </p>
        </div>
        {!isStaff && (
          <button
            onClick={handleCreate}
            className={`flex items-center gap-1.5 ${compact.buttonPadding} bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 transition-colors ${compact.buttonText} font-medium`}
          >
            <Plus className={compact.iconSize} />
            Создать заявку
          </button>
        )}
      </div>

      {/* Фильтры */}
      {isStaff && (
        <div className={`bg-white ${compact.cardPaddingSmall} rounded-lg shadow-sm border border-gray-200`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`${compact.smallText} font-medium text-gray-700`}>Фильтр:</span>
            <button
              onClick={() => setFilters({ ...filters, status: '' })}
              className={`px-2 py-1 ${compact.smallText} font-medium rounded-lg transition-colors ${
                !filters.status
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Все статусы
            </button>
            {['NEW', 'IN_REVIEW', 'DONE'].map((status) => (
              <button
                key={status}
                onClick={() => setFilters({ ...filters, status })}
                className={`px-2 py-1 ${compact.smallText} font-medium rounded-lg transition-colors ${
                  filters.status === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'NEW' ? 'Новые' : status === 'IN_REVIEW' ? 'На рассмотрении' : 'Выполненные'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Список заявок */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className={`${compact.headerPadding} text-left ${compact.headerText} text-gray-500 tracking-wider`}>
                  Дата
                </th>
                <th className={`${compact.headerPadding} text-left ${compact.headerText} text-gray-500 tracking-wider`}>
                  Тип
                </th>
                <th className={`${compact.headerPadding} text-left ${compact.headerText} text-gray-500 tracking-wider`}>
                  Тема
                </th>
                {isStaff && (
                  <th className={`${compact.headerPadding} text-left ${compact.headerText} text-gray-500 tracking-wider`}>
                    От
                  </th>
                )}
                <th className={`${compact.headerPadding} text-left ${compact.headerText} text-gray-500 tracking-wider`}>
                  Статус
                </th>
                {isStaff && (
                  <th className={`${compact.headerPadding} text-left ${compact.headerText} text-gray-500 tracking-wider`}>
                    Назначено
                  </th>
                )}
                <th className={`${compact.headerPadding} text-right ${compact.headerText} text-gray-500 tracking-wider`}>
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={isStaff ? 7 : 5} className={`${compact.cellPadding} text-center text-gray-500`}>
                    Нет заявок
                  </td>
                </tr>
              ) : (
                requests.map((request) => (
                  <tr key={request.id} className={`hover:bg-slate-50 transition-colors group ${compact.rowHeight}`}>
                    <td className={compact.cellPadding}>
                      <div className={compact.tableText}>
                        {new Date(request.created_at).toLocaleDateString('ru-RU')}
                      </div>
                    </td>
                    <td className={compact.cellPadding}>
                      <div className={compact.tableText}>{request.type_display}</div>
                    </td>
                    <td className={compact.cellPadding}>
                      <div className={`${compact.tableText} font-medium`}>{request.subject}</div>
                    </td>
                    {isStaff && (
                      <td className={compact.cellPadding}>
                        <div className={compact.tableText}>{request.created_by_name}</div>
                      </td>
                    )}
                    <td className={compact.cellPadding}>
                      <span className={`px-1.5 py-0.5 ${compact.smallText} rounded-full ${STATUS_COLORS[request.status] || 'bg-gray-100 text-gray-800'}`}>
                        {request.status_display}
                      </span>
                    </td>
                    {isStaff && (
                      <td className={compact.cellPadding}>
                        <div className={compact.tableText}>{request.assigned_to_name || '—'}</div>
                      </td>
                    )}
                    <td className={`${compact.cellPadding} text-right`}>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setIsDrawerOpen(true);
                        }}
                        className={`px-2 py-0.5 ${compact.smallText} font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors`}
                      >
                        Просмотр
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer для создания/просмотра заявки */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedRequest(null);
        }}
        title={selectedRequest ? `Заявка: ${selectedRequest.subject}` : 'Создать заявку'}
        footer={
          !selectedRequest ? (
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className={`${compact.buttonPadding} ${compact.buttonText} font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors`}
              >
                Отмена
              </button>
              <button
                type="submit"
                form="request-form"
                disabled={formLoading}
                className={`${compact.buttonPadding} ${compact.buttonText} font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50`}
              >
                {formLoading ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          ) : null
        }
      >
        {selectedRequest ? (
          <div className="space-y-4">
            <div>
              <h3 className={`${compact.textSize} font-medium text-gray-700 mb-1`}>Тип</h3>
              <p className={compact.textSize}>{selectedRequest.type_display}</p>
            </div>
            <div>
              <h3 className={`${compact.textSize} font-medium text-gray-700 mb-1`}>Сообщение</h3>
              <p className={`${compact.textSize} whitespace-pre-wrap`}>{selectedRequest.message}</p>
            </div>
            {selectedRequest.public_reply && (
              <div>
                <h3 className={`${compact.textSize} font-medium text-gray-700 mb-1`}>Ответ</h3>
                <p className={`${compact.textSize} whitespace-pre-wrap bg-green-50 p-2 rounded`}>
                  {selectedRequest.public_reply}
                </p>
              </div>
            )}
            {isStaff && (
              <div className="mt-4 pt-4 border-t">
                <h3 className={`${compact.textSize} font-medium text-gray-700 mb-2`}>Управление</h3>
                <div className="space-y-2">
                  <select
                    value={selectedRequest.status}
                    onChange={(e) => handleStatusChange(selectedRequest.id, e.target.value)}
                    className={`w-full ${compact.buttonPadding} ${compact.textSize} border border-gray-300 rounded-lg`}
                  >
                    <option value="NEW">Новая</option>
                    <option value="IN_REVIEW">На рассмотрении</option>
                    <option value="NEED_INFO">Требуется информация</option>
                    <option value="APPROVED">Одобрена</option>
                    <option value="REJECTED">Отклонена</option>
                    <option value="DONE">Выполнена</option>
                  </select>
                  <textarea
                    placeholder="Публичный ответ клиенту..."
                    className={`w-full ${compact.buttonPadding} ${compact.textSize} border border-gray-300 rounded-lg`}
                    rows={3}
                    onBlur={(e) => {
                      if (e.target.value) {
                        handleStatusChange(selectedRequest.id, selectedRequest.status, e.target.value);
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <form id="request-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block ${compact.textSize} font-medium text-gray-700 mb-1`}>
                Тип заявки *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className={`w-full ${compact.buttonPadding} ${compact.textSize} border border-gray-300 rounded-lg`}
              >
                <option value="">Выберите тип</option>
                {REQUEST_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block ${compact.textSize} font-medium text-gray-700 mb-1`}>
                Тема *
              </label>
              <input
                type="text"
                required
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className={`w-full ${compact.buttonPadding} ${compact.textSize} border border-gray-300 rounded-lg`}
                placeholder="Краткое описание"
              />
            </div>
            <div>
              <label className={`block ${compact.textSize} font-medium text-gray-700 mb-1`}>
                Сообщение *
              </label>
              <textarea
                required
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className={`w-full ${compact.buttonPadding} ${compact.textSize} border border-gray-300 rounded-lg`}
                rows={5}
                placeholder="Подробное описание вашего запроса..."
              />
            </div>
          </form>
        )}
      </Drawer>
    </div>
  );
}
