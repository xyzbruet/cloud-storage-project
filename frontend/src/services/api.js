import axios from 'axios';

// =====================================================
// BASE API URL
// =====================================================
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Validation - Critical for production
if (!API_BASE_URL) {
  console.error('❌ CRITICAL: VITE_API_URL is not defined in environment variables');
  throw new Error('API_BASE_URL is required');
}

// Remove trailing slash if present
const normalizedBaseURL = API_BASE_URL.replace(/\/$/, '');

// Debug logs (DEV only)
if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', normalizedBaseURL);
  console.log('🌍 Environment:', import.meta.env.MODE);
} else {
  // Production - log once for verification
  console.log('🚀 Production API URL configured:', normalizedBaseURL);
}

// =====================================================
// AXIOS INSTANCE
// =====================================================
const api = axios.create({
  baseURL: normalizedBaseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // ✅ Enable cookies/credentials
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
api.interceptors.request.use(
  (config) => {
    const requestUrl = config.url || '';

    const isPublicAuth = PUBLIC_AUTH_ENDPOINTS.some((endpoint) =>
      requestUrl.includes(endpoint)
    );

    if (!isPublicAuth) {
      const token = localStorage.getItem('token') || 
                    localStorage.getItem('authToken') ||
                    sessionStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      delete config.headers.Authorization;
    }

    if (import.meta.env.DEV) {
      console.log(
        '📤 API Request:',
        config.method?.toUpperCase(),
        config.baseURL + requestUrl,
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
api.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log('✅ Response:', response.config.url, response.status);
    }
    return response;
  },
  (error) => {
    // Handle HTML responses (wrong endpoint)
    if (error.response?.data && typeof error.response.data === 'string' && 
        error.response.data.startsWith('<!doctype')) {
      console.error('❌ HTML received instead of JSON - Check your API endpoint');
      console.error('Full URL:', error.config?.baseURL + error.config?.url);
      console.error('This usually means the backend route doesn\'t exist');
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('❌ 403 Forbidden');
      console.error('URL:', error.config?.baseURL + error.config?.url);
      console.error('Origin:', window.location.origin);
      console.error('Response:', error.response?.data);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.warn('⚠️ Unauthorized - Clearing session');
      localStorage.clear();
      sessionStorage.clear();
      
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    // Handle 400 Bad Request
    if (error.response?.status === 400) {
      console.error('❌ 400 Bad Request:', error.response?.data?.message);
    }

    // Handle 500 Internal Server Error
    if (error.response?.status === 500) {
      console.error('❌ 500 Server Error - Check backend logs');
    }

    // Log errors (production-safe)
    if (import.meta.env.DEV) {
      console.error('❌ API Error:', {
        url: error.config?.url,
        fullURL: error.config?.baseURL + error.config?.url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.response?.data?.message || error.message,
        data: error.response?.data,
      });
    } else {
      // Production - minimal logging
      console.error('API Error:', error.response?.status, error.config?.url);
    }

    return Promise.reject(error);
  }
);

export default api;