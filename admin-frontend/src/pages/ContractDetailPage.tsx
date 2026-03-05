import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { formatCurrency } from '../utils/currency';
import {
  fetchContractFiles,
  uploadContractFile,
  deleteContractFile,
  downloadContractFile,
  type ContractFile,
} from '../api/contracts';
import { FileText, Plus, Trash2 } from 'lucide-react';

interface Contract {
  id: number;
  number: string;
  signed_at: string;
  property_name: string;
  property_address: string;
  tenant_name: string;
  start_date: string;
  end_date: string;
  rent_amount: string;
  currency: string;
  status: string;
  deposit_enabled: boolean;
  advance_enabled: boolean;
  comment: string;
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [accruals, setAccruals] = useState<any[]>([]);
  const [files, setFiles] = useState<ContractFile[]>([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileDownloadingId, setFileDownloadingId] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      fetchContract();
      fetchAccruals();
      fetchContractFiles(Number(id)).then(setFiles).catch(() => setFiles([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchContract = async () => {
    try {
      const response = await client.get(`/contracts/${id}/`);
      const data = response.data;
      setContract({
        id: data.id,
        number: data.number,
        signed_at: data.signed_at,
        property_name: data.property_detail?.name || '',
        property_address: data.property_detail?.address || '',
        tenant_name: data.tenant_detail?.name || '',
        start_date: data.start_date,
        end_date: data.end_date,
        rent_amount: data.rent_amount,
        currency: data.currency,
        status: data.status,
        deposit_enabled: data.deposit_enabled,
        advance_enabled: data.advance_enabled,
        comment: data.comment || '',
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching contract:', error);
      setLoading(false);
    }
  };

  const fetchAccruals = async () => {
    try {
      const response = await client.get(`/contracts/${id}/accruals/`);
      setAccruals(response.data);
    } catch (error) {
      console.error('Error fetching accruals:', error);
    }
  };

  const handleGenerateAccruals = async () => {
    if (!window.confirm('Сгенерировать начисления для этого договора?')) {
      return;
    }
    try {
      await client.post(`/contracts/${id}/generate_accruals/`);
      window.alert('Начисления успешно сгенерированы');
      fetchAccruals();
    } catch (error: any) {
      window.alert(error.response?.data?.error || 'Ошибка при генерации начислений');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    const fileType = (document.getElementById('file-type-select') as HTMLSelectElement)?.value as 'contract' | 'supplement' | 'other' || 'contract';
    setFileUploading(true);
    try {
      const uploaded = await uploadContractFile(Number(id), file, fileType, file.name);
      setFiles((prev) => [uploaded, ...prev]);
      e.target.value = '';
    } catch (err: any) {
      window.alert(err.response?.data?.file?.[0] || err.response?.data?.detail || 'Ошибка при загрузке файла');
    } finally {
      setFileUploading(false);
    }
  };

  const handleDownloadFile = async (f: ContractFile) => {
    if (!id) return;
    setFileDownloadingId(f.id);
    try {
      const blob = await downloadContractFile(Number(id), f.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = f.title || f.file?.split('/').pop() || 'document.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      window.alert(err.response?.data?.error || err.response?.data?.detail || 'Ошибка при скачивании');
    } finally {
      setFileDownloadingId(null);
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!window.confirm('Удалить этот файл?')) return;
    try {
      await deleteContractFile(Number(id!), fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err: any) {
      window.alert(err.response?.data?.error || 'Ошибка при удалении');
    }
  };

  const getFileTypeLabel = (t: string) =>
    t === 'contract' ? 'Договор' : t === 'supplement' ? 'Доп. соглашение' : 'Прочее';

  if (loading) {
    return <div className="text-center py-12">Загрузка...</div>;
  }

  if (!contract) {
    return <div className="text-center py-12">Договор не найден</div>;
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'draft': 'Черновик',
      'active': 'Активен',
      'ended': 'Завершён',
      'cancelled': 'Отменён',
    };
    return labels[status] || status;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => navigate('/contracts')}
            className="text-primary-600 hover:text-primary-900 mb-2"
          >
            ← Назад к договорам
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Договор {contract.number}</h1>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Основная информация</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Номер договора:</span>
              <p className="font-medium">{contract.number}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Дата подписания:</span>
              <p className="font-medium">{new Date(contract.signed_at).toLocaleDateString('ru-RU')}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Объект:</span>
              <p className="font-medium">{contract.property_name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Адрес:</span>
              <p className="font-medium">{contract.property_address || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Арендатор:</span>
              <p className="font-medium">{contract.tenant_name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Период:</span>
              <p className="font-medium">
                {new Date(contract.start_date).toLocaleDateString('ru-RU')} - {new Date(contract.end_date).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Ставка:</span>
              <p className="font-medium">{formatCurrency(contract.rent_amount, contract.currency)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Статус:</span>
              <p className="font-medium">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  contract.status === 'active' ? 'bg-green-100 text-green-800' :
                  contract.status === 'ended' ? 'bg-gray-100 text-gray-800' :
                  contract.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {getStatusLabel(contract.status)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Дополнительная информация</h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Депозит:</span>
              <p className="font-medium">{contract.deposit_enabled ? 'Включён' : 'Не включён'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Аванс:</span>
              <p className="font-medium">{contract.advance_enabled ? 'Включён' : 'Не включён'}</p>
            </div>
            {contract.comment && (
              <div>
                <span className="text-sm text-gray-500">Комментарий:</span>
                <p className="font-medium">{contract.comment}</p>
              </div>
            )}
          </div>
        </div>
      </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Файлы</h3>
            <div className="flex items-center gap-2">
              <select
                id="file-type-select"
                className="px-2 py-1 text-sm border border-slate-300 rounded-lg"
              >
                <option value="contract">Договор</option>
                <option value="supplement">Доп. соглашение</option>
                <option value="other">Прочее</option>
              </select>
              <label className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 cursor-pointer text-sm font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" />
                {fileUploading ? 'Загрузка...' : 'Добавить файл'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,application/pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={fileUploading}
                />
              </label>
            </div>
          </div>
          {files.length === 0 ? (
            <p className="text-gray-500 text-sm">Нет прикреплённых файлов</p>
          ) : (
            <ul className="space-y-2">
              {files.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(f)}
                    disabled={fileDownloadingId === f.id}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800 text-left disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium">{f.title || f.file?.split('/').pop() || 'Файл'}</span>
                    <span className="text-xs text-gray-400">({getFileTypeLabel(f.file_type)})</span>
                    {fileDownloadingId === f.id ? ' …' : ''}
                  </button>
                  <button
                    onClick={() => handleDeleteFile(f.id)}
                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Начисления по договору</h3>
          {accruals.length === 0 && (
            <button
              onClick={handleGenerateAccruals}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Сгенерировать начисления
            </button>
          )}
        </div>
        {accruals.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">Начисления не найдены</p>
            <button
              onClick={handleGenerateAccruals}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Сгенерировать начисления
            </button>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Период</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Срок оплаты</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Сумма</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Оплачено</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Остаток</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accruals.map((accrual) => (
                <tr key={accrual.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(accrual.period_start).toLocaleDateString('ru-RU')} - {new Date(accrual.period_end).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(accrual.due_date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {formatCurrency(accrual.final_amount, contract.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {formatCurrency(accrual.paid_amount, contract.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {formatCurrency(accrual.balance, contract.currency)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      accrual.status === 'paid' ? 'bg-green-100 text-green-800' :
                      accrual.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      accrual.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {accrual.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
