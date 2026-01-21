// ===================================================================
// FILE: /src/components/auth/OTPInput.jsx
// ===================================================================

import { useState, useRef, useEffect } from 'react';
import { Shield } from 'lucide-react';

export default function OTPInput({ onComplete, onResend, email, loading = false }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleChange = (index, value) => {
    // Only allow single digit
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
    if (index === 5 && value) {
      const otpCode = [...newOtp.slice(0, 5), value].join('');
      onComplete(otpCode);
    }
  };

  const handleKeyDown = (index, e) => {
    // Move to previous input on backspace if current is empty
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp([...newOtp, ...Array(6 - newOtp.length).fill('')].slice(0, 6));
      
      // Focus last filled input or submit if complete
      if (newOtp.length === 6) {
        onComplete(pastedData);
      } else {
        inputRefs.current[newOtp.length]?.focus();
      }
    }
  };

  const handleResend = () => {
    setOtp(['', '', '', '', '', '']);
    setResendTimer(60);
    onResend();
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Verify Your Email</h3>
        <p className="text-sm text-gray-600 mt-1">
          Enter the 6-digit code sent to<br />
          <span className="font-medium text-gray-900">{email}</span>
        </p>
      </div>

      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={loading}
            onChange={(e) => handleChange(index, e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition disabled:bg-gray-100 disabled:cursor-not-allowed"
            autoFocus={index === 0}
          />
        ))}
      </div>

      <div className="text-center">
        <button
          onClick={handleResend}
          disabled={resendTimer > 0 || loading}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition font-medium"
        >
          {resendTimer > 0 ? (
            `Resend OTP in ${resendTimer}s`
          ) : (
            'Resend OTP'
          )}
        </button>
      </div>

      <p className="text-xs text-gray-500 text-center">
        {loading ? 'Verifying...' : 'Didn\'t receive the code? Check your spam folder or click resend.'}
      </p>
    </div>
  );
}