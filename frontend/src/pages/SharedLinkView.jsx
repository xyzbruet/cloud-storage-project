import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Download, FileText, Lock, AlertCircle, ArrowLeft, Eye, X } from 'lucide-react';

// Backend base URL (without /api for public share endpoints)
const BACKEND_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080';

export default function SharedLinkView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (token) {
      fetchSharedFile();
    } else {
      setError('Invalid share link - no token provided');
      setLoading(false);
    }
  }, [token]);

  const fetchSharedFile = async () => {
    try {
      setLoading(true);
      
      // Public share endpoints don't use /api prefix
      const response = await fetch(`${BACKEND_BASE}/s/${token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('This link is invalid or has expired');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to access this file');
        } else {
          throw new Error('Failed to load shared file');
        }
      }
      
      const data = await response.json();
      const fileData = data.data || data;
      console.log('Fetched file data:', fileData); // Debug log
      setFile(fileData);
      setError(null);
      
    } catch (err) {
      console.error('Failed to fetch shared file:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async () => {
    try {
      setDownloading(true);
      
      // Use the token-based download endpoint without fileId parameter
      // The backend should identify the file from the share token alone
      const downloadUrl = `${BACKEND_BASE}/s/${token}/download`;
      console.log('Downloading from:', downloadUrl); // Debug log
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream, */*',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download error response:', errorText);
        
        // Parse error message if JSON
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message && errorJson.message.includes('no Session')) {
            throw new Error('Backend database session error. Please contact the file owner or try again later.');
          }
          throw new Error(errorJson.message || `Failed to download file (${response.status})`);
        } catch (e) {
          throw new Error(`Failed to download file (${response.status}): ${errorText.substring(0, 100)}`);
        }
      }
      
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = file?.name || 'download';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      console.error('Download failed:', err);
      alert(`Failed to download file: ${err.message}`);
    } finally {
      setDownloading(false);
    }
  };

  const previewFile = async () => {
    try {
      setPreviewing(true);
      setPreviewUrl(null); // Reset preview URL
      
      const downloadUrl = `${BACKEND_BASE}/s/${token}/download`;
      console.log('Previewing from:', downloadUrl); // Debug log
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/octet-stream, */*',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview error response:', errorText);
        
        // Parse error message if JSON
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message && errorJson.message.includes('no Session')) {
            throw new Error('Backend database session error. The file owner needs to fix their server configuration.');
          }
          throw new Error(errorJson.message || `Failed to load preview (${response.status})`);
        } catch (e) {
          throw new Error(`Failed to load preview (${response.status}): ${errorText.substring(0, 100)}`);
        }
      }
      
      const blob = await response.blob();
      console.log('Preview blob loaded:', blob.type, blob.size); // Debug log
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
      
    } catch (err) {
      console.error('Preview failed:', err);
      alert(`Failed to load preview: ${err.message}`);
      setPreviewing(false);
      setPreviewUrl(null);
    }
  };

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPreviewing(false);
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const canPreview = (file) => {
    if (!file) return false;
    const mimeType = file.mimeType?.toLowerCase() || '';
    return mimeType.startsWith('image/') || 
           mimeType.startsWith('video/') || 
           mimeType.startsWith('audio/') ||
           mimeType === 'application/pdf';
  };

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading shared file...</p>
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
            Link Unavailable
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
      <div className="max-w-4xl mx-auto">
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
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Viewing Shared File</p>
                <p className="text-xs text-gray-400">Read-only access</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-white bg-opacity-20 rounded-xl flex items-center justify-center flex-shrink-0">
                <FileText className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-2 break-words">
                  {file?.name || 'Shared File'}
                </h1>
                <div className="flex flex-wrap gap-4 text-sm text-blue-100">
                  {file?.size && (
                    <span>Size: {formatFileSize(file.size)}</span>
                  )}
                  {file?.sharedBy && (
                    <span>Shared by: {file.sharedBy}</span>
                  )}
                  {file?.sharedAt && (
                    <span>Shared on: {formatDate(file.sharedAt)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">File Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">File Name</p>
                    <p className="text-gray-900 font-medium break-words">{file?.name}</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500 mb-1">File Size</p>
                    <p className="text-gray-900 font-medium">
                      {formatFileSize(file?.size)}
                    </p>
                  </div>
                  
                  {file?.mimeType && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">File Type</p>
                      <p className="text-gray-900 font-medium">{file.mimeType}</p>
                    </div>
                  )}
                  
                  {file?.createdAt && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-500 mb-1">Created Date</p>
                      <p className="text-gray-900 font-medium">{formatDate(file.createdAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
                <div className="flex flex-col sm:flex-row gap-3">
                  {canPreview(file) && (
                    <button
                      onClick={previewFile}
                      className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Eye className="w-5 h-5" />
                      Preview
                    </button>
                  )}
                  <button
                    onClick={downloadFile}
                    disabled={downloading}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition font-medium flex items-center justify-center gap-2 shadow-sm"
                  >
                    <Download className="w-5 h-5" />
                    {downloading ? 'Downloading...' : 'Download File'}
                  </button>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
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
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Want to share files like this?{' '}
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
      {previewing && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          onClick={closePreview}
        >
          <div 
            className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {file.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {formatFileSize(file.size)}
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
              {!previewUrl ? (
                <div className="flex items-center justify-center min-h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading preview...</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-full">
                  {file.mimeType?.startsWith('image/') ? (
                    <img 
                      src={previewUrl} 
                      alt={file.name}
                      className="max-w-full max-h-full object-contain rounded"
                    />
                  ) : file.mimeType?.startsWith('video/') ? (
                    <video 
                      src={previewUrl} 
                      controls
                      autoPlay
                      className="max-w-full max-h-full rounded"
                    >
                      Your browser does not support video playback.
                    </video>
                  ) : file.mimeType?.startsWith('audio/') ? (
                    <div className="w-full max-w-md">
                      <div className="bg-white rounded-lg p-8 shadow-lg">
                        <div className="text-center mb-6">
                          <div className="text-6xl mb-4">🎵</div>
                          <h4 className="text-lg font-medium text-gray-900">{file.name}</h4>
                        </div>
                        <audio 
                          src={previewUrl} 
                          controls
                          autoPlay
                          className="w-full"
                        >
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    </div>
                  ) : file.mimeType === 'application/pdf' ? (
                    <iframe 
                      src={previewUrl}
                      className="w-full h-full min-h-[70vh] border-0 rounded"
                      title={file.name}
                    />
                  ) : (
                    <div className="text-center">
                      <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">Preview not available</p>
                    </div>
                  )}
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
                  downloadFile();
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