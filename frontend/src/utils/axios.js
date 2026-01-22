import axios from "axios";

// Get API base URL from environment variables
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Debug log - remove after deployment works
console.log('🔗 API Base URL:', API_BASE_URL);

// Create axios instance with base configuration
const instance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // 15 second timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - adds auth token to every request
instance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debug log - remove after deployment works
    console.log('📤 Request:', config.method?.toUpperCase(), config.url);
    
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handles responses and errors
instance.interceptors.response.use(
  (response) => {
    // Debug log - remove after deployment works
    console.log('✅ Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with an error status
      console.error('❌ API Error:', {
        status: error.response.status,
        message: error.response.data?.message || error.response.statusText,
        url: error.config?.url
      });

      // Handle 401 Unauthorized - auto logout
      if (error.response.status === 401) {
        console.log('🔒 Unauthorized - clearing token and redirecting to login');
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('❌ No Response from Backend:', {
        message: 'Backend server is not responding',
        url: error.config?.url,
        baseURL: API_BASE_URL,
        hint: 'Check if your backend is running on Render'
      });
    } else {
      // Error in request setup
      console.error('❌ Request Setup Error:', error.message);
    }

    return Promise.reject(error);
  }
);

export default instance;