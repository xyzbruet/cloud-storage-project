// src/App.jsx
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './pages/Dashboard';
import MyDrive from './pages/MyDrive';
import SharedWithMe from './pages/SharedWithMe';
import SharedByMe from './pages/SharedByMe';
import Trash from './pages/Trash';
import Starred from './pages/Starred';
import SearchResults from './pages/SearchResults';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { useAuthStore } from './store/authStore';
import UnifiedShareView from './pages/UnifiedShareView';


function App() {
  const { isAuthenticated, initAuth } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} 
      />
      <Route 
        path="/register" 
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} 
      />
      <Route path="/s/:token" element={<UnifiedShareView />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="my-drive" element={<MyDrive />} />
        <Route path="shared" element={<SharedWithMe />} />
        <Route path="shared-by-me" element={<SharedByMe />} />
        <Route path="starred" element={<Starred />} />
        <Route path="trash" element={<Trash />} />
        <Route path="search" element={<SearchResults />} />
      </Route>
    </Routes>
  );
}

export default App;