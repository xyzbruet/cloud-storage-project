import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Upload,
  FolderPlus,
  FolderOpen,
  Image,
  FileText,
  FileSpreadsheet,
  X
} from 'lucide-react';

const UploadMenu = ({ onUpload, onCreateFolder, currentFolder = null, currentView = 'myDrive' }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const excelInputRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showMenu]);

  const handleFileUpload = (event, type = 'any') => {
    const files = event.target.files;
    if (files && files.length > 0 && onUpload) {
      // Pass files and type - works from any tab
      onUpload(Array.from(files), type);
    }
    setShowMenu(false);
    // Reset input to allow same file upload again
    event.target.value = '';
  };

  const handleFolderUpload = (event) => {
    const files = event.target.files;
    if (files && files.length > 0 && onUpload) {
      // Pass files with 'folder' type
      onUpload(Array.from(files), 'folder');
    }
    setShowMenu(false);
    event.target.value = '';
  };

  const handleCreateFolder = () => {
    if (onCreateFolder) {
      // Trigger create folder - works from any tab
      onCreateFolder();
    }
    setShowMenu(false);
  };

  const uploadOptions = [
    {
      icon: Upload,
      label: 'Upload Files',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      hoverColor: 'hover:bg-blue-100',
      onClick: () => fileInputRef.current?.click(),
      description: 'Upload any file to My Drive'
    },
    {
      icon: FolderPlus,
      label: 'Upload Folder',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      hoverColor: 'hover:bg-purple-100',
      onClick: () => folderInputRef.current?.click(),
      description: 'Upload entire folder to My Drive'
    },
    {
      icon: FolderOpen,
      label: 'New Folder',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      hoverColor: 'hover:bg-yellow-100',
      onClick: handleCreateFolder,
      description: 'Create a folder in My Drive'
    },
    {
      icon: Image,
      label: 'Upload Images',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      hoverColor: 'hover:bg-green-100',
      onClick: () => imageInputRef.current?.click(),
      description: 'Upload images to My Drive'
    },
    {
      icon: FileText,
      label: 'Upload PDFs',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      hoverColor: 'hover:bg-red-100',
      onClick: () => pdfInputRef.current?.click(),
      description: 'Upload PDFs to My Drive'
    },
    {
      icon: FileSpreadsheet,
      label: 'Upload Spreadsheets',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      hoverColor: 'hover:bg-emerald-100',
      onClick: () => excelInputRef.current?.click(),
      description: 'Upload spreadsheets to My Drive'
    }
  ];

  return (
    <div className="relative" ref={menuRef}>
      {/* New Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg font-medium group"
        aria-expanded={showMenu}
        aria-haspopup="true"
      >
        <Plus className={`w-5 h-5 transition-transform duration-200 ${showMenu ? 'rotate-45' : ''}`} />
        <span>New</span>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 z-40 lg:hidden" 
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-12rem)] overflow-y-auto">
            {/* Menu Header - Mobile only */}
            <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b border-gray-100 mb-2">
              <span className="font-semibold text-gray-900">Create new in My Drive</span>
              <button
                onClick={() => setShowMenu(false)}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Info message when not in My Drive */}
            {currentView !== 'myDrive' && (
              <div className="mx-4 mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  Files will be uploaded to My Drive
                </p>
              </div>
            )}

            {uploadOptions.map((option, index) => (
              <button
                key={index}
                onClick={option.onClick}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${option.hoverColor} group`}
              >
                <div className={`p-2 rounded-lg ${option.bgColor} transition-transform group-hover:scale-110`}>
                  <option.icon className={`w-4 h-4 ${option.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
        aria-label="Upload files"
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={handleFolderUpload}
        aria-label="Upload folder"
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'image')}
        aria-label="Upload images"
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'pdf')}
        aria-label="Upload PDFs"
      />
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'excel')}
        aria-label="Upload spreadsheets"
      />
    </div>
  );
};

export default UploadMenu;