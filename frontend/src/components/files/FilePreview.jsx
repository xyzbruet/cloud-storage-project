import { X, Download, Star, Trash2, Maximize, Minimize, ExternalLink } from 'lucide-react';
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
  const [isMobile, setIsMobile] = useState(false);
  const modalRef = useRef(null);

  // Determine file type helpers
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

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

      const response = await api.get(`/files/${file.id}/download`, {
        responseType: 'blob'
      });
      
      // Create blob with correct MIME type
      const blob = new Blob([response.data], { 
        type: file.mimeType || response.headers['content-type'] || 'application/octet-stream'
      });
      
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

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
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

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !document.fullscreenElement) {
      onClose();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        <div className={`flex items-center justify-between p-4 md:p-6 border-b bg-white ${isFullscreen ? 'p-4' : ''}`}>
          <div className="flex-1 min-w-0">
            <h2 className={`text-lg md:text-xl font-semibold text-gray-900 truncate ${isFullscreen ? 'text-lg' : ''}`}>
              {file.name}
            </h2>
            <p className={`text-xs md:text-sm text-gray-500 mt-1 ${isFullscreen ? 'text-xs' : ''}`}>
              {file.size ? `${(file.size / 1024).toFixed(2)} KB` : 'Size unknown'} {file.mimeType ? `• ${file.mimeType}` : ''}
            </p>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2 ml-4">
            {!isMobile && (
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? <Minimize className="w-5 h-5 text-gray-600" /> : <Maximize className="w-5 h-5 text-gray-600" />}
              </button>
            )}
            
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
              title="Close (Esc)"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className={`flex-1 overflow-auto bg-gray-50 ${isFullscreen ? 'p-0' : 'p-4 md:p-6'}`}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-3"></div>
                <div className="text-gray-500">Loading preview...</div>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center py-12 px-4">
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
                <>
                  {isMobile ? (
                    // Mobile: Show download option instead of preview
                    <div className="text-center py-12 bg-white rounded-lg shadow-lg p-8 max-w-md">
                      <div className="text-gray-400 mb-4">
                        <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        PDF Document
                      </h3>
                      <p className="text-gray-500 mb-2">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-400 mb-6">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                      <div className="space-y-3">
                        <button
                          onClick={handleDownload}
                          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center justify-center gap-2"
                        >
                          <Download className="w-5 h-5" />
                          Download PDF
                        </button>
                        <button
                          onClick={handleOpenInNewTab}
                          className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition inline-flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-5 h-5" />
                          Open in New Tab
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-4">
                        PDF preview is not available on mobile devices
                      </p>
                    </div>
                  ) : (
                    // Desktop: Show PDF preview
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
                </>
              )}
              
              {isVideo && previewUrl && (
                <video 
                  src={previewUrl} 
                  controls
                  playsInline
                  className={`max-w-full max-h-[70vh] rounded-lg shadow-lg ${isFullscreen ? 'max-h-full rounded-none' : ''}`}
                >
                  Your browser does not support video playback.
                </video>
              )}
              
              {isAudio && previewUrl && (
                <div className={`w-full max-w-2xl ${isFullscreen ? 'max-w-none' : ''}`}>
                  <div className={`bg-white rounded-lg shadow-lg p-6 md:p-8 ${isFullscreen ? 'rounded-none p-4' : ''}`}>
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-4">🎵</div>
                      <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">{file.name}</h3>
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
                <div className={`w-full h-full bg-white rounded-lg shadow-lg overflow-auto ${isFullscreen ? 'rounded-none p-4' : 'p-4 md:p-6'}`}>
                  <pre className={`whitespace-pre-wrap text-xs md:text-sm font-mono text-gray-800 ${isFullscreen ? 'text-base' : ''}`}>
                    {textContent}
                  </pre>
                </div>
              )}
              
              {!isImage && !isPDF && !isVideo && !isAudio && !isText && (
                <div className={`text-center py-12 bg-white rounded-lg shadow-lg p-6 md:p-8 max-w-md ${isFullscreen ? 'rounded-none py-8' : ''}`}>
                  <div className="text-gray-400 mb-4">
                    <svg className="w-20 md:w-24 h-20 md:h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-base md:text-lg font-medium text-gray-900 mb-2">
                    Preview not available
                  </h3>
                  <p className="text-sm md:text-base text-gray-500 mb-4">
                    This file type cannot be previewed in the browser
                  </p>
                  <p className="text-xs md:text-sm text-gray-400 mb-6">Type: {file.mimeType || 'Unknown'}</p>
                  <button
                    onClick={handleDownload}
                    className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-flex items-center justify-center gap-2"
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
          <div className="flex items-center justify-end gap-2 md:gap-3 p-4 md:p-6 border-t bg-white">
            {onDelete && (
              <button
                onClick={handleDelete}
                className="px-3 md:px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center gap-2 text-sm md:text-base"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
            <button
              onClick={handleDownload}
              className="px-3 md:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm md:text-base"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 md:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm md:text-base"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}