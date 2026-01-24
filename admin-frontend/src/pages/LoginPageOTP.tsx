/**
 * Страница входа через WhatsApp OTP код
 * Клиент вводит номер → система проверяет в контрагентах → отправляет код → клиент вводит код → вход
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, AlertCircle, Loader, MessageSquare, Smartphone } from 'lucide-react';
import client from '../api/client';

type AuthStep = 'phone' | 'code' | 'success' | 'error';

interface RequestCodeResponse {
  success: boolean;
  attemptId: string;
  message: string;
  expiresAt: string;
  error?: string;
}

interface VerifyCodeResponse {
  success: boolean;
  user?: {
    id: number;
    username: string;
    role: string;
    phone: string;
    counterpartyId: number | null;
  };
  error?: string;
}

export default function LoginPageOTP() {
  const navigate = useNavigate();
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [attemptId, setAttemptId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Запрос кода
  const handleRequestCode = async () => {
    if (!phone.trim()) {
      setError('Введите номер телефона');
      return;
    }

    setLoading(true);
    setError('');
    setStatusMessage('Проверка номера...');

    try {
      const response = await client.post<RequestCodeResponse>('/auth/whatsapp/request-code/', {
        phone: phone.trim(),
      });

      if (response.data.success) {
        setAttemptId(response.data.attemptId);
        setStep('code');
        setStatusMessage('Код отправлен на WhatsApp');
      } else {
        setError(response.data.error || 'Ошибка при запросе кода');
        setStep('error');
      }
    } catch (err: any) {
      console.error('Error requesting code:', err);
      console.error('Error details:', {
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        message: err.message,
      });
      
      let errorMsg = 'Ошибка при запросе кода. Проверьте номер и попробуйте снова.';
      
      if (err.response?.status === 403) {
        errorMsg = 'Доступ запрещен. Пожалуйста, обновите страницу и попробуйте снова.';
      } else if (err.response?.status === 404) {
        errorMsg = err.response?.data?.error || 'Номер не зарегистрирован в системе. Обратитесь к администратору.';
      } else if (err.response?.data?.error) {
        errorMsg = err.response.data.error;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // Проверка кода
  const handleVerifyCode = async () => {
    if (!code.trim() || code.length !== 6) {
      setError('Введите 6-значный код');
      return;
    }

    if (!attemptId) {
      setError('Ошибка: отсутствует ID попытки');
      return;
    }

    setLoading(true);
    setError('');
    setStatusMessage('Проверка кода...');

    try {
      const response = await client.post<VerifyCodeResponse>('/auth/whatsapp/verify-code/', {
        attemptId: attemptId,
        code: code.trim(),
      });

      if (response.data.success && response.data.user) {
        // Сохраняем данные пользователя
        localStorage.setItem('whatsapp_authorized', 'true');
        localStorage.setItem('user_id', response.data.user.id.toString());
        localStorage.setItem('user_role', response.data.user.role);
        localStorage.setItem('user_name', response.data.user.username);
        // Сохраняем телефон в localStorage
        const userPhone = response.data.user.phone || phone.trim();
        if (userPhone) {
          localStorage.setItem('whatsapp_phone', userPhone);
        }
        if (response.data.user.counterpartyId) {
          localStorage.setItem('tenant_id', response.data.user.counterpartyId.toString());
        }

        setStep('success');
        setStatusMessage(`Вход выполнен! Роль: ${response.data.user.role}`);

        // Получаем полный профиль через /me
        try {
          const meResponse = await client.get('/auth/me/');
          if (meResponse.data) {
            console.log('✅ User profile loaded:', meResponse.data);
            localStorage.setItem('user_role', meResponse.data.role);
            localStorage.setItem('user_id', meResponse.data.id.toString());
            localStorage.setItem('user_name', meResponse.data.username);
            if (meResponse.data.phone) {
              localStorage.setItem('whatsapp_phone', meResponse.data.phone);
            }
            if (meResponse.data.counterparty_id) {
              localStorage.setItem('tenant_id', meResponse.data.counterparty_id.toString());
            }
          }
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }

        // Редирект на дашборд
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } else {
        setError(response.data.error || 'Неверный код');
      }
    } catch (err: any) {
      console.error('Error verifying code:', err);
      const errorMsg = err.response?.data?.error || 'Ошибка при проверке кода';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Форматирование номера телефона
  const formatPhone = (value: string) => {
    // Убираем все кроме цифр
    const digits = value.replace(/\D/g, '');
    
    if (digits.length === 0) return '';
    
    // Если начинается с 996 (12 цифр), форматируем как +996 XXX XXX XXX
    if (digits.startsWith('996') && digits.length === 12) {
      return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    }
    
    // Если начинается с 996, но меньше 12 цифр
    if (digits.startsWith('996')) {
      const rest = digits.slice(3);
      if (rest.length === 0) return '+996';
      if (rest.length <= 3) return `+996 ${rest}`;
      if (rest.length <= 6) return `+996 ${rest.slice(0, 3)} ${rest.slice(3)}`;
      return `+996 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 9)}`;
    }
    
    // Если 9 цифр (без 996), добавляем +996
    if (digits.length <= 9) {
      if (digits.length === 0) return '';
      if (digits.length <= 3) return `+996 ${digits}`;
      if (digits.length <= 6) return `+996 ${digits.slice(0, 3)} ${digits.slice(3)}`;
      return `+996 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    
    // Если больше 9 цифр и не начинается с 996, обрезаем до 9
    const limited = digits.slice(0, 9);
    if (limited.length <= 3) return `+996 ${limited}`;
    if (limited.length <= 6) return `+996 ${limited.slice(0, 3)} ${limited.slice(3)}`;
    return `+996 ${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Вход через WhatsApp</h1>
        <p className="text-sm text-slate-600 mb-6 text-center">
          Введите номер телефона для получения кода
        </p>

        {/* Шаг 1: Ввод номера телефона */}
        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Номер телефона
              </label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="+996 555 123 456"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  disabled={loading}
                  autoFocus
                  maxLength={17} // +996 XXX XXX XXX = 17 символов
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Номер должен быть указан в системе (в контрагентах)
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              onClick={handleRequestCode}
              disabled={loading || !phone.trim()}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Отправка...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  <span>Получить код</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Шаг 2: Ввод кода */}
        {step === 'code' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Код отправлен на WhatsApp</strong>
              </p>
              <p className="text-xs text-blue-700">
                Номер: <strong>{phone}</strong>
              </p>
              <p className="text-xs text-blue-700 mt-1">
                Проверьте WhatsApp и введите 6-значный код
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Код подтверждения
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(value);
                }}
                placeholder="123456"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-center text-2xl tracking-widest font-mono"
                disabled={loading}
                autoFocus
                maxLength={6}
              />
              <p className="mt-2 text-xs text-slate-500 text-center">
                Введите 6-значный код из WhatsApp
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setStep('phone');
                  setCode('');
                  setError('');
                  setAttemptId('');
                }}
                disabled={loading}
                className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Назад
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={loading || code.length !== 6}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Проверка...</span>
                  </>
                ) : (
                  'Войти'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Шаг 3: Успешный вход */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
            <p className="text-lg font-semibold text-green-600 mb-2">Вход выполнен!</p>
            <p className="text-sm text-slate-600">{statusMessage}</p>
          </div>
        )}

        {/* Ошибка */}
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-red-600 mb-4" />
            <p className="text-lg font-semibold text-red-600 mb-2">Ошибка авторизации</p>
            <p className="text-sm text-slate-600 mb-4 text-center">{error}</p>
            <button
              onClick={() => {
                setStep('phone');
                setPhone('');
                setCode('');
                setError('');
                setAttemptId('');
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
