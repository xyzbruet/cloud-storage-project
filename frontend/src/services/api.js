import axios from 'axios';

// Base URL MUST include /api
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', API_URL);
  console.log('🌍 Environment:', import.meta.env.MODE);
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (import.meta.env.DEV) {
      console.log('📤 API Request:', config.method?.toUpperCase(), config.url);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (typeof data === 'string' && data.startsWith('<!doctype')) {
        console.error('❌ HTML received instead of JSON (wrong endpoint)');
      }

      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
