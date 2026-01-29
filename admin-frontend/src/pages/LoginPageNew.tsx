/**
 * Новая версия страницы входа через WhatsApp QR
 * Использует правильную архитектуру: attemptId → sender phone → user
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import client from '../api/client';
import { getSettings, getStateInstance } from '../api/greenApi';

type AuthState = 'loading' | 'qr' | 'checking' | 'authorized' | 'error';

interface LoginAttemptResponse {
  attemptId: string;
  expiresAt: string;
  loginMessage: string;
  qrPayload: string;
}

interface StatusResponse {
  status: 'NEW' | 'VERIFIED' | 'COMPLETED' | 'FAILED';
  attemptId: string;
  failureReason?: 'ATTEMPT_EXPIRED' | 'PHONE_NOT_UNIQUE' | 'USER_NOT_FOUND' | 'PARSE_FAILED';
  error?: string;
  user?: {
    id: number;
    username: string;
    role: string;
    phone: string;
    counterpartyId: number | null;
  };
}

export default function LoginPageNew() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [attemptId, setAttemptId] = useState<string>('');
  const [loginMessage, setLoginMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string>('Инициализация...');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Проверка состояния инстанса Green API
  const checkInstanceState = async () => {
    try {
      const stateResponse = await getStateInstance();
      if (stateResponse.success && stateResponse.data?.stateInstance === 'authorized') {
        // Инстанс авторизован, получаем номер
        const settingsResponse = await getSettings();
        if (settingsResponse.success && settingsResponse.data?.wid) {
          const phone = settingsResponse.data.wid.split('@')[0];
          if (phone) {
            return phone;
          }
        }
        // Если номер не получен, но инстанс авторизован - используем дефолтный
        return '7103495361';
      } else {
        // Инстанс не авторизован - не блокируем, но предупреждаем
        console.warn('Green API instance not authorized, but continuing...');
        setStatusMessage('⚠️ Инстанс Green API не авторизован. Сообщения могут не доходить.');
        return '7103495361'; // Используем дефолтный номер для QR
      }
    } catch (err) {
      console.error('Error checking instance state:', err);
      return '7103495361'; // Fallback на дефолтный номер
    }
  };

  // Получение номера WhatsApp из Green API
  const fetchWhatsAppPhone = async () => {
    return await checkInstanceState();
  };

  // Создание попытки входа
  const startLoginAttempt = async () => {
    try {
      setAuthState('loading');
      setError('');
      setStatusMessage('Создание попытки входа...');
      
      // Получаем номер WhatsApp перед созданием попытки
      const phone = await fetchWhatsAppPhone();
      
      const response = await client.post<LoginAttemptResponse>('/auth/whatsapp/start/');
      
      if (response.data) {
        setAttemptId(response.data.attemptId);
        setLoginMessage(response.data.loginMessage);
        setAuthState('qr');
        setStatusMessage('Отсканируйте QR-код и отправьте предзаполненное сообщение в WhatsApp');
        
        // Начинаем опрос статуса
        startPolling(response.data.attemptId);
      }
    } catch (err: any) {
      console.error('Error starting login attempt:', err);
      setError(err.response?.data?.error || 'Ошибка при создании попытки входа');
      setAuthState('error');
    }
  };

  // Опрос статуса попытки входа
  const checkStatus = async (attemptId: string) => {
    try {
      const response = await client.get<StatusResponse>(`/auth/whatsapp/status/?attemptId=${attemptId}`);
      
      if (response.data) {
        const status = response.data.status;
        
        if (status === 'COMPLETED' && response.data.user) {
          // Вход успешен
          clearInterval(intervalRef.current!);
          
          // Сохраняем данные пользователя
          localStorage.setItem('whatsapp_authorized', 'true');
          localStorage.setItem('user_id', response.data.user.id.toString());
          localStorage.setItem('user_role', response.data.user.role);
          localStorage.setItem('user_name', response.data.user.username);
          if (response.data.user.phone) {
            localStorage.setItem('whatsapp_phone', response.data.user.phone);
          }
          if (response.data.user.counterpartyId) {
            localStorage.setItem('tenant_id', response.data.user.counterpartyId.toString());
          }
          
          setStatusMessage(`Вход выполнен! Роль: ${response.data.user.role}`);
          setAuthState('authorized');
          
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
          }, 1000);
          
        } else if (status === 'FAILED') {
          // Ошибка входа
          clearInterval(intervalRef.current!);
          setError(response.data.error || 'Ошибка при входе');
          setStatusMessage(response.data.failureReason || 'Ошибка');
          setAuthState('error');
          
        } else if (status === 'VERIFIED') {
          // Номер подтвержден, ожидаем завершения
          setStatusMessage('Номер подтвержден, завершение входа...');
          setAuthState('checking');
          
        } else if (status === 'NEW') {
          // Ожидаем подтверждения
          setStatusMessage('Ожидание подтверждения в WhatsApp...');
          setAuthState('qr');
        }
      }
    } catch (err: any) {
      console.error('Error checking status:', err);
      // Не останавливаем опрос при ошибке, продолжаем попытки
    }
  };

  // Начать опрос статуса
  const startPolling = (attemptId: string) => {
    // Проверяем статус каждые 2 секунды
    intervalRef.current = setInterval(() => {
      checkStatus(attemptId);
    }, 2000);
    
    // Первая проверка сразу
    checkStatus(attemptId);
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Инициализация при монтировании
  useEffect(() => {
    startLoginAttempt();
  }, []);

  // Формируем ссылку для QR-кода
  const qrValue = loginMessage || `AMT LOGIN ${attemptId}`;
  // Используем дефолтный номер для QR (этот компонент больше не используется)
  const phoneForQR = '7103495361';
  const whatsappLink = `https://wa.me/${phoneForQR}?text=${encodeURIComponent(qrValue)}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Вход через WhatsApp</h1>
        <p className="text-sm text-slate-600 mb-6 text-center">
          Отсканируйте QR-код и отправьте предзаполненное сообщение
        </p>

        {authState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-600">{statusMessage}</p>
          </div>
        )}

        {authState === 'qr' && attemptId && (
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg border-2 border-slate-200 mb-4">
              <QRCodeSVG value={whatsappLink} size={256} level="H" />
            </div>
            <p className="text-sm text-slate-600 mb-2 text-center">
              {statusMessage}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800">
              <p className="font-semibold mb-2">📱 Инструкция по входу:</p>
              <ol className="list-decimal list-inside space-y-1 text-left mb-2">
                <li>Откройте WhatsApp на телефоне</li>
                <li>Отсканируйте QR-код выше (или нажмите на ссылку)</li>
                <li><strong>КРИТИЧЕСКИ ВАЖНО:</strong> После сканирования WhatsApp откроется с предзаполненным сообщением</li>
                <li><strong>ОБЯЗАТЕЛЬНО нажмите "Отправить"</strong> в WhatsApp - сообщение должно уйти</li>
                <li>Сообщение будет отправлено на номер Green API инстанса</li>
                <li>Система автоматически определит ваш номер и авторизует вас</li>
              </ol>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2 text-xs text-yellow-800">
                <p className="font-semibold mb-1">⚠️ Требования:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Ваш номер WhatsApp должен быть указан в системе (в контрагентах)</li>
                  <li>Инстанс Green API должен быть авторизован в личном кабинете</li>
                  <li>Webhook должен быть настроен: <code className="bg-yellow-100 px-1 rounded">http://assetmanagement.team/api/webhooks/greenapi/incoming/</code></li>
                </ul>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center mb-4">
              ID попытки: {attemptId.substring(0, 8)}...
            </p>
            <button
              onClick={startLoginAttempt}
              className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700"
            >
              <RefreshCw className="w-4 h-4" />
              Обновить QR-код
            </button>
          </div>
        )}

        {authState === 'checking' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <p className="text-slate-600">{statusMessage}</p>
          </div>
        )}

        {authState === 'authorized' && (
          <div className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
            <p className="text-lg font-semibold text-green-600 mb-2">Вход выполнен!</p>
            <p className="text-sm text-slate-600">{statusMessage}</p>
          </div>
        )}

        {authState === 'error' && (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-16 h-16 text-red-600 mb-4" />
            <p className="text-lg font-semibold text-red-600 mb-2">Ошибка авторизации</p>
            <p className="text-sm text-slate-600 mb-4 text-center">{error}</p>
            {error.includes('не авторизован') && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-sm text-yellow-800 max-w-md">
                <p className="font-semibold mb-2">⚠️ Инстанс Green API не авторизован</p>
                <p className="mb-2">Для работы входа через WhatsApp необходимо:</p>
                <ol className="list-decimal list-inside space-y-1 text-left">
                  <li>Войти в личный кабинет Green API: <a href="https://console.green-api.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">console.green-api.com</a></li>
                  <li>Найти инстанс с ID: <strong>7103495361</strong></li>
                  <li>Авторизовать инстанс через QR-код в личном кабинете</li>
                  <li>После авторизации обновите эту страницу</li>
                </ol>
              </div>
            )}
            <button
              onClick={startLoginAttempt}
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
