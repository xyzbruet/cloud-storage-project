import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import './styles/index.css'
import { ToastProvider, ConfirmProvider, ToastStyles } from './components/Toast'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Get Google Client ID
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Debug logs - CORRECTED
console.log('🔑 Google Client ID:', googleClientId ? 'Loaded ✓' : 'Missing ✗');
console.log('🔗 API Base URL:', import.meta.env.VITE_API_URL); // ✅ Changed this line

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId || ''}>
      <ToastProvider>
        <ConfirmProvider>
          <ToastStyles />
          <BrowserRouter>
            <QueryClientProvider client={queryClient}>
              <App />
            </QueryClientProvider>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
)