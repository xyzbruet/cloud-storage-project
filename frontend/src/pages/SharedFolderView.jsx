import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { Folder, Eye, AlertCircle, ArrowLeft, Lock, FileText, Download, X, ChevronRight, Home, Image, Film, Music, File } from 'lucide-react';

// Backend base URL (without /api for public share endpoints)
const BACKEND_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080';

// Utility functions
const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getFileIcon = (file) => {
  const fileName = file.name.toLowerCase();
  const mimeType = file.mimeType?.toLowerCase() || '';
  
  if (mimeType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
    return Image;
  }
  if (mimeType.startsWith('video/') || fileName.match(/\.(mp4|webm|ogg|mov|avi)$/i)) {
    return Film;
  }
  if (mimeType.startsWith('audio/') || fileName.match(/\.(mp3|wav|ogg|m4a)$/i)) {
    return Music;
  }
  return File;
};

const canPreviewFile = (file) => {
  const fileName = file.name.toLowerCase();
  return (
    fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i) ||
    fileName.match(/\.(mp4|webm|ogg|mov)$/i) ||
    fileName.match(/\.(mp3|wav|ogg)$/i) ||
    fileName.endsWith('.pdf') ||
    file.mimeType?.startsWith('image/') ||
    file.mimeType?.startsWith('video/') ||
    file.mimeType?.startsWith('audio/') ||
    file.mimeType === 'application/pdf'
  );
};

export default function SharedFolderView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [folder, setFolder] = useState(null);
  const [files, setFiles] = useState([]);
  const [subfolders, setSubfolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const [downloadingFiles, setDownloadingFiles] = useState(new Set());

  // Fetch shared folder
  const fetchSharedFolder = useCallback(async (subfolderId = null) => {
    try {
      setLoading(true);
      
      console.log('🔗 Fetching shared folder with token:', token, 'subfolder:', subfolderId);
      
      // ✅ Use BACKEND_BASE with the universal endpoint
      let url = `${BACKEND_BASE}/s/${token}`;
      if (subfolderId) {
        url += `/folder/${subfolderId}`;
      }
      
      console.log('🌐 Fetching URL:', url);
      
      const response = await fetch(url);
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        
        if (response.status === 404) {
          throw new Error('This link is invalid or has expired');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to access this folder');
        } else {
          throw new Error('Failed to load shared folder');
        }
      }
      
      const data = await response.json();
      console.log('📦 Received data:', data);
      
      const folderData = data.data || data;
      setFolder(folderData);
      setFiles(folderData.files || []);
      setSubfolders(folderData.subfolders || []);
      setError(null);
      
    } catch (err) {
      console.error('❌ Failed to fetch shared folder:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    if (token) {
      fetchSharedFolder();
    } else {
      setError('Invalid share link - no token provided');
      setLoading(false);
    }
  }, [token, fetchSharedFolder]);

  // Cleanup preview URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && previewFile) {
        closePreview();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [previewFile]);

  const downloadFile = async (fileId, fileName) => {
    try {
      setDownloadingFiles(prev => new Set(prev).add(fileId));
      console.log('⬇️ Downloading file:', fileId, 'with token:', token);
      
      // ✅ Use BACKEND_BASE for download endpoint
      const url = `${BACKEND_BASE}/s/${token}/download?fileId=${fileId}`;
      
      console.log('🔄 Downloading from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Download failed:', response.status, errorText);
        throw new Error(`Download failed with status ${response.status}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
      console.log('✅ Download successful');
      
    } catch (err) {
      console.error('❌ Download failed:', err);
      alert(`Failed to download file: ${err.message}`);
    } finally {
      setDownloadingFiles(prev => {
        const next = new Set(prev);
        next.delete(fileId);
        return next;
      });
    }
  };

  const previewFileHandler = async (file) => {
    try {
      setPreviewFile(file);
      setPreviewUrl(null);
      
      console.log('👁️ Previewing file:', file);
      
      if (!canPreviewFile(file)) {
        alert('Preview not available for this file type. Please download to view.');
        setPreviewFile(null);
        return;
      }
      
      // ✅ Use BACKEND_BASE for preview endpoint
      const url = `${BACKEND_BASE}/s/${token}/download?fileId=${file.id}`;
      
      console.log('🔄 Loading preview from:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load preview: ${response.status}`);
      }
      
      const blob = await response.blob();
      const previewBlobUrl = window.URL.createObjectURL(blob);
      setPreviewUrl(previewBlobUrl);
      console.log('✅ Preview loaded successfully');
      
    } catch (err) {
      console.error('❌ Preview failed:', err);
      alert('Failed to load preview: ' + err.message);
      setPreviewFile(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const handleSubfolderClick = async (subfolder) => {
    console.log('📁 Opening subfolder:', subfolder);
    const newPath = [...currentPath, { id: subfolder.id, name: subfolder.name }];
    setCurrentPath(newPath);
    await fetchSharedFolder(subfolder.id);
  };

  const handleBreadcrumbClick = async (index) => {
    if (index === -1) {
      setCurrentPath([]);
      await fetchSharedFolder(null);
    } else {
      const newPath = currentPath.slice(0, index + 1);
      setCurrentPath(newPath);
      const folderId = newPath[newPath.length - 1].id;
      await fetchSharedFolder(folderId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading shared folder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Folder Unavailable
          </h1>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800 text-left">{error}</p>
            </div>
          </div>
          
          <p className="text-gray-600 mb-6">
            This shared link may have expired or been revoked by the owner.
          </p>
          
          <button
            onClick={() => navigate('/login')}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Login</span>
          </button>
          
          <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Folder className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Viewing Shared Folder</p>
                <p className="text-xs text-gray-400">
                  {folder?.permission === 'edit' ? 'Edit access' : 'Read-only access'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Folder Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Folder className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-2 break-words">
                  {folder?.name || 'Shared Folder'}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-blue-100">
                  {folder?.sharedBy && (
                    <span>Shared by: {folder.sharedBy}</span>
                  )}
                  {folder?.sharedAt && (
                    <span>Shared on: {formatDate(folder.sharedAt)}</span>
                  )}
                  <span>{(subfolders.length + files.length)} items</span>
                </div>
              </div>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          {currentPath.length > 0 && (
            <div className="border-b bg-gray-50 px-8 py-3">
              <div className="flex items-center gap-2 text-sm overflow-x-auto">
                <button
                  onClick={() => handleBreadcrumbClick(-1)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition flex-shrink-0"
                >
                  <Home className="w-4 h-4" />
                  <span>Root</span>
                </button>
                {currentPath.map((path, index) => (
                  <div key={path.id} className="flex items-center gap-2 flex-shrink-0">
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <button
                      onClick={() => handleBreadcrumbClick(index)}
                      className="text-blue-600 hover:text-blue-700 transition truncate max-w-[200px]"
                    >
                      {path.name}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="p-8">
            {subfolders.length === 0 && files.length === 0 ? (
              <div className="text-center py-12">
                <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">This folder is empty</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Subfolders */}
                {subfolders.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Folders ({subfolders.length})
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {subfolders.map((subfolder) => (
                        <button
                          key={subfolder.id}
                          onClick={() => handleSubfolderClick(subfolder)}
                          className="bg-gray-50 hover:bg-gray-100 rounded-lg p-4 transition cursor-pointer border border-gray-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Folder className="w-5 h-5 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {subfolder.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {subfolder.itemCount || 0} items
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Files */}
                {files.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">
                      Files ({files.length})
                    </h2>
                    <div className="space-y-2 border border-gray-200 rounded-lg overflow-hidden">
                      {files.map((file) => {
                        const FileIcon = getFileIcon(file);
                        const isDownloading = downloadingFiles.has(file.id);
                        
                        return (
                          <div
                            key={file.id}
                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition"
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                <FileIcon className="w-5 h-5 text-gray-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {file.name}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{formatFileSize(file.size)}</span>
                                  {file.createdAt && (
                                    <>
                                      <span>•</span>
                                      <span>{formatDate(file.createdAt)}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {canPreviewFile(file) && (
                                <button
                                  onClick={() => previewFileHandler(file)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition text-sm font-medium flex items-center gap-1"
                                >
                                  <Eye className="w-4 h-4" />
                                  <span className="hidden sm:inline">Preview</span>
                                </button>
                              )}
                              <button
                                onClick={() => downloadFile(file.id, file.name)}
                                disabled={isDownloading}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-sm font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isDownloading ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline">
                                  {isDownloading ? 'Downloading...' : 'Download'}
                                </span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Security Notice */}
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-900 mb-1">
                    Security Notice
                  </p>
                  <p className="text-xs text-yellow-800">
                    Only download files from people you trust. Always scan downloaded files with antivirus software before opening them.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Want to share folders like this?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create a free account
            </button>
          </p>
        </div>
      </div>

      {/* Preview Modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={closePreview}
        >
          <div 
            className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {previewFile.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(previewFile.size)}
                </p>
              </div>
              <button
                onClick={closePreview}
                className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-gray-50">
              {previewUrl ? (
                <div className="flex items-center justify-center min-h-full">
                  {(previewFile.mimeType?.startsWith('image/') || previewFile.name.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) ? (
                    <img 
                      src={previewUrl} 
                      alt={previewFile.name}
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  ) : (previewFile.mimeType?.startsWith('video/') || previewFile.name.match(/\.(mp4|webm|ogg|mov)$/i)) ? (
                    <video 
                      src={previewUrl} 
                      controls
                      className="max-w-full max-h-full rounded"
                    >
                      Your browser does not support video playback.
                    </video>
                  ) : (previewFile.mimeType?.startsWith('audio/') || previewFile.name.match(/\.(mp3|wav|ogg)$/i)) ? (
                    <div className="w-full max-w-md">
                      <audio 
                        src={previewUrl} 
                        controls
                        className="w-full"
                      >
                        Your browser does not support audio playback.
                      </audio>
                    </div>
                  ) : (previewFile.mimeType === 'application/pdf' || previewFile.name.endsWith('.pdf')) ? (
                    <iframe 
                      src={previewUrl}
                      className="w-full h-full min-h-[60vh] md:min-h-[70vh] border-0 rounded"
                      title={previewFile.name}
                    />
                  ) : (
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">Preview not available for this file type</p>
                      <button
                        onClick={() => {
                          closePreview();
                          downloadFile(previewFile.id, previewFile.name);
                        }}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
                      >
                        Download File
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading preview...</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t p-4 flex justify-end gap-2 bg-gray-50">
              <button
                onClick={closePreview}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium"
              >
                Close
              </button>
              <button
                onClick={() => {
                  closePreview();
                  downloadFile(previewFile.id, previewFile.name);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}