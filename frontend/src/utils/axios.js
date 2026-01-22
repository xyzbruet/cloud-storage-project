import axios from 'axios';

// Get API base URL from environment variables
// This does NOT include '/api' in the path
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Debug logging - check console to verify correct URL is being used
if (import.meta.env.DEV) {
  console.log('🔗 Axios Base URL:', API_BASE_URL);
  console.log('🌍 Environment:', import.meta.env.MODE);
}

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for slow connections/cold starts
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to true if using cookies
});

// ==================== REQUEST INTERCEPTOR ====================
// Automatically adds JWT token to every request
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug logging in development only
    if (import.meta.env.DEV) {
      console.log('📤 Axios Request:', config.method?.toUpperCase(), config.url);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Axios Request Error:', error);
    return Promise.reject(error);
  }
);

// ==================== RESPONSE INTERCEPTOR ====================
// Handles responses and auth errors globally
axiosInstance.interceptors.response.use(
  (response) => {
    // Debug logging in development only
    if (import.meta.env.DEV) {
      console.log('✅ Axios Response:', response.status, response.config.url);
    }
    return response;
  },
  (error) => {
    // Handle different error scenarios
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      console.error('❌ Axios API Error:', {
        status,
        message: data?.message || error.message,
        url: error.config?.url
      });

      // Handle 401 Unauthorized - Auto logout
      if (status === 401) {
        console.log('🔒 Unauthorized - logging out');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Prevent redirect loop on auth pages
        const currentPath = window.location.pathname;
        if (!currentPath.includes('/login') && 
            !currentPath.includes('/register') && 
            !currentPath.includes('/forgot-password')) {
          window.location.href = '/login';
        }
      }

      // Handle 403 Forbidden
      if (status === 403) {
        console.warn('⛔ Forbidden - insufficient permissions');
      }

      // Handle 404 Not Found
      if (status === 404) {
        console.warn('🔍 Not Found:', error.config?.url);
      }

      // Handle 500 Internal Server Error
      if (status >= 500) {
        console.error('💥 Server Error - please try again later');
      }

    } else if (error.request) {
      // Request was made but no response received
      console.error('❌ No Response from Server:', {
        message: 'Backend server is not responding',
        url: error.config?.url,
        baseURL: API_BASE_URL,
        hint: error.code === 'ECONNABORTED' 
          ? 'Request timeout - server took too long to respond' 
          : 'Connection failed - check if backend is running',
        suggestion: import.meta.env.PROD 
          ? 'Check if backend is deployed and VITE_API_BASE_URL is set correctly'
          : 'Make sure backend is running on the correct port'
      });
    } else {
      // Error in request setup
      console.error('❌ Request Setup Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;