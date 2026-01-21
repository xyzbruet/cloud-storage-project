import { useRef, useState, useEffect } from 'react';
import {
  Upload,
  FolderPlus,
  X,
  CheckCircle,
  AlertCircle,
  Folder
} from 'lucide-react';

import { useLayout } from '../components/layout/Layout';
import FileCard from '../components/common/FileCard';
import FileListItem from '../components/files/FileListItem';
import ViewToggle from '../components/files/ViewToggle';
import { FilterBar } from '../components/common/FilterBar';
import { useFileFilter } from '../hooks/useFileFilter';
import { useViewPreference } from '../hooks/useViewPreference';
import ShareModal from '../components/share/ShareModal';
import FilePreviewModal from '../components/files/FilePreview';
import Breadcrumb from '../components/folders/Breadcrumb';
import FileContextMenu from '../components/common/FileContextMenu';
import RenameModal from '../components/common/RenameModal';
import MoveModal from '../components/files/MoveModal';
import useFileOperations from '../hooks/useFileOperations';

export default function MyDrive() {
  const fileInput = useRef(null);
  const { registerUploadHandlers } = useLayout();

  // View preference hook
  const [view, setView] = useViewPreference('myDrive');

  const [folderName, setFolderName] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [shareFile, setShareFile] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteNotification, setPasteNotification] = useState(false);
  const [clipboardListening, setClipboardListening] = useState(true);
  const [toast, setToast] = useState({ show: false, type: '', message: '' });
  const [debugInfo, setDebugInfo] = useState(null);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 3000);
  };

  // Use the reusable hook for file operations
  const {
    contextMenu,
    renameItem,
    moveItem,
    openContextMenu,
    closeContextMenu,
    openRenameModal,
    closeRenameModal,
    openMoveModal,
    closeMoveModal,
    handleDelete,
    handleRename,
    handleDownload,
    handleToggleStar,
  } = useFileOperations(fetchData, showToast);

  const getAuthToken = () => {
    return localStorage.getItem('token') || 
           localStorage.getItem('authToken') || 
           sessionStorage.getItem('token') || 
           sessionStorage.getItem('authToken');
  };

  // ==================== FILTER HOOK ====================
  const {
    filters,
    updateFilter,
    resetFilters,
    getFilteredItems,
    hasActiveFilters,
    getActiveFilterCount
  } = useFileFilter(files);

  // Get filtered items and sort them
  const filteredAndSortedFiles = getFilteredItems().sort((a, b) => {
    const aIsFolder = a.isFolder || a.mimeType === 'folder';
    const bIsFolder = b.isFolder || b.mimeType === 'folder';
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  // Register upload handlers with layout
  useEffect(() => {
    registerUploadHandlers(handleSidebarUpload, handleSidebarCreateFolder);
    
    return () => {
      registerUploadHandlers(null, null);
    };
  }, [currentFolder]);

  useEffect(() => {
    fetchData();
  }, [currentFolder]);

  useEffect(() => {
    const handlePaste = async (e) => {
      if (!clipboardListening) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        if (item.kind === 'file') {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            showPasteNotification();
            await handleUpload(file);
          }
        }
        else if (item.type === 'text/plain' || item.type === 'text/html') {
          e.preventDefault();
          item.getAsString(async (text) => {
            if (text.trim()) {
              showPasteNotification();
              await handleTextUpload(text, item.type);
            }
          });
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [clipboardListening, currentFolder]);

  async function fetchData() {
    setLoading(true);
    const debug = {
      currentFolder,
      filesUrl: '',
      foldersUrl: '',
      filesCount: 0,
      foldersCount: 0,
      errors: []
    };

    try {
      const token = getAuthToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      let filesData = [];
      let foldersData = [];

      // ================= FETCH FILES =================
      const filesUrl = currentFolder
        ? `/api/files?folderId=${currentFolder}`
        : `/api/files`;
      
      debug.filesUrl = filesUrl;

      try {
        const filesResponse = await fetch(filesUrl, { headers });
        
        if (filesResponse.ok) {
          const result = await filesResponse.json();
          filesData = result.data || result || [];
          debug.filesCount = filesData.length;
        } else {
          const errorText = await filesResponse.text();
          debug.errors.push(`Files fetch failed: ${filesResponse.status} - ${errorText}`);
        }
      } catch (err) {
        debug.errors.push(`Files fetch exception: ${err.message}`);
      }

      // ================= FETCH FOLDERS =================
      const foldersUrl = currentFolder
        ? `/api/folders/${currentFolder}/subfolders`
        : `/api/folders`;

      debug.foldersUrl = foldersUrl;

      try {
        const foldersResponse = await fetch(foldersUrl, { headers });
        
        if (foldersResponse.ok) {
          const result = await foldersResponse.json();
          
          const folders = result.data || result.folders || result || [];
          
          foldersData = Array.isArray(folders) ? folders : [];
          debug.foldersCount = foldersData.length;

          const formattedFolders = foldersData.map(folder => ({
            id: folder.id || folder._id,
            name: folder.name,
            isFolder: true,
            mimeType: 'folder',
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt,
            parentId: folder.parentId,
            ...folder
          }));

          filesData = [...formattedFolders, ...filesData];
        } else {
          const errorText = await foldersResponse.text();
          debug.errors.push(`Folders fetch failed: ${foldersResponse.status} - ${errorText}`);
        }
      } catch (err) {
        debug.errors.push(`Folders fetch exception: ${err.message}`);
      }

      setFiles(Array.isArray(filesData) ? filesData : []);
      setDebugInfo(debug);
    } catch (error) {
      debug.errors.push(`Overall error: ${error.message}`);
      setFiles([]);
      setDebugInfo(debug);
    } finally {
      setLoading(false);
    }
  }

  const showPasteNotification = () => {
    setPasteNotification(true);
    setTimeout(() => setPasteNotification(false), 2000);
  };

  const handleTextUpload = async (text, type) => {
    setUploading(true);
    try {
      const blob = new Blob([text], { type: type === 'text/html' ? 'text/html' : 'text/plain' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
      const extension = type === 'text/html' ? 'html' : 'txt';
      const fileName = `pasted-${timestamp}.${extension}`;
      
      const file = new File([blob], fileName, { type: blob.type });
      await handleUpload(file);
    } catch (err) {
      console.error('Text upload failed', err);
      showToast('error', 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);
    if (currentFolder) {
      formData.append('folderId', currentFolder);
    }

    try {
      const token = getAuthToken();
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });

      if (!response.ok) throw new Error('Upload failed');
      
      showToast('success', 'File uploaded successfully!');
      await fetchData();
      window.dispatchEvent(new Event('storage-updated'));

      if (fileInput.current) {
        fileInput.current.value = '';
      }
    } catch (err) {
      console.error('Upload failed', err);
      showToast('error', 'Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // Handle uploads from Sidebar
  // Update this function to properly handle the type parameter
const handleSidebarUpload = async (files, uploadType) => {
  if (!files || files.length === 0) return;
  
  setUploading(true);
  
  try {
    if (uploadType === 'folder') {
      // Handle folder upload
      await handleFolderUpload(files);
    } else {
      // Handle regular file uploads
      for (const file of files) {
        await handleUpload(file);
      }
    }
  } catch (err) {
    console.error('Upload failed:', err);
    showToast('error', 'Upload failed: ' + err.message);
  } finally {
    setUploading(false);
  }
};

  // Handle folder uploads with structure
  const handleFolderUpload = async (files) => {
    const token = getAuthToken();
    const filesArray = Array.from(files);
    
    // Group files by their folder structure
    const folderMap = new Map();
    
    for (const file of filesArray) {
      const relativePath = file.webkitRelativePath || file.name;
      const pathParts = relativePath.split('/');
      
      if (pathParts.length > 1) {
        const folderPath = pathParts.slice(0, -1).join('/');
        
        if (!folderMap.has(folderPath)) {
          folderMap.set(folderPath, []);
        }
        folderMap.get(folderPath).push({
          file,
          path: relativePath,
          folderName: pathParts[0]
        });
      }
    }
    
    const createdFolders = new Map();
    let successCount = 0;
    let failCount = 0;
    
    for (const [folderPath, fileInfos] of folderMap) {
      try {
        const pathParts = folderPath.split('/');
        let currentParentId = currentFolder;
        
        // Create nested folders
        for (let i = 0; i < pathParts.length; i++) {
          const folderName = pathParts[i];
          const fullPath = pathParts.slice(0, i + 1).join('/');
          
          if (!createdFolders.has(fullPath)) {
            const folderResponse = await fetch('/api/folders', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({
                name: folderName,
                parentId: currentParentId
              })
            });
            
            if (folderResponse.ok) {
              const folderData = await folderResponse.json();
              const folderId = folderData.data?.id || folderData.id;
              createdFolders.set(fullPath, folderId);
              currentParentId = folderId;
            } else {
              throw new Error(`Failed to create folder: ${folderName}`);
            }
          } else {
            currentParentId = createdFolders.get(fullPath);
          }
        }
        
        // Upload files to their respective folders
        for (const fileInfo of fileInfos) {
          const formData = new FormData();
          formData.append('file', fileInfo.file);
          formData.append('folderId', currentParentId);
          
          const uploadResponse = await fetch('/api/files/upload', {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
          });
          
          if (uploadResponse.ok) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to upload: ${fileInfo.file.name}`);
          }
        }
      } catch (err) {
        console.error('Error processing folder:', folderPath, err);
        failCount += fileInfos.length;
      }
    }
    
    // Show results
    if (successCount > 0) {
      showToast('success', `Successfully uploaded ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ''}`);
      await fetchData();
      window.dispatchEvent(new Event('storage-updated'));
    } else {
      showToast('error', 'Folder upload failed');
    }
  };

  // Handle create folder from Sidebar
  const handleSidebarCreateFolder = () => {
    setShowFolderModal(true);
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      showToast('warning', 'Please enter a folder name');
      return;
    }

    try {
      const token = getAuthToken();
      const payload = { name: folderName.trim() };
      if (currentFolder) {
        payload.parentId = currentFolder;
      }
      
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Folder creation failed: ${errorText}`);
      }
      
      showToast('success', 'Folder created successfully!');
      setFolderName('');
      setShowFolderModal(false);
      await fetchData();
    } catch (err) {
      console.error('Create folder failed', err);
      showToast('error', 'Folder creation failed: ' + err.message);
    }
  };

  const handleFolderClick = (folder) => {
    setCurrentFolder(folder.id);
    setBreadcrumbs(prev => {
      if (prev.some(f => f.id === folder.id)) return prev;
      return [...prev, { id: folder.id, name: folder.name }];
    });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      await handleUpload(file);
    }
  };

  return (
    <>
      <div 
        className="space-y-6"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={closeContextMenu}
      >
        {/* Debug Info Panel */}
        {debugInfo && debugInfo.errors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-2">Debug Information</h3>
                <div className="text-xs text-yellow-800 space-y-1 font-mono">
                  <p>Files URL: {debugInfo.filesUrl}</p>
                  <p>Folders URL: {debugInfo.foldersUrl}</p>
                  <p>Files Count: {debugInfo.filesCount}</p>
                  <p>Folders Count: {debugInfo.foldersCount}</p>
                  {debugInfo.errors.map((err, i) => (
                    <p key={i} className="text-red-600">❌ {err}</p>
                  ))}
                </div>
                <button
                  onClick={() => setDebugInfo(null)}
                  className="mt-2 text-xs text-yellow-700 underline"
                >
                  Hide debug info
                </button>
              </div>
            </div>
          </div>
        )}

        {toast.show && (
          <div className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-green-500' : 
            toast.type === 'error' ? 'bg-red-500' : 
            'bg-yellow-500'
          } text-white`}>
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">{toast.message}</span>
          </div>
        )}

        {pasteNotification && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-bounce">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Content pasted! Uploading...</span>
          </div>
        )}

        {isDragging && (
          <div className="fixed inset-0 bg-blue-500 bg-opacity-20 border-4 border-blue-500 border-dashed z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-xl p-8 shadow-2xl">
              <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-900">Drop files here to upload</p>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">My Drive</h1>
            
            <Breadcrumb
              path={breadcrumbs}
              onNavigate={(folder, index) => {
                if (!folder) {
                  setCurrentFolder(null);
                  setBreadcrumbs([]);
                  return;
                }
                const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
                setBreadcrumbs(newBreadcrumbs);
                setCurrentFolder(folder.id);
              }}
            />

            <p className="text-gray-600 mt-2 text-sm">
              {filteredAndSortedFiles.length} {filteredAndSortedFiles.length !== files.length ? `of ${files.length}` : ''} items
              {debugInfo && ` (${debugInfo.foldersCount} folders, ${debugInfo.filesCount} files)`}
            </p>
            
            <div className="mt-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${clipboardListening ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
              <span className="text-xs text-gray-600">
                Paste monitoring {clipboardListening ? 'active' : 'paused'}
              </span>
              <button
                onClick={() => setClipboardListening(!clipboardListening)}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                {clipboardListening ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition shadow-sm"
            >
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload'}
            </button>

            <button
              onClick={() => setShowFolderModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>

            <input
              ref={fileInput}
              type="file"
              hidden
              multiple
              onChange={(e) => {
                const fileList = Array.from(e.target.files || []);
                fileList.forEach(file => handleUpload(file));
              }}
            />
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1">Quick Upload Tips</h3>
              <p className="text-xs text-gray-700">
                <strong>Drag & Drop</strong> files anywhere on this page, or <strong>Copy & Paste (Ctrl+V)</strong> images and text to upload instantly!
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar with View Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <FilterBar
              filters={filters}
              updateFilter={updateFilter}
              resetFilters={resetFilters}
              hasActiveFilters={hasActiveFilters}
              getActiveFilterCount={getActiveFilterCount}
              config={{
                showType: true,
                showModified: true,
                showStarred: true,
                showPeople: false,
                showSource: false
              }}
            />
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        )}

        {!loading && filteredAndSortedFiles.length === 0 && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            {hasActiveFilters() ? (
              <>
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No files match your filters</h3>
                <p className="text-gray-500 mb-4">
                  Try adjusting your filter criteria or clear all filters to see all files
                </p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Clear All Filters
                </button>
              </>
            ) : (
              <>
                <Folder className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No files or folders yet</h3>
                <p className="text-gray-500 mb-4">Upload your first file or create a folder to get started</p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => fileInput.current?.click()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Upload File
                  </button>
                  <button
                    onClick={() => setShowFolderModal(true)}
                    className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Create Folder
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Grid View */}
        {!loading && filteredAndSortedFiles.length > 0 && view === 'grid' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {filteredAndSortedFiles.map((item) => (
              <FileCard
                key={item.id}
                item={item}
                onFolderClick={handleFolderClick}
                onPreview={setPreviewFile}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openContextMenu(item, e.clientX, e.clientY);
                }}
                onToggleStar={handleToggleStar}
                onShare={setShareFile}
                onDownload={handleDownload}
                openContextMenu={openContextMenu}
                showQuickActions={true}
              />
            ))}
          </div>
        )}

        {/* List View */}
        {!loading && filteredAndSortedFiles.length > 0 && view === 'list' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
              <div className="w-10"></div>
              <div className="flex-1 min-w-0">Name</div>
              <div className="hidden md:block w-56 text-center">Shared</div>
              <div className="hidden lg:block w-48 text-right">Modified</div>
              <div className="hidden xl:block w-32 text-right">Size</div>
              <div className="w-16"></div>
            </div>

            {filteredAndSortedFiles.map((item) => (
              <FileListItem
                key={item.id}
                item={item}
                onToggleStar={handleToggleStar}
                onShare={setShareFile}
                onDownload={handleDownload}
                onFolderClick={handleFolderClick}
                onPreview={setPreviewFile}
                openContextMenu={openContextMenu}
                showSharedBadges={true}
              />
            ))}
          </div>
        )}

        {uploading && (
          <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[300px] z-50">
            <div className="flex items-center gap-3">
              <div className="animate-spin w-5 h-5 border-3 border-blue-600 border-t-transparent rounded-full"></div>
              <div>
                <p className="font-medium text-gray-900">Uploading...</p>
                <p className="text-xs text-gray-500">Please wait</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-yellow-50 to-orange-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                  <FolderPlus className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Create New Folder</h2>
              </div>
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setFolderName('');
                }}
                className="p-2 hover:bg-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && folderName.trim()) {
                    handleCreateFolder();
                  }
                }}
                placeholder="Enter folder name..."
                className="w-full border-2 border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowFolderModal(false);
                  setFolderName('');
                }}
                className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!folderName.trim()}
                className="px-6 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-md hover:shadow-lg"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareFile && (
        <ShareModal
          file={shareFile}
          onClose={() => setShareFile(null)}
          onShared={fetchData}
        />
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onToggleStar={handleToggleStar}
          onDelete={handleDelete}
        />
      )}

      {/* Reusable Context Menu */}
      <FileContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onPreview={(item) => setPreviewFile(item)}
        onShare={(item) => setShareFile(item)}
        onDownload={handleDownload}
        onToggleStar={(item) => handleToggleStar(item.id)}
        onRename={openRenameModal}
        onDelete={handleDelete}
        onMove={openMoveModal}
      />

      {/* Reusable Rename Modal */}
      <RenameModal
        item={renameItem}
        onClose={closeRenameModal}
        onRename={handleRename}
      />

      {/* Move Modal */}
      {moveItem && (
        <MoveModal
          items={moveItem}
          onClose={closeMoveModal}
          onMove={async () => {
            await fetchData();
            closeMoveModal();
          }}
        />
      )}
    </>
  );
}