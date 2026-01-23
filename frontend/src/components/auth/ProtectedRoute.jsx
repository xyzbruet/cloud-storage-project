// src/components/auth/ProtectedRoute.jsx - IMPROVED VERSION
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useState } from 'react';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, initAuth, checkAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  
  // ==================== INITIALIZE AUTH ON MOUNT ====================
  useEffect(() => {
    const initializeAuth = async () => {
      console.log('🔍 ProtectedRoute: Initializing...');
      console.log('📍 Current path:', location.pathname);
      
      const token = localStorage.getItem('token');
      console.log('🔑 Token in localStorage:', token ? 'Found ✅' : 'Missing ❌');
      
      // If we have a token but Zustand doesn't know about it, sync it
      if (token && !isAuthenticated) {
        console.log('🔄 Syncing auth state from localStorage...');
        initAuth();
      }
      
      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setIsChecking(false);
      console.log('✅ Auth check complete');
    };

    initializeAuth();
  }, [isAuthenticated, initAuth, location.pathname]);
  
  // ==================== AUTH CHECK ====================
  // Check both Zustand store AND localStorage for maximum reliability
  const hasToken = !!localStorage.getItem('token');
  const shouldAllow = isAuthenticated || hasToken;
  
  console.log('🔐 ProtectedRoute Auth Status:', {
    path: location.pathname,
    isAuthenticated,
    hasToken,
    shouldAllow,
    isChecking
  });
  
  // ==================== LOADING STATE ====================
  if (isChecking) {
    console.log('⏳ ProtectedRoute: Verifying authentication...');
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Verifying authentication...</p>
        </div>
      </div>
    );
  }
  
  // ==================== REDIRECT IF NOT AUTHENTICATED ====================
  if (!shouldAllow) {
    console.log('🚫 ProtectedRoute: Access denied');
    console.log('🔀 Redirecting to login...');
    
    // Redirect to login with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ==================== GRANT ACCESS ====================
  console.log('✅ ProtectedRoute: Access granted');
  return children;
}