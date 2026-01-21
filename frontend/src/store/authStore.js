// src/store/authStore.js - COMPLETE
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // ✅ Primary auth method - use this everywhere
      setAuth: (token, user) => {
        localStorage.setItem('token', token);
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }
        set({ 
          token, 
          user, 
          isAuthenticated: true 
        });
      },

      // ✅ Update user data only (keep existing token)
      updateUser: (user) => {
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }
        set({ user });
      },

      // ✅ Logout
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        });
        window.location.href = '/login';
      },

      // ✅ Initialize auth from localStorage on app start
      initAuth: () => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        if (token) {
          try {
            const user = userStr ? JSON.parse(userStr) : null;
            set({ 
              token, 
              user, 
              isAuthenticated: true 
            });
          } catch (error) {
            console.error('Failed to parse user data:', error);
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            set({ 
              token: null, 
              user: null, 
              isAuthenticated: false 
            });
          }
        } else {
          set({ 
            token: null, 
            user: null, 
            isAuthenticated: false 
          });
        }
      },

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);