import axios from 'axios';

// =====================================================
// BASE API URL
// =====================================================
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Validation - Critical for production
if (!API_BASE_URL) {
  console.error('❌ CRITICAL: VITE_API_URL is not defined in environment variables');
  throw new Error('API_BASE_URL is required');
}

// Debug logs
if (import.meta.env.DEV) {
  console.log('🔗 Axios Base URL:', API_BASE_URL);
  console.log('🌍 Environment:', import.meta.env.MODE);
} else {
  console.log('🚀 Production Axios configured');
}

// =====================================================
// AXIOS INSTANCE
// =====================================================
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// =====================================================
// PUBLIC AUTH ENDPOINTS
// =====================================================
const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/send-login-otp',
  '/auth/verify-login-otp',
  '/auth/send-register-otp',
  '/auth/verify-register-otp',
  '/auth/google-login',
];

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================
axiosInstance.interceptors.request.use(
  (config) => {
    const requestUrl = config.url || '';

    const isPublicAuth = PUBLIC_AUTH_ENDPOINTS.some((endpoint) =>
      requestUrl.includes(endpoint)
    );

    if (!isPublicAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      delete config.headers.Authorization;
    }

    if (import.meta.env.DEV) {
      console.log(
        '📤 Axios Request:',
        config.method?.toUpperCase(),
        requestUrl,
        isPublicAuth ? '(public)' : '(protected)'
      );
    }

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// =====================================================
// RESPONSE INTERCEPTOR
// =====================================================
axiosInstance.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('✅ Response:', response.config.url, response.status);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Unauthorized - Clearing session');
      localStorage.clear();
      
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    if (import.meta.env.DEV) {
      console.error('❌ API Error:', {
        url: error.config?.url,
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
      });
    } else {
      console.error('API Error:', error.response?.status, error.config?.url);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;