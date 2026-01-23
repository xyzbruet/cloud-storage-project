// src/store/authStore.js - IMPROVED VERSION
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // ==================== STATE ====================
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // ==================== PRIMARY AUTH METHOD ====================
      // ✅ Use this for login/register - sets both token and user
      setAuth: (token, user) => {
        console.log('🔐 setAuth called:', { 
          hasToken: !!token, 
          hasUser: !!user,
          userName: user?.fullName || user?.email 
        });

        // Store in localStorage (primary source of truth)
        if (token) {
          localStorage.setItem('token', token);
        }
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
        }

        // Update Zustand store
        set({ 
          token, 
          user, 
          isAuthenticated: !!token 
        });

        console.log('✅ Auth state updated successfully');
      },

      // ==================== UPDATE USER DATA ====================
      // ✅ Use this to update user profile (keeps existing token)
      updateUser: (user) => {
        console.log('👤 updateUser called:', user?.fullName || user?.email);
        
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          set({ user });
          console.log('✅ User data updated');
        }
      },

      // ==================== LOGOUT ====================
      // ✅ Clear all auth data and redirect to login
      logout: () => {
        console.log('🚪 Logging out...');
        
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Clear Zustand store
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        });

        console.log('✅ Logged out successfully');
        
        // Redirect to login
        window.location.href = '/login';
      },

      // ==================== INITIALIZE AUTH ====================
      // ✅ Call this on app startup to restore session from localStorage
      initAuth: () => {
        console.log('🔄 Initializing auth from localStorage...');
        
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
            
            console.log('✅ Auth restored:', {
              hasToken: true,
              hasUser: !!user,
              userName: user?.fullName || user?.email
            });
          } catch (error) {
            console.error('❌ Failed to parse user data:', error);
            
            // Clear corrupted data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            set({ 
              token: null, 
              user: null, 
              isAuthenticated: false 
            });
          }
        } else {
          console.log('ℹ️ No token found - user not authenticated');
          
          set({ 
            token: null, 
            user: null, 
            isAuthenticated: false 
          });
        }
      },

      // ==================== LOADING STATE ====================
      // ✅ Use this for showing loading indicators
      setLoading: (isLoading) => {
        set({ isLoading });
      },

      // ==================== HELPER METHODS ====================
      // ✅ Check if user is authenticated
      checkAuth: () => {
        const state = get();
        const hasToken = !!localStorage.getItem('token');
        return state.isAuthenticated || hasToken;
      },

      // ✅ Get current token
      getToken: () => {
        return get().token || localStorage.getItem('token');
      },

      // ✅ Get current user
      getUser: () => {
        const state = get();
        if (state.user) return state.user;
        
        try {
          const userStr = localStorage.getItem('user');
          return userStr ? JSON.parse(userStr) : null;
        } catch {
          return null;
        }
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      partialize: (state) => ({ 
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
);