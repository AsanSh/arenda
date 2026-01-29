import axios from 'axios';

// Определяем API URL в зависимости от окружения
const getApiUrl = () => {
  // Если указан явно через переменную окружения
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Если работаем на продакшене (домен assetmanagement.team)
  if (window.location.hostname === 'assetmanagement.team' || 
      window.location.hostname === 'www.assetmanagement.team') {
    // Используем HTTP если SSL еще не настроен, иначе HTTPS
    const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
    return `${protocol}://assetmanagement.team/api`;
  }
  
  // Для локальной разработки
  return 'http://localhost:8000/api';
};

const API_URL = getApiUrl();

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,  // Важно для Session Authentication (отправка cookies)
});

// Добавляем JWT токен в заголовки если он есть
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Единая проверка «мы на странице логина» (с учётом trailing slash и подпути)
function isOnLoginPage(): boolean {
  if (typeof window === 'undefined') return false;
  const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
  return path === '/login' || path.endsWith('/login');
}

// Обработка ошибок авторизации: не редиректить на /login, если уже на нём — иначе страница логина бесконечно обновляется
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('whatsapp_authorized');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_name');
      if (!isOnLoginPage()) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
