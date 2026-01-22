import axios from 'axios';

// ================= BASE URL =================
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Debug logging
if (import.meta.env.DEV) {
  console.log('🔗 Axios Base URL:', API_BASE_URL);
  console.log('🌍 Environment:', import.meta.env.MODE);
}

// ================= AXIOS INSTANCE =================
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// ================= PUBLIC AUTH ENDPOINTS =================
const PUBLIC_AUTH_ENDPOINTS = [
  '/api/auth/send-login-otp',
  '/api/auth/verify-login-otp',
  '/api/auth/send-register-otp',
  '/api/auth/verify-register-otp',
  '/api/auth/google-login',
];

// ================= REQUEST INTERCEPTOR =================
axiosInstance.interceptors.request.use(
  (config) => {
    const requestUrl = config.url || '';

    // Check if endpoint is public auth
    const isPublicAuth = PUBLIC_AUTH_ENDPOINTS.some((endpoint) =>
      requestUrl.includes(endpoint)
    );

    // Attach token ONLY for protected endpoints
    if (!isPublicAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } else {
      // Ensure no Authorization header is sent
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
    console.error('❌ Axios Request Error:', error);
    return Promise.reject(error);
  }
);

// ================= RESPONSE INTERCEPTOR =================
axiosInstance.interceptors.response.use(
  (response) => {
    if (import.meta.env.DEV) {
      console.log(
        '✅ Axios Response:',
        response.status,
        response.config.url
      );
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      console.error('❌ Axios API Error:', {
        status,
        message: data?.message || error.message,
        url: error.config?.url,
      });

      // 🔐 Auto logout ONLY on 401
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        const path = window.location.pathname;
        if (
          !path.includes('/login') &&
          !path.includes('/register') &&
          !path.includes('/forgot-password')
        ) {
          window.location.href = '/login';
        }
      }

      if (status === 403) {
        console.warn('⛔ Forbidden - insufficient permissions');
      }
    } else if (error.request) {
      console.error('❌ No Response from Server:', {
        message: 'Backend server is not responding',
        url: error.config?.url,
        baseURL: API_BASE_URL,
      });
    } else {
      console.error('❌ Request Setup Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
