import { useState, useEffect, useRef } from 'react';
import { Users, Link2, Trash2, FileText, HardDrive, Mail, Edit, Eye, X, ChevronRight, Home, FolderOpen, Upload, Filter as FilterIcon, Folder, MoreVertical, Clock, CheckCircle, Info, AlertCircle } from 'lucide-react';
import api from '../services/api';
import FileCard from '../components/common/FileCard';
import ViewToggle from '../components/files/ViewToggle';
import { FilterBar } from '../components/common/FilterBar';
import { useFileFilter } from '../hooks/useFileFilter';
import { useViewPreference } from '../hooks/useViewPreference';
import ShareModal from '../components/share/ShareModal';
import FilePreviewModal from '../components/files/FilePreview';
import { useToast } from '../components/Toast';
import FileContextMenu from '../components/common/FileContextMenu';
import RenameModal from '../components/common/RenameModal';
import useFileOperations from '../hooks/useFileOperations';

export function SharedByMe() {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [view, setView] = useViewPreference('sharedByMe');
  
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [detailsFile, setDetailsFile] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [folderPath, setFolderPath] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteNotification, setPasteNotification] = useState(false);
  const [clipboardListening, setClipboardListening] = useState(true);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showSharingInfoModal, setShowSharingInfoModal] = useState(false);

  const { toast } = useToast();

  const showToast = (message, type) => {
    toast(message, type);
  };

  const {
    contextMenu,
    renameItem,
    openContextMenu,
    closeContextMenu,
    openRenameModal,
    closeRenameModal,
    handleRename,
  } = useFileOperations(fetchSharedFiles, showToast);

  const {
    filters,
    updateFilter,
    resetFilters,
    getFilteredItems,
    hasActiveFilters,
    getActiveFilterCount
  } = useFileFilter(files);

  const filteredAndSortedFiles = getFilteredItems().sort((a, b) => {
    const aIsFolder = a.isFolder || a.mimeType === 'folder';
    const bIsFolder = b.isFolder || b.mimeType === 'folder';
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });

  const isInFolder = currentFolder !== null;

  useEffect(() => {
    fetchSharedFiles();
  }, [currentFolder]);

  useEffect(() => {
    const handleStorageUpdate = () => {
      fetchSharedFiles();
    };

    window.addEventListener('storage-updated', handleStorageUpdate);
    return () => window.removeEventListener('storage-updated', handleStorageUpdate);
  }, [currentFolder]);

  useEffect(() => {
    const handlePaste = async (e) => {
      if (!clipboardListening) return;
      if (!currentFolder) return;
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
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [clipboardListening, currentFolder]);

  const showPasteNotification = () => {
    setPasteNotification(true);
    setTimeout(() => setPasteNotification(false), 2000);
  };

  async function fetchSharedFiles() {
    setLoading(true);
    try {
      let allItems = [];
      let currentUserId = null;

      // Get current user ID for client-side filtering
      try {
        const userResponse = await api.get('/auth/me');
        currentUserId = userResponse.data?.id || userResponse.data?.data?.id;
      } catch (err) {
        console.error('Failed to fetch user info:', err);
      }

      if (currentFolder) {
        // When inside a folder, fetch ALL files and folders, then filter client-side
        try {
          const filesResponse = await api.get(`/files?folderId=${currentFolder.id}`);
          const filesData = filesResponse.data?.data;
          if (Array.isArray(filesData)) {
            // Client-side filter: only show files owned by current user
            const ownedFiles = currentUserId 
              ? filesData.filter(file => file.ownerId === currentUserId || file.userId === currentUserId)
              : filesData;
            allItems = [...ownedFiles];
          }
        } catch (err) {
          console.error('Failed to fetch files in folder:', err);
        }

        try {
          const foldersResponse = await api.get(`/folders/${currentFolder.id}/subfolders`);
          const foldersData = foldersResponse.data?.data;
          if (Array.isArray(foldersData)) {
            // Client-side filter: only show folders owned by current user
            const ownedFolders = currentUserId
              ? foldersData.filter(folder => folder.ownerId === currentUserId || folder.userId === currentUserId)
              : foldersData;
            
            const formattedFolders = ownedFolders.map(folder => ({
              ...folder,
              isFolder: true,
              mimeType: 'folder',
            }));
            allItems = [...allItems, ...formattedFolders];
          }
        } catch (err) {
          console.error('Failed to fetch subfolders:', err);
        }
      } else {
        try {
          const filesResponse = await api.get('/files/shared-by-me');
          const filesData = filesResponse.data?.data;
          if (Array.isArray(filesData)) {
            allItems = [...filesData];
          }
        } catch (err) {
          console.error('Failed to fetch shared files:', err);
        }

        try {
          const foldersResponse = await api.get('/folders/shared-by-me');
          const foldersData = foldersResponse.data?.data || foldersResponse.data?.folders || foldersResponse.data;
          if (Array.isArray(foldersData)) {
            const formattedFolders = foldersData.map(folder => ({
              ...folder,
              isFolder: true,
              mimeType: 'folder',
            }));
            allItems = [...allItems, ...formattedFolders];
          }
        } catch (err) {
          console.error('Failed to fetch shared folders:', err);
        }
      }

      setFiles(allItems);
    } catch (error) {
      console.error('Failed to fetch shared items:', error);
      toast('Failed to load shared items', 'error');
    } finally {
      setLoading(false);
    }
  }

  const handleUpload = async (file) => {
    if (!currentFolder) {
      toast('Please open a folder first', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folderId', currentFolder.id);

    try {
      setUploadingFile(true);
      const response = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast('File uploaded successfully', 'success');
      
      // Immediately add the new file to the list for instant feedback
      const newFile = response.data?.data || response.data;
      if (newFile) {
        setFiles(prevFiles => [...prevFiles, newFile]);
      }
      
      // Then fetch to ensure consistency
      await fetchSharedFiles();
      window.dispatchEvent(new Event('storage-updated'));
    } catch (error) {
      console.error('Upload failed:', error);
      toast(error.response?.data?.message || 'Failed to upload file', 'error');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFolderUpload = async (files) => {
    if (!currentFolder) {
      toast('Please open a folder first', 'error');
      return;
    }

    const filesArray = Array.from(files);
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
    
    setUploadingFile(true);
    
    for (const [folderPath, fileInfos] of folderMap) {
      try {
        const pathParts = folderPath.split('/');
        let currentParentId = currentFolder.id;
        
        for (let i = 0; i < pathParts.length; i++) {
          const folderName = pathParts[i];
          const fullPath = pathParts.slice(0, i + 1).join('/');
          
          if (!createdFolders.has(fullPath)) {
            const folderResponse = await axios.post('/api/folders', {
              name: folderName,
              parentId: currentParentId
            });
            
            const folderId = folderResponse.data?.data?.id || folderResponse.data?.id;
            createdFolders.set(fullPath, folderId);
            currentParentId = folderId;
          } else {
            currentParentId = createdFolders.get(fullPath);
          }
        }
        
        for (const fileInfo of fileInfos) {
          const formData = new FormData();
          formData.append('file', fileInfo.file);
          formData.append('folderId', currentParentId);
          
          try {
            await api.post('/files/upload', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            successCount++;
          } catch {
            failCount++;
          }
        }
      } catch (err) {
        console.error('Error processing folder:', folderPath, err);
        failCount += fileInfos.length;
      }
    }
    
    setUploadingFile(false);
    
    if (successCount > 0) {
      toast(`Successfully uploaded ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ''}`, 'success');
      await fetchSharedFiles();
      window.dispatchEvent(new Event('storage-updated'));
    } else {
      toast('Folder upload failed', 'error');
    }
    
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast('Please enter a folder name', 'error');
      return;
    }

    try {
      setCreatingFolder(true);
      const response = await api.post('/folders', {
        name: newFolderName.trim(),
        parentId: currentFolder?.id || null
      });
      
      toast('Folder created successfully', 'success');
      setShowCreateFolder(false);
      setNewFolderName('');
      
      // Immediately add the new folder to the list for instant feedback
      const newFolder = response.data?.data || response.data;
      if (newFolder) {
        setFiles(prevFiles => [...prevFiles, {
          ...newFolder,
          isFolder: true,
          mimeType: 'folder',
        }]);
      }
      
      // Then fetch to ensure consistency
      await fetchSharedFiles();
      window.dispatchEvent(new Event('storage-updated'));
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast(error.response?.data?.message || 'Failed to create folder', 'error');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (currentFolder) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
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

  const handleFolderClick = (folder) => {
    setCurrentFolder(folder);
    setFolderPath([...folderPath, folder]);
  };

  const navigateToFolder = (index) => {
    if (index === -1) {
      setCurrentFolder(null);
      setFolderPath([]);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setCurrentFolder(newPath[newPath.length - 1]);
      setFolderPath(newPath);
    }
  };

  const removeAllAccess = async (fileId, fileName, isFolder = false) => {
    const itemType = isFolder ? 'folder' : 'file';
    
    if (!window.confirm(
      `Remove all access to "${fileName}"?\n\n` +
      `This will:\n` +
      `• Revoke access for all users\n` +
      `• Disable the share link\n` +
      `• Move the ${itemType} to trash`
    )) {
      return;
    }

    setDetailsFile(null);
    closeContextMenu();

    const oldFiles = [...files];
    setFiles(files.filter(f => f.id !== fileId));

    try {
      const endpoint = isFolder 
        ? `/folders/${fileId}/shares/all` 
        : `/files/${fileId}/shares/all`;
      
      await api.delete(endpoint);
      
      toast('All access removed and item moved to trash', 'success');
      window.dispatchEvent(new Event('storage-updated'));
    } catch (error) {
      console.error('Failed to remove access:', error);
      toast(error.response?.data?.message || 'Failed to remove access', 'error');
      setFiles(oldFiles);
    }
  };

  const copyShareLink = (link) => {
    navigator.clipboard.writeText(link);
    toast('Link copied to clipboard', 'success');
  };

  const openShareModal = (file) => {
    setSelectedFile(file);
    setShowShareModal(true);
  };

  const closeShareModal = () => {
    setShowShareModal(false);
    setSelectedFile(null);
    fetchSharedFiles();
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (mimeType) => {
    if (!mimeType || mimeType === 'folder') return '📁';
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    return '📄';
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div 
        className="space-y-6" 
        onClick={closeContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {pasteNotification && (
          <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-bounce">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Content pasted! Uploading...</span>
          </div>
        )}

        {isDragging && currentFolder && (
          <div className="fixed inset-0 bg-blue-500 bg-opacity-20 border-4 border-blue-500 border-dashed z-40 flex items-center justify-center pointer-events-none">
            <div className="bg-white rounded-xl p-8 shadow-2xl">
              <Upload className="w-16 h-16 text-blue-600 mx-auto mb-4" />
              <p className="text-xl font-semibold text-gray-900">Drop files here to upload</p>
            </div>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shared by me</h1>
          
          {isInFolder && (
            <div className="mt-3 flex items-center gap-2 text-sm flex-wrap">
              <button
                onClick={() => navigateToFolder(-1)}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
              >
                <Home className="w-4 h-4" />
                Shared
              </button>
              {folderPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <button
                    onClick={() => navigateToFolder(index)}
                    className="text-blue-600 hover:text-blue-800 hover:underline max-w-xs truncate"
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <p className="text-gray-600 text-sm">
                {isInFolder ? (
                  <>
                    <FolderOpen className="w-4 h-4 inline mr-1" />
                    {filteredAndSortedFiles.length} {filteredAndSortedFiles.length !== files.length ? `of ${files.length}` : ''} {filteredAndSortedFiles.length === 1 ? 'item' : 'items'}
                  </>
                ) : (
                  `${filteredAndSortedFiles.length} ${filteredAndSortedFiles.length !== files.length ? `of ${files.length}` : ''} items you have shared with others`
                )}
              </p>
              
              {clipboardListening && isInFolder && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span>Paste monitoring active</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setShowCreateFolder(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition cursor-pointer flex items-center gap-2 text-sm"
              >
                <Folder className="w-4 h-4" />
                New Folder
              </button>
              
              {isInFolder && (
                <>
                  <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer flex items-center gap-2 text-sm">
                    <Upload className="w-4 h-4" />
                    {uploadingFile ? 'Uploading...' : 'Upload Files'}
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      onChange={(e) => {
                        const fileList = Array.from(e.target.files || []);
                        fileList.forEach(file => handleUpload(file));
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="hidden"
                      disabled={uploadingFile}
                    />
                  </label>
                  
                  <label className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition cursor-pointer flex items-center gap-2 text-sm">
                    <FolderOpen className="w-4 h-4" />
                    Upload Folder
                    <input
                      ref={folderInputRef}
                      type="file"
                      webkitdirectory=""
                      directory=""
                      multiple
                      onChange={(e) => {
                        const fileList = e.target.files;
                        if (fileList && fileList.length > 0) {
                          handleFolderUpload(fileList);
                        }
                      }}
                      className="hidden"
                      disabled={uploadingFile}
                    />
                  </label>
                </>
              )}
            </div>
          </div>
        </div>

        {isInFolder && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <Upload className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">Quick Upload Tips</h3>
                <p className="text-xs text-gray-700">
                  <strong>Drag & Drop</strong> files anywhere, or <strong>Copy & Paste (Ctrl+V)</strong> images to upload instantly!
                </p>
              </div>
              <button
                onClick={() => setShowSharingInfoModal(true)}
                className="p-1.5 hover:bg-blue-100 rounded-lg transition flex-shrink-0"
                title="Learn about sharing behavior"
              >
                <Info className="w-4 h-4 text-blue-600" />
              </button>
            </div>
          </div>
        )}

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
                showStarred: false,
                showPeople: false,
                showSource: false
              }}
            />
          </div>
          <ViewToggle view={view} onViewChange={setView} />
        </div>

        {filteredAndSortedFiles.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            {hasActiveFilters() ? (
              <>
                <FilterIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No files match your filters</h3>
                <p className="text-gray-500 mb-4">
                  Try adjusting your filter criteria or clear all filters
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
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {isInFolder ? 'This folder is empty' : 'No shared items'}
                </h3>
                <p className="text-gray-500">
                  {isInFolder 
                    ? 'Upload files to get started'
                    : 'Files and folders you share will appear here'
                  }
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {view === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                {filteredAndSortedFiles.map((item) => {
                  const isFolder = item.isFolder || item.mimeType === 'folder';
                  
                  return (
                    <FileCard
                      key={item.id}
                      item={item}
                      onPreview={!isFolder ? setPreviewFile : undefined}
                      onFolderClick={isFolder ? handleFolderClick : undefined}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        openContextMenu(item, e.clientX, e.clientY);
                      }}
                      openContextMenu={openContextMenu}
                      showSharedBadges={false}
                      showQuickActions={true}
                      topLeftCustomBadges={!isInFolder ? (item) => (
                        <>
                          {item.hasPublicLink && (
                            <div className="px-1.5 py-0.5 bg-blue-500 text-white text-[8px] rounded-full flex items-center gap-0.5 shadow-sm">
                              <Link2 className="w-2 h-2" />
                              Link
                            </div>
                          )}
                          {item.sharedWithCount > 0 && (
                            <div className="px-1.5 py-0.5 bg-green-500 text-white text-[8px] rounded-full flex items-center gap-0.5 shadow-sm">
                              <Users className="w-2 h-2" />
                              {item.sharedWithCount}
                            </div>
                          )}
                        </>
                      ) : undefined}
                      customActions={(item) => {
                        const isFolder = item.isFolder || item.mimeType === 'folder';
                        return (
                          <div className="flex gap-1 pt-1 border-t border-gray-100">
                            {!isInFolder && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openShareModal(item);
                                }}
                                className="flex-1 px-1 py-1 text-[10px] bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition flex items-center justify-center gap-0.5"
                              >
                                <Users className="w-2.5 h-2.5" />
                                Manage
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailsFile(item);
                              }}
                              className="flex-1 px-1 py-1 text-[10px] bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition flex items-center justify-center gap-0.5"
                              title="Details"
                            >
                              <FileText className="w-2.5 h-2.5" />
                              Details
                            </button>
                          </div>
                        );
                      }}
                    />
                  );
                })}
              </div>
            )}

            {view === 'list' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex-1 min-w-0">Name</div>
                  {!isInFolder && <div className="hidden md:block w-72">Shared With</div>}
                  <div className="hidden lg:block w-48">Modified</div>
                  <div className="hidden xl:block w-32 text-right">Size</div>
                  <div className="w-28"></div>
                </div>

                {filteredAndSortedFiles.map((item) => {
                  const isFolder = item.isFolder || item.mimeType === 'folder';
                  
                  return (
                    <div key={item.id} className="flex items-center px-6 py-3 hover:bg-gray-50 border-b border-gray-100 group transition-colors">
                      <div 
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => {
                          if (isFolder) {
                            handleFolderClick(item);
                          } else {
                            setPreviewFile(item);
                          }
                        }}
                      >
                        <div className="flex-shrink-0">
                          {isFolder ? (
                            <Folder className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded">
                              <span className="text-sm">{getFileIcon(item.mimeType)}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900 truncate">
                              {item.name}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!isInFolder && (
                        <div className="hidden md:flex items-center w-72 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            {item.hasPublicLink && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
                                <Link2 className="w-3 h-3" />
                                Link
                              </span>
                            )}
                            {item.sharedWithCount > 0 && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {item.sharedWithCount} {item.sharedWithCount === 1 ? 'person' : 'people'}
                              </span>
                            )}
                            {!item.hasPublicLink && item.sharedWithCount === 0 && (
                              <span className="text-sm text-gray-500">Not shared</span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="hidden lg:flex items-center w-48 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(item.updatedAt || item.createdAt)}</span>
                        </div>
                      </div>

                      <div className="hidden xl:flex items-center justify-end w-32 flex-shrink-0">
                        <span className="text-sm text-gray-700">
                          {isFolder ? '—' : formatFileSize(item.size)}
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-1 w-28 flex-shrink-0">
                        {!isInFolder && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openShareModal(item);
                            }}
                            className="opacity-0 group-hover:opacity-100 px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded transition-all flex items-center gap-1.5"
                            title="Manage Sharing"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Manage</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsFile(item);
                          }}
                          className="opacity-0 group-hover:opacity-100 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100 rounded transition-all flex items-center gap-1.5"
                          title="Details"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openContextMenu(item, e.clientX, e.clientY);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded transition-opacity"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {uploadingFile && (
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

      {/* Sharing Info Modal */}
      {showSharingInfoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Sharing Behavior (As Owner)
              </h2>
              <button 
                onClick={() => setShowSharingInfoModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-green-600" />
                  What Shared Users See
                </h3>
                <ul className="text-sm text-gray-700 space-y-2 ml-6 list-disc">
                  <li>
                    <strong>All your actions are visible:</strong> When you create folders, upload files, or make changes in a shared folder, users with access <strong>CAN see everything</strong>.
                  </li>
                  <li>
                    <strong>Modifications sync instantly:</strong> Any edits, renames, or deletions you make are immediately visible to shared users.
                  </li>
                  <li>
                    <strong>Full transparency:</strong> Shared users see the same folder structure and content that you do.
                  </li>
                  <li>
                    <strong>Permission control:</strong> You control whether users can view-only or edit your shared content.
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  What You DON'T See
                </h3>
                <ul className="text-sm text-gray-700 space-y-2 ml-6 list-disc">
                  <li>
                    <strong>Their private uploads:</strong> If a user with edit access uploads files or creates folders in your shared folder, those items are <strong>NOT visible</strong> to you.
                  </li>
                  <li>
                    <strong>One-way privacy:</strong> Only their <strong>modifications</strong> to your existing files are visible, not their new content.
                  </li>
                </ul>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Example Scenario</h3>
                <p className="text-sm text-gray-700">
                  You share "TeamProject" folder with Alice (edit access):
                </p>
                <ul className="text-sm text-gray-700 space-y-1 ml-6 list-disc mt-2">
                  <li>You upload "Budget.xlsx" → <strong>Alice sees it</strong></li>
                  <li>You create "Reports" subfolder → <strong>Alice sees it</strong></li>
                  <li>Alice uploads "MyNotes.txt" → <strong>You DON'T see it</strong></li>
                  <li>Alice edits "Budget.xlsx" → <strong>You see her changes</strong></li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowSharingInfoModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Folder className="w-5 h-5 text-green-600" />
                Create New Folder
              </h2>
              <button 
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }} 
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Folder Name
              </label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !creatingFolder) {
                    handleCreateFolder();
                  }
                }}
                placeholder="Enter folder name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                autoFocus
                disabled={creatingFolder}
              />
              {isInFolder && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  This folder will be visible to all users with access
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }}
                className="flex-1 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                disabled={creatingFolder}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                disabled={creatingFolder || !newFolderName.trim()}
              >
                {creatingFolder ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Folder className="w-4 h-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {detailsFile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{getFileIcon(detailsFile.mimeType)}</span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {detailsFile.isFolder || detailsFile.mimeType === 'folder' ? 'Folder Details' : 'File Details'}
                  </h2>
                  <p className="text-sm text-gray-500 truncate max-w-xs">{detailsFile.name}</p>
                </div>
              </div>
              <button onClick={() => setDetailsFile(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6">
              {detailsFile.owner && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Owner
                  </h3>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-sm">
                          {detailsFile.owner.name?.charAt(0).toUpperCase() || 
                           detailsFile.owner.email?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {detailsFile.owner.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-600 truncate">
                          {detailsFile.owner.email || 'No email'}
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-purple-500 text-white text-[10px] rounded-full font-medium">
                        Owner
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <HardDrive className="w-4 h-4" />
                  {detailsFile.isFolder || detailsFile.mimeType === 'folder' ? 'Folder' : 'File'} Information
                </h3>
                <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium text-gray-900 truncate ml-2 max-w-[60%]" title={detailsFile.name}>
                      {detailsFile.name}
                    </span>
                  </div>
                  {!(detailsFile.isFolder || detailsFile.mimeType === 'folder') && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Size:</span>
                        <span className="font-medium text-gray-900">{formatFileSize(detailsFile.size)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium text-gray-900 truncate ml-2 max-w-[60%]">
                          {detailsFile.mimeType || 'Unknown'}
                        </span>
                      </div>
                    </>
                  )}
                  {detailsFile.createdAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Created:</span>
                      <span className="font-medium text-gray-900">{formatDate(detailsFile.createdAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {!isInFolder && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Sharing Summary
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Shared with:</span>
                        <span className="ml-2 font-medium text-blue-700">
                          {detailsFile.sharedWithCount || 0} {detailsFile.sharedWithCount === 1 ? 'person' : 'people'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Public link:</span>
                        <span className={`ml-2 font-medium ${detailsFile.hasPublicLink ? 'text-green-700' : 'text-gray-500'}`}>
                          {detailsFile.hasPublicLink ? 'Active' : 'Not created'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {detailsFile.sharedWith && detailsFile.sharedWith.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        People with access
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {detailsFile.sharedWith.map((share, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-xs font-medium text-blue-600">
                                  {share.email?.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs text-gray-900 truncate">{share.email}</span>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              share.permission === 'edit' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            } flex items-center gap-1`}>
                              {share.permission === 'edit' ? <><Edit className="w-2.5 h-2.5" />Edit</> : <><Eye className="w-2.5 h-2.5" />View</>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailsFile.hasPublicLink && detailsFile.publicLink && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <Link2 className="w-4 h-4" />
                        Public link
                      </h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={detailsFile.publicLink}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs"
                        />
                        <button
                          onClick={() => copyShareLink(detailsFile.publicLink)}
                          className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs transition"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center gap-2">
                {!(detailsFile.isFolder || detailsFile.mimeType === 'folder') && (
                  <button
                    onClick={() => {
                      setPreviewFile(detailsFile);
                      setDetailsFile(null);
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Eye className="w-4 h-4" />
                    Open
                  </button>
                )}
                {!isInFolder && (
                  <button
                    onClick={() => {
                      openShareModal(detailsFile);
                      setDetailsFile(null);
                    }}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Users className="w-4 h-4" />
                    Manage
                  </button>
                )}
                <button
                  onClick={() => {
                    const isFolder = detailsFile.isFolder || detailsFile.mimeType === 'folder';
                    removeAllAccess(detailsFile.id, detailsFile.name, isFolder);
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShareModal && selectedFile && (
  <ShareModal 
    file={selectedFile} 
    onClose={closeShareModal}
    publicLink={selectedFile.publicLink}  // ✅ Pass the publicLink
    hasPublicLink={selectedFile.hasPublicLink}  // ✅ Pass this too
  />
)}

      {previewFile && !previewFile.isFolder && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onDelete={(file) => {
            const isFolder = file.isFolder || file.mimeType === 'folder';
            removeAllAccess(file.id, file.name, isFolder);
          }}
        />
      )}

      <FileContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onPreview={(item) => {
          const isFolder = item.isFolder || item.mimeType === 'folder';
          if (!isFolder) setPreviewFile(item);
        }}
        onShare={(item) => openShareModal(item)}
        onDownload={null}
        onRename={openRenameModal}
        onDelete={(item) => {
          const isFolder = item.isFolder || item.mimeType === 'folder';
          removeAllAccess(item.id, item.name, isFolder);
        }}
        onOpenFolder={handleFolderClick}
        showStar={false}
        showOpenFolder={true}
        showDownload={false}
      />

      <RenameModal
        item={renameItem}
        onClose={closeRenameModal}
        onRename={handleRename}
      />
    </>
  );
}

export default SharedByMe;