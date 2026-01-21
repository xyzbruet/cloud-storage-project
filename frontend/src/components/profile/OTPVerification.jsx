import { useState } from 'react';
import { X } from 'lucide-react';
import OTPInput from '../auth/OTPInput';

export default function OTPVerification({ email, onVerify, onResend, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (otp) => {
    setLoading(true);
    setError('');
    
    try {
      await onVerify(otp);
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Email Verification</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <OTPInput
          email={email}
          onComplete={handleVerify}
          onResend={onResend}
          loading={loading}
        />

        <button
          onClick={onCancel}
          className="w-full mt-4 py-2 text-gray-600 hover:text-gray-700 transition text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}