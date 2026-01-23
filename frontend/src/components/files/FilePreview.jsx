import { X, Download, Share2, Star, Trash2, Maximize, Minimize } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useToast } from '../Toast';

export default function FilePreviewModal({ file, onClose, onToggleStar, onDelete }) {
  const { toast } = useToast();
  const [previewUrl, setPreviewUrl] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    loadPreview();
    
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file.id]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const loadPreview = async () => {
    try {
      setLoading(true);
      setError(null);
      setTextContent(null);

      // Use api service instead of axios
      const response = await api.get(`/files/${file.id}/download`, {
        responseType: 'blob'
      });
      
      // response.data is already the blob from axios
      const blob = new Blob([response.data], { type: file.mimeType || response.data.type });
      
      if (isText) {
        const text = await blob.text();
        setTextContent(text);
      } else {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (err) {
      console.error('Failed to load preview:', err);
      setError(err.response?.data?.message || err.message || "Failed to load preview");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await api.get(`/files/${file.id}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast('Download started!', 'success');
    } catch (err) {
      console.error('Download failed:', err);
      toast('Download failed: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${file.name}"?`)) {
      return;
    }
    
    try {
      await api.delete(`/files/${file.id}`);
      toast('File deleted successfully', 'success');
      if (onDelete) {
        onDelete(file.id);
      }
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      toast('Delete failed: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await modalRef.current.requestFullscreen();
      } catch (err) {
        console.error('Failed to enter fullscreen:', err);
        toast('Fullscreen not supported', 'error');
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('Failed to exit fullscreen:', err);
      }
    }
  };

  const isImage = file.mimeType?.startsWith('image/');
  const isPDF = file.mimeType === 'application/pdf';
  const isVideo = file.mimeType?.startsWith('video/');
  const isAudio = file.mimeType?.startsWith('audio/');
  const isText = file.mimeType?.startsWith('text/') || 
                 file.mimeType === 'application/json' ||
                 file.name?.endsWith('.txt') ||
                 file.name?.endsWith('.json') ||
                 file.name?.endsWith('.xml') ||
                 file.name?.endsWith('.md') ||
                 file.name?.endsWith('.csv');

  return (
    <div 
      ref={modalRef}
      className={`fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 ${isFullscreen ? 'p-0' : ''}`}
      onClick={onClose}
    >
      <div 
        className={`bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] flex flex-col ${isFullscreen ? 'rounded-none max-w-none max-h-none' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b bg-white ${isFullscreen ? 'p-4' : ''}`}>
          <div className="flex-1 min-w-0">
            <h2 className={`text-xl font-semibold text-gray-900 truncate ${isFullscreen ? 'text-lg' : ''}`}>
              {file.name}
            </h2>
            <p className={`text-sm text-gray-500 mt-1 ${isFullscreen ? 'text-xs' : ''}`}>
              {file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Size unknown'} {file.mimeType ? `• ${file.mimeType}` : ''}
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-5 h-5 text-gray-600" /> : <Maximize className="w-5 h-5 text-gray-600" />}
            </button>
            
            {onToggleStar && (
              <button
                onClick={() => onToggleStar(file.id)}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title={file.isStarred ? "Unstar" : "Star"}
              >
                <Star 
                  className={`w-5 h-5 ${file.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`}
                />
              </button>
            )}
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className={`flex-1 overflow-auto bg-gray-50 ${isFullscreen ? 'p-0' : 'p-6'}`}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-3"></div>
                <div className="text-gray-500">Loading preview...</div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12">
                <div className="text-red-500 mb-4">
                  <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Failed to load preview
                </h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <button
                  onClick={loadPreview}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              {isImage && previewUrl && (
                <img 
                  src={previewUrl} 
                  alt={file.name}
                  className={`max-w-full max-h-full object-contain rounded-lg shadow-lg ${isFullscreen ? 'rounded-none' : ''}`}
                />
              )}
              
              {isPDF && previewUrl && (
                <div className="w-full h-full">
                  <object
                    data={previewUrl}
                    type="application/pdf"
                    className={`w-full h-full border-0 rounded-lg ${isFullscreen ? 'rounded-none' : ''}`}
                    style={{ minHeight: isFullscreen ? '100vh' : '600px' }}
                  >
                    <iframe
                      src={`${previewUrl}#toolbar=1&navpanes=1&scrollbar=1`}
                      className={`w-full h-full border-0 rounded-lg ${isFullscreen ? 'rounded-none' : ''}`}
                      title={file.name}
                      style={{ minHeight: isFullscreen ? '100vh' : '600px' }}
                    />
                  </object>
                </div>
              )}
              
              {isVideo && previewUrl && (
                <video 
                  src={previewUrl} 
                  controls
                  className={`max-w-full max-h-[70vh] rounded-lg shadow-lg ${isFullscreen ? 'max-h-full rounded-none' : ''}`}
                >
                  Your browser does not support video playback.
                </video>
              )}
              
              {isAudio && previewUrl && (
                <div className={`w-full max-w-2xl ${isFullscreen ? 'max-w-none' : ''}`}>
                  <div className={`bg-white rounded-lg shadow-lg p-8 ${isFullscreen ? 'rounded-none p-4' : ''}`}>
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">🎵</div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">{file.name}</h3>
                    </div>
                    <audio 
                      src={previewUrl} 
                      controls
                      className="w-full"
                    >
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                </div>
              )}
              
              {isText && textContent && (
                <div className={`w-full h-full bg-white rounded-lg shadow-lg overflow-auto ${isFullscreen ? 'rounded-none p-4' : 'p-6'}`}>
                  <pre className={`whitespace-pre-wrap text-sm font-mono text-gray-800 ${isFullscreen ? 'text-base' : ''}`}>
                    {textContent}
                  </pre>
                </div>
              )}
              
              {!isImage && !isPDF && !isVideo && !isAudio && !isText && (
                <div className={`text-center py-12 bg-white rounded-lg shadow-lg p-8 ${isFullscreen ? 'rounded-none py-8' : ''}`}>
                  <div className="text-gray-400 mb-4">
                    <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Preview not available
                  </h3>
                  <p className="text-gray-500 mb-4">
                    This file type cannot be previewed in the browser
                  </p>
                  <p className="text-sm text-gray-400 mb-6">Type: {file.mimeType || 'Unknown'}</p>
                  <button
                    onClick={handleDownload}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Hidden in fullscreen */}
        {!isFullscreen && (
          <div className="flex items-center justify-end gap-3 p-6 border-t bg-white">
            {onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}