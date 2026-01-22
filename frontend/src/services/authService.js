import api from './api';

export const authService = {
  // ==================== REGISTRATION WITH OTP ====================
  
  sendRegisterOTP: async (data) => {
    try {
      const response = await api.post('/auth/send-register-otp', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  verifyRegisterOTP: async (data) => {
    try {
      const response = await api.post('/api/auth/verify-register-otp', data);
      if (response.data?.data?.token) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== LOGIN WITH OTP ====================

  sendLoginOTP: async (data) => {
    try {
      const response = await api.post('/api/auth/send-login-otp', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  verifyLoginOTP: async (data) => {
    try {
      const response = await api.post('/api/auth/verify-login-otp', data);
      if (response.data?.data?.token) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  googleLogin: async (credential) => {
    try {
      const response = await api.post('/auth/google-login', { credential });
      if (response.data?.data?.token) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== USER INFO ====================

  getCurrentUser: async () => {
    try {
      const response = await api.get('/api/auth/me');
      if (response.data?.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }
      return response.data;
    } catch (error) {
      // Don't throw on 401/400 for getCurrentUser - just return null
      if (error.response?.status === 401 || error.response?.status === 400) {
        return null;
      }
      throw error.response?.data || error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // ==================== PROFILE MANAGEMENT ====================

  updateProfile: async (data) => {
    try {
      const response = await api.put('/api/user/profile', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  uploadProfilePicture: async (file) => {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const response = await api.post('/api/user/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== UTILITY ====================

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  setToken: (token) => {
    localStorage.setItem('token', token);
  }
};

export default authService;