// src/components/profile/UserProfile.jsx - FIXED IMAGE DISPLAY
import { useState } from 'react';
import { User, Mail, Phone, Save, X, Check } from 'lucide-react';
import ProfilePictureUpload from './ProfilePictureUpload';
import OTPVerification from './OTPVerification';
import { authService } from '../../services/authService';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../Toast';

const getProfileImageUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('http') || path.startsWith('blob:')) return path;
  // Fallback to localhost:8080 if env var not set
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  return `${baseUrl}${path}`;
};

export default function UserProfile({ onClose }) {
  const { user, token, setAuth } = useAuthStore();
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profilePicture: user?.profilePicture || null
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [profilePictureFile, setProfilePictureFile] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setError('');
    setSuccess('');
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    // Just update the form data, don't trigger OTP yet
    handleInputChange('email', newEmail);
  };

  const handleSendOTP = async () => {
    const newEmail = formData.email;
    
    // Check if email actually changed
    if (newEmail === user.email) {
      return; // No change, no need for OTP
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    setPendingEmail(newEmail);
    setShowOTP(true);
    
    try {
      await authService.sendOTP(newEmail);
      toast.info('OTP sent to new email');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send OTP';
      setError(message);
      toast.error(message);
      setShowOTP(false);
    }
  };

  const handleOTPVerify = async (otp) => {
    try {
      await authService.verifyOTP(pendingEmail, otp);
      // Email is now verified, it will be saved with the profile
      setShowOTP(false);
      setPendingEmail('');
      setSuccess('Email verified successfully');
      toast.success('Email verified successfully');
    } catch (err) {
      throw new Error('Invalid OTP');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Check if email changed and needs verification
      if (formData.email !== user.email) {
        // Email changed but not verified yet
        if (formData.email !== pendingEmail) {
          setError('Please verify your new email address before saving');
          setLoading(false);
          return;
        }
      }

      // Validate phone number
      if (formData.phone && !/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
        setError('Please enter a valid 10-digit phone number');
        setLoading(false);
        return;
      }

      let profilePictureUrl = formData.profilePicture;

      // Upload profile picture if changed
      if (profilePictureFile) {
        try {
          const pictureResponse = await authService.uploadProfilePicture(profilePictureFile);
          console.log('Picture upload response:', pictureResponse.data);
          
          // Handle different response formats
          profilePictureUrl = 
            pictureResponse.data.data?.profilePicture || 
            pictureResponse.data.data || 
            pictureResponse.data.profilePicture;
            
        } catch (err) {
          console.error('Profile picture upload error:', err);
          throw new Error('Failed to upload profile picture');
        }
      }

      // Update profile
      const updateData = {
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        profilePicture: profilePictureUrl
      };
      
      console.log('Updating profile with:', updateData);
      const response = await authService.updateProfile(updateData);
      console.log('Profile update response:', response.data);

      // Handle different response formats
      const updatedUser = 
        response.data.data?.user || 
        response.data.user || 
        response.data.data;
      
      if (!updatedUser) {
        throw new Error('Invalid response format from server');
      }

      // Update auth store with new user data (keep existing token)
      setAuth(token, updatedUser);
      
      setSuccess('Profile updated successfully!');
      toast.success('Profile updated successfully!');
      setIsEditing(false);
      setProfilePictureFile(null);
      setPendingEmail(''); // Clear pending email after successful save
      
      // ✅ FIX: Update local form data with actual paths (not preview URLs)
      setFormData({
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        profilePicture: updatedUser.profilePicture // This will be the server path
      });
    } catch (err) {
      console.error('Profile update error:', err);
      console.error('Error response:', err.response?.data);
      
      const message = 
        err.response?.data?.message || 
        err.message || 
        'Failed to update profile';
      
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfilePictureUpload = (file, preview) => {
    setProfilePictureFile(file);
    // ✅ FIX: Store preview URL temporarily in formData for immediate display
    setFormData({ ...formData, profilePicture: preview });
  };

  const handleProfilePictureRemove = () => {
    setProfilePictureFile(null);
    setFormData({ ...formData, profilePicture: null });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      profilePicture: user?.profilePicture || null
    });
    setProfilePictureFile(null);
    setPendingEmail('');
    setError('');
    setSuccess('');
  };

  // Format storage display
  const formatStorage = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(2)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  // ✅ FIX: Calculate the display URL for profile picture
  // If it's a blob URL (preview), use as-is
  // If it's a server path, convert it to full URL
  const displayProfilePicture = formData.profilePicture?.startsWith('blob:') 
    ? formData.profilePicture 
    : getProfileImageUrl(formData.profilePicture);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-gray-100 rounded-full transition"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div className="p-6">
            {/* Success Message */}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
                <Check className="w-4 h-4" />
                {success}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Profile Picture - ✅ FIX: Pass the display URL */}
            <div className="mb-8">
              <ProfilePictureUpload
                currentImage={displayProfilePicture}
                onUpload={handleProfilePictureUpload}
                onRemove={handleProfilePictureRemove}
                disabled={!isEditing}
              />
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    disabled={!isEditing}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600 transition"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                  {user?.emailVerified && (
                    <span className="ml-2 text-xs text-green-600 font-normal">
                      ✓ Verified
                    </span>
                  )}
                  {pendingEmail && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">
                      (New email verified)
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={handleEmailChange}
                    disabled={!isEditing}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600 transition"
                    placeholder="you@example.com"
                  />
                </div>
                {isEditing && formData.email !== user.email && (
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Verify new email address
                    </button>
                    <p className="mt-1 text-xs text-gray-500">
                      You must verify your new email before saving
                    </p>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    disabled={!isEditing}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-600 transition"
                    placeholder="+91 9876543210"
                  />
                </div>
              </div>

              {/* Account Information */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Account Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Storage Used</span>
                    <span className="font-medium text-gray-900">
                      {formatStorage(user?.storageUsed)} / {formatStorage(user?.storageLimit)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Member Since</span>
                    <span className="font-medium text-gray-900">
                      {user?.createdAt 
                        ? new Date(user.createdAt).toLocaleDateString() 
                        : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Provider</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {user?.provider || 'Email'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 flex gap-3">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOTP && (
        <OTPVerification
          email={pendingEmail}
          onVerify={handleOTPVerify}
          onResend={async () => await authService.sendOTP(pendingEmail)}
          onCancel={() => {
            setShowOTP(false);
            setPendingEmail('');
          }}
        />
      )}
    </>
  );
}