// ===================================================================
// FILE: /src/services/authService.js - FIXED
// ===================================================================

import axios from 'axios';

// ✅ FIXED: Use VITE_API_BASE_URL instead of VITE_API_URL
const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

console.log('🔗 Auth Service API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // ==================== REGISTRATION WITH OTP ====================
  
  /**
   * Send OTP for registration verification
   */
  sendRegisterOTP: async (data) => {
    const response = await api.post('/api/auth/send-register-otp', data);
    return response;
  },

  /**
   * Verify OTP and complete registration
   */
  verifyRegisterOTP: async (data) => {
    const response = await api.post('/api/auth/verify-register-otp', data);
    if (response.data?.data?.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response;
  },

  // ==================== LOGIN WITH OTP ====================

  /**
   * Send OTP for login
   */
  sendLoginOTP: async (data) => {
    const response = await api.post('/api/auth/send-login-otp', data);
    return response;
  },

  /**
   * Verify OTP and login
   */
  verifyLoginOTP: async (data) => {
    const response = await api.post('/api/auth/verify-login-otp', data);
    if (response.data?.data?.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response;
  },

  /**
   * Login with Google OAuth
   */
  googleLogin: async (credential) => {
    const response = await api.post('/api/auth/google-login', { 
      credential: credential 
    });
    if (response.data?.data?.token) {
      localStorage.setItem('token', response.data.data.token);
    }
    return response;
  },

  // ==================== USER INFO ====================

  /**
   * Get current logged-in user information
   */
  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response;
  },

  /**
   * Logout user and clear token
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Update user profile information
   */
  updateProfile: async (data) => {
    const response = await api.put('/api/user/profile', data);
    return response;
  },

  /**
   * Upload profile picture
   */
  uploadProfilePicture: async (file) => {
    const formData = new FormData();
    formData.append('profilePicture', file);
    const response = await api.post('/api/user/profile-picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response;
  },

  // ==================== EMAIL CHANGE ====================

  /**
   * Send OTP for email change verification
   */
  sendOTP: async (email) => {
    const response = await api.post('/api/user/send-email-otp', { email });
    return response;
  },

  /**
   * Verify OTP and update email
   */
  verifyOTP: async (email, otp) => {
    const response = await api.post('/api/user/verify-email-otp', { email, otp });
    return response;
  },

  // ==================== TOKEN MANAGEMENT ====================

  /**
   * Check if user is authenticated
   */
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  /**
   * Get stored token
   */
  getToken: () => {
    return localStorage.getItem('token');
  },

  /**
   * Set token manually (useful for testing)
   */
  setToken: (token) => {
    localStorage.setItem('token', token);
  }
};

export default api;