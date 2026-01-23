import axios from 'axios';

// =====================================================
// BASE API URL - FIXED VERSION
// =====================================================
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// Remove trailing slash if present
const normalizedBaseURL = API_BASE_URL.replace(/\/$/, '');

// ⚠️ CRITICAL DEBUG LOGS - Check these in console
console.log('🔍 Raw VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('🔗 Final API Base URL:', normalizedBaseURL);
console.log('🌍 Environment Mode:', import.meta.env.MODE);

// Validation - Critical for production
if (!normalizedBaseURL) {
  console.error('❌ CRITICAL: API_BASE_URL is not configured');
  throw new Error('API_BASE_URL is required');
}

// =====================================================
// AXIOS INSTANCE - FIXED
// =====================================================
const api = axios.create({
  baseURL: normalizedBaseURL,
  timeout: 90000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// ⚠️ VERIFY AXIOS CONFIG
console.log('🔧 Axios baseURL configured as:', api.defaults.baseURL);

// =====================================================
// PUBLIC AUTH ENDPOINTS (No token required)
// =====================================================
const PUBLIC_AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  // Future OTP/Google endpoints
  // '/auth/send-login-otp',
  // '/auth/verify-login-otp',
  // '/auth/send-register-otp',
  // '/auth/verify-register-otp',
  // '/auth/google-login',
];

// =====================================================
// REQUEST INTERCEPTOR
// =====================================================
api.interceptors.request.use(
  (config) => {
    // Ensure URL always starts with /
    let requestUrl = config.url || '';
    if (requestUrl && !requestUrl.startsWith('/')) {
      requestUrl = '/' + requestUrl;
      config.url = requestUrl;
    }

    // ⚠️ DEBUG: Log the full URL being constructed
    const fullUrl = config.baseURL + requestUrl;
    console.log('🌐 Full Request URL:', fullUrl);
    console.log('📍 Base URL:', config.baseURL);
    console.log('📍 Endpoint:', requestUrl);

    // Check if this is a public endpoint
    const isPublicAuth = PUBLIC_AUTH_ENDPOINTS.some((endpoint) =>
      requestUrl.includes(endpoint)
    );

    // Add Authorization header for protected endpoints
    if (!isPublicAuth) {
      const token = localStorage.getItem('token') || 
                    localStorage.getItem('authToken') ||
                    sessionStorage.getItem('token');
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token attached:', token.substring(0, 30) + '...');
      } else {
        console.warn('⚠️ No token found for protected endpoint:', requestUrl);
      }
    } else {
      // Remove any existing Authorization header for public endpoints
      delete config.headers.Authorization;
      console.log('🔓 Public endpoint - no token needed:', requestUrl);
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
    console.log('✅ Response:', response.config.url, response.status);
    console.log('📦 Response data:', response.data);
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message;
    const url = error.config?.url;

    // Handle HTML responses (wrong endpoint or CORS issue)
    if (error.response?.data && typeof error.response.data === 'string' && 
        error.response.data.startsWith('<!doctype')) {
      console.error('❌ HTML received instead of JSON - Check your API endpoint');
      console.error('Full URL:', error.config?.baseURL + url);
      console.error('This usually means the backend route doesn\'t exist');
    }

    // Handle Authentication Errors (401 and 400 with auth message)
    if (
      status === 401 ||
      (status === 400 && message?.toLowerCase().includes('not authenticated')) ||
      (status === 400 && message?.toLowerCase().includes('user not authenticated'))
    ) {
      console.warn('⚠️ Authentication failed - Clearing session and redirecting to login');
      
      // Clear all storage
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      sessionStorage.clear();
      
      // Redirect to login (avoid infinite loop)
      if (!window.location.pathname.includes('/login') && 
          !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }

    // Handle 403 Forbidden
    if (status === 403) {
      console.error('❌ 403 Forbidden - You don\'t have permission to access this resource');
      console.error('URL:', error.config?.baseURL + url);
    }

    // Handle other 400 Bad Request errors
    if (status === 400) {
      console.error('❌ 400 Bad Request:', message);
    }

    // Handle 404 Not Found
    if (status === 404) {
      console.error('❌ 404 Not Found:', url);
      console.error('Full URL attempted:', error.config?.baseURL + url);
    }

    // Handle 500 Internal Server Error
    if (status === 500) {
      console.error('❌ 500 Server Error - Check backend logs');
    }

    // Handle Network Errors (no response)
    if (!error.response) {
      console.error('❌ Network Error - Backend might be down or unreachable');
      console.error('Attempted URL:', error.config?.baseURL + url);
    }

    // Detailed error logging
    console.error('❌ API Error Details:', {
      url: url,
      baseURL: error.config?.baseURL,
      fullURL: error.config?.baseURL + url,
      method: error.config?.method?.toUpperCase(),
      status: status,
      statusText: error.response?.statusText,
      message: message,
      data: error.response?.data,
      headers: {
        request: error.config?.headers,
        response: error.response?.headers,
      },
    });

    return Promise.reject(error);
  }
);

export default api;