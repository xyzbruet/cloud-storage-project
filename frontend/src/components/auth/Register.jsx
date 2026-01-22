// src/components/auth/Register.jsx - FIXED
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../Toast';
import { Cloud, Mail, Lock, User, Phone } from 'lucide-react';
import GoogleButton from './GoogleButton';
import OTPInput from './OTPInput';

export default function Register() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const toast = useToast(); // Changed from { showToast }
  
  const [step, setStep] = useState('register');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate phone number if provided
    if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.sendRegisterOTP(formData);
      
      if (response.data.success) {
        setStep('otp');
        toast.success('OTP sent to your email!'); // Fixed
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(message);
      toast.error(message); // Fixed
      console.error('Send register OTP error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (otp) => {
    setLoading(true);
    setError('');

    try {
      const response = await authService.verifyRegisterOTP({ 
        email: formData.email, 
        otp 
      });
      
      if (response.data.success && response.data.data) {
        const { token, user } = response.data.data;
        
        setAuth(token, user);
        toast.success('Registration successful! Welcome aboard!'); // Fixed
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const message = err.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(message);
      toast.error(message); // Fixed
      console.error('Verify register OTP error:', err);
      setLoading(false);
      throw err;
    }
  };

  const handleResendOTP = async () => {
    try {
      const response = await authService.sendRegisterOTP(formData);
      
      if (response.data.success) {
        setError('');
        toast.success('New OTP sent to your email!'); // Fixed
      }
    } catch (err) {
      const message = 'Failed to resend OTP';
      setError(message);
      toast.error(message); // Fixed
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4 shadow-lg">
              <Cloud className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              {step === 'register' ? 'Create Account' : 'Verify Email'}
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {step === 'register' 
                ? 'Get started with 5GB free storage' 
                : 'Enter the code sent to your email'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                </svg>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}

          {step === 'register' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => handleChange('fullName', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="John Doe"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Phone (Optional) */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-2">
                  Phone Number <span className="text-gray-400 text-xs">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="+91 9876543210"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    disabled={loading}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending OTP...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Google Sign Up */}
              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white px-3 text-gray-500 font-medium">Or sign up with</span>
                  </div>
                </div>

                <div className="mt-4">
                  <GoogleButton />
                </div>
              </div>

              {/* Login Link */}
              <div className="text-center text-sm">
                <span className="text-gray-600">Already have an account? </span>
                <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
                  Sign in
                </Link>
              </div>
            </form>
          ) : (
            /* OTP Verification Step */
            <div>
              <OTPInput
                email={formData.email}
                onComplete={handleOTPVerify}
                onResend={handleResendOTP}
                loading={loading}
              />
              
              <button
                onClick={() => {
                  setStep('register');
                  setError('');
                }}
                disabled={loading}
                className="w-full mt-4 text-sm text-gray-600 hover:text-gray-700 transition disabled:text-gray-400"
              >
                ← Back to registration
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}