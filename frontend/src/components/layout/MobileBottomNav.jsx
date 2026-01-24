import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  FolderOpen, 
  Share2, 
  Star,
  Menu,
  X,
  Upload,
  FolderPlus,
  Trash2
} from 'lucide-react';
import { useState } from 'react';

export default function MobileBottomNav({ onUpload, onCreateFolder }) {
  const location = useLocation();
  const [showQuickActions, setShowQuickActions] = useState(false);

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Drive', href: '/my-drive', icon: FolderOpen },
    { name: 'Shared', href: '/shared', icon: Share2 },
    { name: 'Starred', href: '/starred', icon: Star },
  ];

  const isActive = (href) => location.pathname === href;

  return (
    <>
      {/* Quick Actions Menu */}
      {showQuickActions && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setShowQuickActions(false)}
        >
          <div 
            className="absolute bottom-16 left-0 right-0 bg-white rounded-t-3xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
              <button
                onClick={() => setShowQuickActions(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowQuickActions(false);
                  if (onUpload) onUpload(null, 'file');
                }}
                className="w-full flex items-center gap-4 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition"
              >
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Upload Files</p>
                  <p className="text-sm text-gray-600">Add files to your drive</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowQuickActions(false);
                  if (onCreateFolder) onCreateFolder();
                }}
                className="w-full flex items-center gap-4 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition"
              >
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <FolderPlus className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">New Folder</p>
                  <p className="text-sm text-gray-600">Create a new folder</p>
                </div>
              </button>

              <Link
                to="/trash"
                onClick={() => setShowQuickActions(false)}
                className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition"
              >
                <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Trash</p>
                  <p className="text-sm text-gray-600">View deleted files</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar - Only visible on mobile */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive(item.href)
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive(item.href) ? 'stroke-[2.5]' : ''}`} />
              <span className="text-xs font-medium">{item.name}</span>
            </Link>
          ))}
          
          {/* Quick Actions Button */}
          <button
            onClick={() => setShowQuickActions(true)}
            className="flex flex-col items-center justify-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
              <Menu className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}