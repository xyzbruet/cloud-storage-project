import api from './api';

// =====================================================
// AUTH SERVICE - Simple Password Auth (OTP/Google for future)
// =====================================================
export const authService = {

  // ==================== SIMPLE REGISTRATION ====================

  register: async (data) => {
    try {
      const response = await api.post('/auth/register', data);

      if (response.data?.data?.token) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== SIMPLE LOGIN ====================

  login: async (data) => {
    try {
      const response = await api.post('/auth/login', data);

      if (response.data?.data?.token) {
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));
      }

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== FUTURE: REGISTRATION WITH OTP ====================

  // sendRegisterOTP: async (data) => {
  //   try {
  //     const response = await api.post('/auth/send-register-otp', data);
  //     return response.data;
  //   } catch (error) {
  //     throw error.response?.data || error;
  //   }
  // },

  // verifyRegisterOTP: async (data) => {
  //   try {
  //     const response = await api.post('/auth/verify-register-otp', data);

  //     if (response.data?.data?.token) {
  //       localStorage.setItem('token', response.data.data.token);
  //       localStorage.setItem('user', JSON.stringify(response.data.data.user));
  //     }

  //     return response.data;
  //   } catch (error) {
  //     throw error.response?.data || error;
  //   }
  // },

  // ==================== FUTURE: LOGIN WITH OTP ====================

  // sendLoginOTP: async (data) => {
  //   try {
  //     const response = await api.post('/auth/send-login-otp', data);
  //     return response.data;
  //   } catch (error) {
  //     throw error.response?.data || error;
  //   }
  // },

  // verifyLoginOTP: async (data) => {
  //   try {
  //     const response = await api.post('/auth/verify-login-otp', data);

  //     if (response.data?.data?.token) {
  //       localStorage.setItem('token', response.data.data.token);
  //       localStorage.setItem('user', JSON.stringify(response.data.data.user));
  //     }

  //     return response.data;
  //   } catch (error) {
  //     throw error.response?.data || error;
  //   }
  // },

  // ==================== FUTURE: GOOGLE LOGIN ====================

  googleLogin: async (credential) => {
    try {
      const response = await api.post('/auth/google-login', {
        credential,
      });

      console.log('✅ Full Google login response:', response);
      console.log('✅ Response data:', response.data);

      const responseData = response.data;
      const token = responseData.data?.token || responseData.token;
      const user = responseData.data?.user || responseData.user;

      console.log('🔑 Extracted token:', token ? token.substring(0, 20) + '...' : 'NOT FOUND');
      console.log('👤 Extracted user:', user);

      if (token && user) {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        console.log('✅ Token and user saved to localStorage');
        
        // Force page reload to dashboard after successful login
        console.log('🚀 Redirecting to dashboard...');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 500);
        
        return responseData;
      } else {
        console.error('❌ Token or user missing in response');
        throw new Error('Invalid response from server - missing token or user');
      }
    } catch (error) {
      console.error('❌ Google login error:', error);
      throw error.response?.data || error;
    }
  },

  // ==================== LOGOUT ====================

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  // ==================== PROFILE ====================

  updateProfile: async (data) => {
    try {
      const response = await api.put('/user/profile', data);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  uploadProfilePicture: async (file) => {
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.post('/user/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // ==================== UTIL ====================

  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  },

  getToken: () => {
    return localStorage.getItem('token');
  },

  setToken: (token) => {
    localStorage.setItem('token', token);
  },
};

export default authService;