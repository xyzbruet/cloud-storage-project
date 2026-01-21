import { useState, createContext, useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

// Create a context for layout actions
export const LayoutContext = createContext();

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within Layout');
  }
  return context;
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadCallbacks, setUploadCallbacks] = useState({
    onUpload: null,
    onCreateFolder: null
  });
  const [pendingAction, setPendingAction] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  // Register upload handlers from child components (like MyDrive)
  const registerUploadHandlers = (onUpload, onCreateFolder) => {
    setUploadCallbacks({ onUpload, onCreateFolder });
    
    // If there's a pending action, execute it now
    if (pendingAction) {
      if (pendingAction.type === 'upload' && onUpload) {
        onUpload(pendingAction.files, pendingAction.uploadType);
      } else if (pendingAction.type === 'createFolder' && onCreateFolder) {
        onCreateFolder();
      }
      setPendingAction(null);
    }
  };

  // Handle upload from sidebar - Navigate to My Drive if not there
  const handleSidebarUpload = (files, uploadType) => {
    if (uploadCallbacks.onUpload) {
      // Handler is registered, execute immediately
      uploadCallbacks.onUpload(files, uploadType);
    } else {
      // Not on My Drive, navigate there and queue the action
      setPendingAction({ type: 'upload', files, uploadType });
      navigate('/my-drive');
    }
  };

  // Handle create folder from sidebar - Navigate to My Drive if not there
  const handleSidebarCreateFolder = () => {
    if (uploadCallbacks.onCreateFolder) {
      // Handler is registered, execute immediately
      uploadCallbacks.onCreateFolder();
    } else {
      // Not on My Drive, navigate there and queue the action
      setPendingAction({ type: 'createFolder' });
      navigate('/my-drive');
    }
  };

  return (
    <LayoutContext.Provider value={{ registerUploadHandlers }}>
      <div className="min-h-screen bg-gray-50">
        {/* Navbar */}
        <Navbar onMenuClick={toggleSidebar} />

        {/* Sidebar */}
        <Sidebar 
          isOpen={sidebarOpen} 
          onClose={closeSidebar}
          onUpload={handleSidebarUpload}
          onCreateFolder={handleSidebarCreateFolder}
        />

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* Main Content */}
        <main className="lg:ml-64 pt-16 min-h-screen transition-all duration-300">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </LayoutContext.Provider>
  );
}