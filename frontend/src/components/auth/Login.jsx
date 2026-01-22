// src/components/auth/Login.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../Toast';
import { GoogleLogin } from '@react-oauth/google';
import { Cloud } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const toast = useToast(); // Changed from { showToast }
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: ''
  });
  const [loading, setLoading] = useState(false);

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.sendLoginOTP({
        email: formData.email,
        password: formData.password
      });

      if (response.data.success) {
        setStep('otp');
        toast.success('OTP sent to your email!'); // Fixed
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send OTP';
      toast.error(message); // Fixed
      console.error('Send OTP error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Login
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await authService.verifyLoginOTP({
        email: formData.email,
        otp: formData.otp
      });

      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        
        setAuth(token, user);
        toast.success('Login successful!'); // Fixed
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid OTP';
      toast.error(message); // Fixed
      console.error('Verify OTP error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Google Login Handler
  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const response = await authService.googleLogin(credentialResponse.credential);
      
      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        
        setAuth(token, user);
        toast.success('Login successful!'); // Fixed
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Google login failed';
      toast.error(message); // Fixed
      console.error('Google login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google login failed'); // Fixed
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      await authService.sendLoginOTP({
        email: formData.email,
        password: formData.password
      });
      setFormData({ ...formData, otp: '' });
      toast.success('New OTP sent!'); // Fixed
    } catch (error) {
      toast.error('Failed to resend OTP'); // Fixed
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
            <Cloud className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">
            {step === 'login' 
              ? 'Sign in to access your cloud storage' 
              : 'Enter the OTP sent to your email'}
          </p>
        </div>

        {/* Login Form */}
        {step === 'login' ? (
          <form onSubmit={handleSendOTP} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="you@example.com"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? 'Sending OTP...' : 'Continue with OTP'}
            </button>
          </form>
        ) : (
          /* OTP Verification Form */
          <form onSubmit={handleVerifyOTP} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Verification Code
              </label>
              <p className="text-sm text-gray-600 mb-3">
                We sent a 6-digit code to <strong>{formData.email}</strong>
              </p>
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setFormData({ ...formData, otp: value });
                }}
                required
                maxLength={6}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-3xl tracking-[0.5em] font-bold transition"
                placeholder="000000"
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || formData.otp.length !== 6}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-semibold hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setStep('login');
                  setFormData({ ...formData, otp: '' });
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
                disabled={loading}
              >
                ← Back to login
              </button>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
              >
                Resend OTP
              </button>
            </div>
          </form>
        )}

        {/* Google Sign In */}
        {step === 'login' && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                logo_alignment="left"
              />
            </div>
          </>
        )}

        {/* Register Link */}
        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link 
            to="/register" 
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}