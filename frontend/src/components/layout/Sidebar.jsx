import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  FolderOpen, 
  Share2, 
  Star, 
  Trash2, 
  HardDrive, 
  Users, 
  X
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

import UploadMenu from '../common/UploadMenu';'../components/common/UploadMenu';

const navigation = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'My Drive', href: '/my-drive', icon: FolderOpen },
  { name: 'Shared with me', href: '/shared', icon: Share2 },
  { name: 'Shared by me', href: '/shared-by-me', icon: Users },
  { name: 'Starred', href: '/starred', icon: Star },
  { name: 'Trash', href: '/trash', icon: Trash2 },
];

export default function Sidebar({ isOpen, onClose, onUpload, onCreateFolder }) {
  const location = useLocation();
  const { user } = useAuthStore();
  const [storageUsed, setStorageUsed] = useState(0);
  const [totalStorage, setTotalStorage] = useState(5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    calculateStorage();

    const handleStorageUpdate = () => {
      calculateStorage();
    };

    window.addEventListener('storage-updated', handleStorageUpdate);
    window.addEventListener('file-uploaded', handleStorageUpdate);
    window.addEventListener('file-deleted', handleStorageUpdate);
    window.addEventListener('file-restored', handleStorageUpdate);

    const interval = setInterval(() => {
      calculateStorage();
    }, 10000);

    return () => {
      window.removeEventListener('storage-updated', handleStorageUpdate);
      window.removeEventListener('file-uploaded', handleStorageUpdate);
      window.removeEventListener('file-deleted', handleStorageUpdate);
      window.removeEventListener('file-restored', handleStorageUpdate);
      clearInterval(interval);
    };
  }, []);

  const calculateStorage = async () => {
    if (storageUsed === 0) {
      setLoading(true);
    }

    try {
      try {
        const userResponse = await api.get('/auth/me');
        if (userResponse.data) {
          const userData = userResponse.data.user || userResponse.data;
          if (userData.storageUsed !== undefined && userData.storageLimit !== undefined) {
            const usedGB = userData.storageUsed / (1024 * 1024 * 1024);
            const limitGB = userData.storageLimit / (1024 * 1024 * 1024);
            setStorageUsed(usedGB);
            setTotalStorage(limitGB);
            setLoading(false);
            return;
          }
        }
      } catch (userErr) {
        // Fallback to file calculation
      }

      const response = await api.get('files');
      
      if (response.data) {
        const files = Array.isArray(response.data.data) 
          ? response.data.data 
          : Array.isArray(response.data) 
          ? response.data 
          : [];

        const activeFiles = files.filter(file => !file.deletedAt && !file.isDeleted);
        
        const totalBytes = activeFiles.reduce((sum, file) => {
          return sum + (file.size || 0);
        }, 0);
        
        const totalGB = totalBytes / (1024 * 1024 * 1024);
        setStorageUsed(totalGB);
        
        if (user?.storageLimit) {
          const limitGB = user.storageLimit / (1024 * 1024 * 1024);
          setTotalStorage(limitGB);
        }
      }
    } catch (err) {
      console.error('Failed to calculate storage:', err);
      if (storageUsed === 0) {
        setStorageUsed(0);
      }
    } finally {
      setLoading(false);
    }
  };

  const storagePercentage = Math.min((storageUsed / totalStorage) * 100, 100);
  const isNearLimit = storagePercentage > 80;
  const isAtLimit = storagePercentage >= 100;

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleUploadFromMenu = (files, type) => {
    if (onUpload) {
      onUpload(files, type);
    }
  };

  const handleCreateFolderFromMenu = () => {
    if (onCreateFolder) {
      onCreateFolder();
    }
  };

  return (
    <aside
      className={`
        fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 
        transform transition-transform duration-300 ease-in-out z-40 overflow-y-auto
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      <div className="flex flex-col h-full">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <span className="text-lg font-semibold text-gray-900">Menu</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="Close menu"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Upload Menu Component */}
        <div className="px-3 pt-4 pb-2">
          <UploadMenu 
            onUpload={handleUploadFromMenu}
            onCreateFolder={handleCreateFolderFromMenu}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={handleLinkClick}
                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-blue-700' : 'text-gray-500'
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Storage Section */}
        <div className="px-4 py-4 border-t border-gray-200 bg-gray-50">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center space-x-2 mb-3">
              <HardDrive
                className={`w-5 h-5 flex-shrink-0 ${
                  isAtLimit
                    ? 'text-red-500'
                    : isNearLimit
                    ? 'text-yellow-500'
                    : 'text-gray-500'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  isAtLimit
                    ? 'text-red-600'
                    : isNearLimit
                    ? 'text-yellow-600'
                    : 'text-gray-700'
                }`}
              >
                Storage
              </span>
              {loading && storageUsed === 0 && (
                <div className="ml-auto">
                  <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-baseline text-xs">
                <span className="text-gray-600 font-medium">
                  {storageUsed.toFixed(2)} GB
                </span>
                <span className="text-gray-500">of {totalStorage.toFixed(0)} GB</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    isAtLimit 
                      ? 'bg-red-500' 
                      : isNearLimit 
                      ? 'bg-yellow-500' 
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${storagePercentage}%` }}
                />
              </div>

              {/* Warning Messages */}
              {isAtLimit && (
                <div className="p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-xs text-red-700 font-medium">
                    ⚠️ Storage limit reached!
                  </p>
                </div>
              )}

              {isNearLimit && !isAtLimit && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-700 font-medium">
                    ⚠️ Storage almost full
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}