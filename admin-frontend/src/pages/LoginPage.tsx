import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, RefreshCw, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { getQRCode, getStateInstance, logoutInstance } from '../api/greenApi';
import client from '../api/client';

type AuthState = 'loading' | 'qr' | 'checking' | 'authorized' | 'error';

export default function LoginPage() {
  const navigate = useNavigate();
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [qrCode, setQrCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Вспомогательная функция для безопасной проверки строки
  const isString = (value: any): value is string => {
    return typeof value === 'string';
  };

  // Получить QR-код
  const fetchQRCode = async () => {
    console.log('Fetching QR code...');
    setAuthState('loading');
    setError('');
    
    try {
      // Запрашиваем QR-код
      console.log('Requesting QR code...');
      const response = await getQRCode();
      console.log('QR code response:', response);
      
      // Если экземпляр уже авторизован, пытаемся разлогинить и получить новый QR
      if (response.error === 'ALREADY_AUTHORIZED') {
        console.log('Instance already authorized, attempting logout...');
        setAuthState('loading');
        setError('Экземпляр уже авторизован. Выполняется разлогин...');
        
        // Пытаемся разлогинить экземпляр
        const logoutResponse = await logoutInstance();
        console.log('Logout response:', logoutResponse);
        
        if (logoutResponse.success) {
          console.log('Logout successful, waiting before requesting new QR...');
          setTimeout(async () => {
            console.log('Requesting QR code after logout...');
            setError('Получение нового QR-кода...');
            const retryResponse = await getQRCode();
            console.log('Retry QR response:', retryResponse);
            
            if (retryResponse.success && retryResponse.data) {
              const qrData = retryResponse.data;
              if (isString(qrData)) {
                setQrCode(qrData);
                setAuthState('qr');
                setError('');
              } else {
                setError('Неверный формат QR-кода. Попробуйте обновить.');
                setAuthState('error');
              }
            } else if (retryResponse.error === 'ALREADY_AUTHORIZED') {
              // Рекурсивно пытаемся еще раз после второго разлогина
              console.log('Still authorized, trying logout again...');
              await logoutInstance();
              setTimeout(() => fetchQRCode(), 3000);
            } else {
              setError(retryResponse.error || 'Не удалось получить QR-код после разлогина');
              setAuthState('error');
            }
          }, 2000);
        } else {
          setError('Не удалось разлогинить экземпляр. Попробуйте разлогинить вручную в личном кабинете Green API.');
          setAuthState('error');
        }
        return;
      }
      
      // Если успешно получили QR-код
      if (response.success && response.data) {
        const qrData = response.data;
        if (isString(qrData)) {
          setQrCode(qrData);
          setAuthState('qr');
          setError('');
          
          // Начинаем проверку статуса авторизации
          startAuthCheck();
        } else {
          setError('Неверный формат QR-кода. Попробуйте обновить.');
          setAuthState('error');
        }
      } else {
        setError(response.error || 'Не удалось получить QR-код');
        setAuthState('error');
      }
    } catch (error: any) {
      console.error('Error fetching QR code:', error);
      let errorMessage = 'Ошибка при получении QR-кода';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.status) {
        errorMessage = `Ошибка сервера: ${error.response.status}`;
      } else if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
        errorMessage = 'Ошибка подключения к серверу. Проверьте подключение к интернету.';
      }
      
      setError(errorMessage);
      setAuthState('error');
    }
  };

  // Проверка статуса авторизации
  const checkAuthState = async () => {
    try {
      const stateResponse = await getStateInstance();
      console.log('State check response:', stateResponse);
      
      if (stateResponse.success && stateResponse.data) {
        const state = stateResponse.data.stateInstance;
        
        if (state === 'authorized') {
          // Экземпляр авторизован, получаем номер телефона
          console.log('Instance is authorized, fetching phone number...');
          
          // Получаем номер телефона через Green API
          try {
            const phoneResponse = await fetch(
              `https://api.green-api.com/waInstance7107486710/getSettings/6633644896594f7db36235195f23579325e7a9498eab4411bd`
            );
            const phoneData = await phoneResponse.json();
            const phone = phoneData.wid?.split('@')[0] || '';
            
            if (phone) {
              setPhoneNumber(phone);
              
              // Нормализуем номер телефона для поиска
              // Убираем все нецифровые символы
              const normalizedPhone = phone.replace(/\D/g, '');
              
              console.log('Phone from Green API:', phone);
              console.log('Normalized phone:', normalizedPhone);
              
              // Создаем все возможные варианты для поиска
              const searchPhones = new Set<string>();
              
              // Добавляем исходный номер (как пришел от Green API)
              searchPhones.add(phone);
              searchPhones.add(normalizedPhone);
              
              // Если номер начинается с 996 (12 цифр: 996XXXXXXXXX)
              if (normalizedPhone.startsWith('996') && normalizedPhone.length >= 12) {
                const without996 = normalizedPhone.slice(3); // 9 цифр без 996
                
                // Все варианты с 996
                searchPhones.add(normalizedPhone); // 996557903999
                searchPhones.add(`+${normalizedPhone}`); // +996557903999
                
                // Все варианты без 996
                searchPhones.add(without996); // 557903999
                searchPhones.add(`+${without996}`); // +557903999
                searchPhones.add(`+996${without996}`); // +996557903999 (дубль, но для надежности)
              } else if (normalizedPhone.length === 9) {
                // Если номер из 9 цифр (без 996)
                searchPhones.add(normalizedPhone); // 557903999
                searchPhones.add(`996${normalizedPhone}`); // 996557903999
                searchPhones.add(`+996${normalizedPhone}`); // +996557903999
                searchPhones.add(`+${normalizedPhone}`); // +557903999
              }
              
              // Также добавляем варианты с пробелами и другими разделителями (на случай если в базе так хранится)
              const variants = Array.from(searchPhones);
              for (const variant of variants) {
                if (variant.includes('996') && variant.length >= 12) {
                  // Добавляем варианты с пробелами: +996 557 903 999
                  const digits = variant.replace(/\D/g, '');
                  if (digits.length === 12) {
                    searchPhones.add(`+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`);
                  }
                }
              }
              
              const searchPhonesArray = Array.from(searchPhones);
              console.log('Phone from Green API:', phone);
              console.log('Normalized phone:', normalizedPhone);
              console.log('Searching for phone variants:', searchPhonesArray);
              
              // Ищем контрагента по номеру телефона
              // Пробуем все варианты, но начинаем с наиболее вероятных
              const priorityPhones = [];
              if (normalizedPhone.startsWith('996') && normalizedPhone.length >= 12) {
                // Если номер с 996 (12 цифр)
                priorityPhones.push(`+${normalizedPhone}`); // +996557903999 - наиболее вероятный формат в базе
                priorityPhones.push(normalizedPhone); // 996557903999
              } else if (normalizedPhone.length === 9) {
                // Если номер без 996 (9 цифр)
                priorityPhones.push(`+996${normalizedPhone}`); // +996557903999
                priorityPhones.push(`996${normalizedPhone}`); // 996557903999
              }
              
              // Добавляем остальные варианты
              const allPhonesSet = new Set([...priorityPhones, ...searchPhonesArray]);
              const allPhones = Array.from(allPhonesSet);
              
              let tenantFound = false;
              for (const searchPhone of allPhones) {
                if (searchPhone && searchPhone.length >= 9) {
                  try {
                    console.log(`Trying to find tenant with phone: "${searchPhone}"`);
                    const tenantResponse = await client.get(`/tenants/?phone=${encodeURIComponent(searchPhone)}`);
                    const tenants = tenantResponse.data.results || tenantResponse.data || [];
                    
                    console.log(`Found ${tenants.length} tenants for phone "${searchPhone}":`, tenants);
                    
                    if (Array.isArray(tenants) && tenants.length > 0) {
                      const tenant = tenants[0];
                      console.log('✅ Tenant found:', tenant);
                      console.log('Tenant phone in DB:', tenant.phone);
                      
                      // Сохраняем данные пользователя
                      localStorage.setItem('whatsapp_authorized', 'true');
                      localStorage.setItem('whatsapp_phone', phone);
                      localStorage.setItem('user_type', 'tenant');
                      localStorage.setItem('tenant_id', tenant.id.toString());
                      localStorage.setItem('tenant_name', tenant.name);
                      
                      setAuthState('authorized');
                      tenantFound = true;
                      
                      // Редирект на дашборд
                      setTimeout(() => {
                        navigate('/dashboard');
                      }, 1500);
                      break;
                    }
                  } catch (err) {
                    console.error(`Error searching tenant with phone "${searchPhone}":`, err);
                  }
                }
              }
              
              if (!tenantFound) {
                const searchedVariants = Array.from(searchPhones).filter(p => p && p.length >= 9);
                setError(
                  `Номер телефона ${phone} не найден в системе контрагентов.\n\n` +
                  `Проверенные варианты: ${searchedVariants.join(', ')}\n\n` +
                  `Убедитесь, что номер ${phone} или один из его вариантов (${normalizedPhone}, +${normalizedPhone}, ${normalizedPhone.startsWith('996') ? normalizedPhone.slice(3) : '996' + normalizedPhone}) ` +
                  `указан в поле "Телефон" у контрагента в системе. Обратитесь к администратору.`
                );
                setAuthState('error');
                stopAuthCheck();
              }
            } else {
              setError('Не удалось получить номер телефона');
              setAuthState('error');
              stopAuthCheck();
            }
          } catch (err: any) {
            console.error('Error fetching phone:', err);
            setError('Ошибка при получении номера телефона');
            setAuthState('error');
            stopAuthCheck();
          }
        } else if (state === 'notAuthorized' || state === 'notLogged') {
          // Еще не авторизован, продолжаем показывать QR
          console.log('Instance not yet authorized, state:', state);
          if (authState !== 'qr') {
            setAuthState('qr');
          }
        } else {
          console.log('Unknown state:', state);
        }
      } else {
        console.error('Failed to get state:', stateResponse.error);
      }
    } catch (error: any) {
      console.error('Error checking auth state:', error);
    }
  };

  // Начать проверку авторизации
  const startAuthCheck = () => {
    stopAuthCheck();
    // Проверяем каждые 3 секунды
    intervalRef.current = setInterval(() => {
      checkAuthState();
    }, 3000);
  };

  // Остановить проверку авторизации
  const stopAuthCheck = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Инициализация при монтировании
  useEffect(() => {
    fetchQRCode();
    
    return () => {
      stopAuthCheck();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mb-4">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Вход через WhatsApp
          </h1>
          <p className="text-sm text-slate-600">
            Отсканируйте QR-код и отправьте предзаполненное сообщение
          </p>
        </div>

        {/* Состояние загрузки */}
        {authState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
            <p className="text-sm text-slate-600">{error || 'Загрузка QR-кода...'}</p>
          </div>
        )}

        {/* QR-код */}
        {authState === 'qr' && qrCode && (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-xl border-2 border-slate-200 shadow-sm">
                {qrCode && isString(qrCode) && (
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="w-64 h-64"
                    onError={(e) => {
                      console.error('QR code image error');
                      (e.target as HTMLImageElement).style.display = 'none';
                      setError('Неверный формат QR-кода. Попробуйте обновить.');
                      setAuthState('error');
                    }}
                  />
                )}
              </div>
              <div className="mt-4 text-center">
                <p className="text-xs text-slate-500">
                  Откройте WhatsApp на телефоне, отсканируйте код и подтвердите вход
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-2 text-sm text-slate-600">
              <Loader className="w-4 h-4 animate-spin" />
              <span>Ожидание подтверждения...</span>
            </div>
          </div>
        )}

        {/* Успешная авторизация */}
        {authState === 'authorized' && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">
              Авторизация успешна!
            </h2>
            {phoneNumber && (
              <p className="text-sm text-slate-600 mb-4">
                Номер: {phoneNumber}
              </p>
            )}
            <p className="text-sm text-slate-500">
              Перенаправление...
            </p>
          </div>
        )}

        {/* Ошибка */}
        {authState === 'error' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-red-600 mb-4">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Ошибка авторизации</span>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={fetchQRCode}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Попробовать снова</span>
            </button>
          </div>
        )}

        {/* Информация */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-600">
                Используется Green API для авторизации через WhatsApp. 
                Ваши данные защищены и не передаются третьим лицам.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
