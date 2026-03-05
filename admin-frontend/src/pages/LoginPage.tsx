import React, { useState } from 'react';
import { MessageCircle, CheckCircle, AlertCircle, Loader, User, Lock, Smartphone, Eye, EyeOff } from 'lucide-react';
import client from '../api/client';

type LoginTab = 'whatsapp' | 'password';
type WhatsappStep = 'phone' | 'code';

const SAVED_LOGIN_KEY = 'saved_login_username';

export default function LoginPage() {
  const [loginTab, setLoginTab] = useState<LoginTab>('password');
  const [username, setUsername] = useState(() => typeof window !== 'undefined' ? (localStorage.getItem(SAVED_LOGIN_KEY) || '') : '');
  const [password, setPassword] = useState('');
  const [rememberLogin, setRememberLogin] = useState(() => typeof window !== 'undefined' ? !!localStorage.getItem(SAVED_LOGIN_KEY) : false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // WhatsApp OTP: номер → код
  const [whatsappStep, setWhatsappStep] = useState<WhatsappStep>('phone');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappCode, setWhatsappCode] = useState('');
  const [whatsappAttemptId, setWhatsappAttemptId] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [whatsappLoading, setWhatsappLoading] = useState(false);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!username.trim() || !password) {
      setLoginError('Введите логин и пароль');
      return;
    }
    setLoginLoading(true);
    try {
      const res = await client.post('/auth/login/', { username: username.trim(), password });
      const { token, user } = res.data;
      localStorage.setItem('auth_token', token);
      localStorage.setItem('whatsapp_authorized', 'true');
      if (user?.id) localStorage.setItem('user_id', String(user.id));
      if (user?.username) localStorage.setItem('user_name', user.username);
      if (user?.role) localStorage.setItem('user_role', user.role);
      if (rememberLogin && username.trim()) {
        localStorage.setItem(SAVED_LOGIN_KEY, username.trim());
      } else {
        localStorage.removeItem(SAVED_LOGIN_KEY);
      }
      window.location.href = '/dashboard';
    } catch (err: any) {
      setLoginError(err.response?.data?.error || 'Неверный логин или пароль');
    } finally {
      setLoginLoading(false);
    }
  };

  // ——— WhatsApp OTP: запрос кода ———
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.startsWith('996') && digits.length <= 12) {
      const rest = digits.slice(3);
      if (rest.length <= 3) return `+996 ${rest}`;
      if (rest.length <= 6) return `+996 ${rest.slice(0, 3)} ${rest.slice(3)}`;
      return `+996 ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6, 9)}`;
    }
    if (digits.length <= 9) {
      if (digits.length <= 3) return `+996 ${digits}`;
      if (digits.length <= 6) return `+996 ${digits.slice(0, 3)} ${digits.slice(3)}`;
      return `+996 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    const limited = digits.slice(0, 12);
    if (limited.startsWith('996')) return `+996 ${limited.slice(3, 6)} ${limited.slice(6, 9)} ${limited.slice(9)}`;
    return `+996 ${limited.slice(0, 3)} ${limited.slice(3, 6)} ${limited.slice(6, 9)}`;
  };

  const handleRequestOtp = async () => {
    const phone = whatsappPhone.trim().replace(/\D/g, '');
    if (phone.length < 9) {
      setWhatsappError('Введите номер телефона (например +996...)');
      return;
    }
    setWhatsappError('');
    setWhatsappLoading(true);
    try {
      const res = await client.post<{ success: boolean; attemptId: string; message: string; expiresAt: string }>(
        '/auth/whatsapp/request-code/',
        { phone: whatsappPhone.trim() }
      );
      if (res.data.success && res.data.attemptId) {
        setWhatsappAttemptId(res.data.attemptId);
        setWhatsappStep('code');
      } else {
        setWhatsappError('Не удалось отправить код');
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Ошибка при запросе кода';
      setWhatsappError(msg);
    } finally {
      setWhatsappLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const code = whatsappCode.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      setWhatsappError('Введите 6-значный код');
      return;
    }
    setWhatsappError('');
    setWhatsappLoading(true);
    try {
      const res = await client.post<{
        success: boolean;
        token?: string;
        user?: { id: number; username: string; role: string; phone?: string; counterpartyId?: number };
      }>('/auth/whatsapp/verify-code/', { attemptId: whatsappAttemptId, code });
      if (res.data.success && res.data.token && res.data.user) {
        localStorage.setItem('auth_token', res.data.token);
        localStorage.setItem('whatsapp_authorized', 'true');
        localStorage.setItem('user_id', String(res.data.user.id));
        localStorage.setItem('user_name', res.data.user.username);
        localStorage.setItem('user_role', res.data.user.role);
        if (res.data.user.phone) localStorage.setItem('whatsapp_phone', res.data.user.phone);
        if (res.data.user.counterpartyId) localStorage.setItem('tenant_id', String(res.data.user.counterpartyId));
        window.location.href = '/dashboard';
        return;
      }
      setWhatsappError('Неверный код или сессия истекла');
    } catch (err: any) {
      setWhatsappError(err.response?.data?.error || 'Ошибка при проверке кода');
    } finally {
      setWhatsappLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-xl font-bold text-slate-900 mb-6 text-center">Вход в систему</h1>

        {/* Вкладки */}
        <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setLoginTab('whatsapp'); setLoginError(''); setWhatsappStep('phone'); setWhatsappError(''); setWhatsappCode(''); setWhatsappAttemptId(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium ${loginTab === 'whatsapp' ? 'bg-white text-indigo-600 shadow' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => { setLoginTab('password'); setLoginError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium ${loginTab === 'password' ? 'bg-white text-indigo-600 shadow' : 'text-slate-600 hover:text-slate-900'}`}
          >
            <User className="w-4 h-4" />
            Логин/Пароль
          </button>
        </div>

        {/* Форма Логин/Пароль */}
        {loginTab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Логин</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="Логин"
                  autoComplete="username"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={passwordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-11 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="Пароль"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded"
                  aria-label={passwordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {passwordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberLogin}
                onChange={(e) => setRememberLogin(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Запомнить логин
            </label>
            {loginError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl"
            >
              {loginLoading ? <Loader className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
              Войти
            </button>
          </form>
        )}

        {/* WhatsApp: вход по номеру → одноразовый код */}
        {loginTab === 'whatsapp' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mb-2">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm text-slate-600">
                Введите номер телефона. Если он есть в контрагентах или у сотрудников — на WhatsApp придёт код для входа.
              </p>
            </div>

            {whatsappStep === 'phone' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Номер телефона</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(formatPhone(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (!whatsappLoading && whatsappPhone.replace(/\D/g, '').length >= 9) handleRequestOtp();
                        }
                      }}
                      placeholder="+996 555 123 456"
                      className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      maxLength={17}
                      autoFocus
                    />
                  </div>
                </div>
                {whatsappError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {whatsappError}
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={whatsappLoading || whatsappPhone.replace(/\D/g, '').length < 9}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-xl"
                >
                  {whatsappLoading ? <Loader className="w-5 h-5 animate-spin" /> : <MessageCircle className="w-5 h-5" />}
                  Получить код в WhatsApp
                </button>
              </>
            )}

            {whatsappStep === 'code' && (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-green-800 font-medium">Код отправлен в WhatsApp</p>
                  <p className="text-xs text-green-700 mt-1">Номер: {whatsappPhone}. Введите 6 цифр из сообщения.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Код из WhatsApp</label>
                  <input
                    type="text"
                    value={whatsappCode}
                    onChange={(e) => setWhatsappCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (!whatsappLoading && whatsappCode.replace(/\D/g, '').length === 6) handleVerifyOtp();
                      }
                    }}
                    placeholder="123456"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-center text-xl tracking-widest font-mono focus:ring-2 focus:ring-indigo-500"
                    maxLength={6}
                    autoFocus
                  />
                </div>
                {whatsappError && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {whatsappError}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setWhatsappStep('phone'); setWhatsappCode(''); setWhatsappAttemptId(''); setWhatsappError(''); }}
                    disabled={whatsappLoading}
                    className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    onClick={handleVerifyOtp}
                    disabled={whatsappLoading || whatsappCode.length !== 6}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-xl"
                  >
                    {whatsappLoading ? <Loader className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    Войти
                  </button>
                </div>
              </>
            )}

            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Доступ зависит от того, кому принадлежит номер: арендатор — свой аккаунт, сотрудник/админ — полный доступ, владелец/арендодатель/инвестор — только свои данные.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
