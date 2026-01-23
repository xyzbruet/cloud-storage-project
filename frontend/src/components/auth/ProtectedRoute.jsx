import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useEffect, useState } from 'react'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, initAuth } = useAuthStore()
  const [isChecking, setIsChecking] = useState(true)
  
  // Check auth on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    console.log('🔍 ProtectedRoute: Checking localStorage token:', token ? 'Found ✅' : 'Missing ❌');
    
    if (token && !isAuthenticated) {
      console.log('🔄 ProtectedRoute: Re-syncing auth from localStorage...');
      initAuth();
    }
    
    // Give it a moment to sync
    setTimeout(() => {
      setIsChecking(false);
    }, 100);
  }, [isAuthenticated, initAuth]);
  
  // Check both Zustand store and localStorage
  const hasToken = !!localStorage.getItem('token')
  const shouldAllow = isAuthenticated || hasToken;
  
  console.log('🔐 ProtectedRoute check:', {
    isAuthenticated,
    hasToken,
    shouldAllow,
    isChecking,
    path: window.location.pathname
  });
  
  // Wait for initial check
  if (isChecking) {
    console.log('⏳ ProtectedRoute: Checking auth...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!shouldAllow) {
    console.log('🚫 ProtectedRoute: Access denied, redirecting to login');
    return <Navigate to="/login" replace />
  }

  console.log('✅ ProtectedRoute: Access granted');
  return children
}