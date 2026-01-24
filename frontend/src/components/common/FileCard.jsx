import { 
  MoreVertical, 
  Star, 
  Share2, 
  Download, 
  Folder, 
  Users, 
  Link2,
  Edit,
  Eye,
  FolderOpen,
  FileText
} from 'lucide-react';
import { useState, useEffect } from 'react';

export default function FileCard({ 
  item, 
  onClick,
  onContextMenu,
  onToggleStar,
  onShare,
  onDownload,
  onRename,
  onFolderClick,
  onPreview,
  openContextMenu,
  showQuickActions = true,
  showSharedBadges = false,
  showPermissionBadge = false,
  ownerEmail = null,
  customActions = null,
  topRightCustomBadges = null,
  topLeftCustomBadges = null
}) {
  const isFolder = item.isFolder || item.mimeType === 'folder';
  const [thumbnailError, setThumbnailError] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);

  const getFileIcon = (item) => {
    if (isFolder) return '📁';
    const mimeType = item.mimeType;
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.startsWith('video/')) return '🎥';
    if (mimeType?.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType === 'text/html') return '🌐';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('sheet')) return '📊';
    if (mimeType?.includes('presentation') || mimeType?.includes('powerpoint')) return '📊';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '📦';
    if (mimeType?.startsWith('text/')) return '📄';
    return '📄';
  };

  const isPDF = item.mimeType === 'application/pdf';
  const isImage = item.mimeType?.startsWith('image/');
  const isVideo = item.mimeType?.startsWith('video/');
  const isText = item.mimeType?.startsWith('text/');

  // Load image thumbnail
  useEffect(() => {
    if (isImage && !thumbnailError && !imagePreview) {
      loadImageThumbnail();
    }
  }, [item.id, isImage]);

  // Load video thumbnail
  useEffect(() => {
    if (isVideo && !thumbnailError && !videoPreview) {
      loadVideoThumbnail();
    }
  }, [item.id, isVideo]);

  // Load PDF first page as thumbnail
  useEffect(() => {
    if (isPDF && !thumbnailError) {
      loadPDFThumbnail();
    }
  }, [item.id, isPDF]);

  // Cleanup blob URLs
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      if (pdfPreview && pdfPreview.startsWith('blob:')) URL.revokeObjectURL(pdfPreview);
    };
  }, [imagePreview, videoPreview, pdfPreview]);

  const loadImageThumbnail = async () => {
    try {
      const api = (await import('../../services/api')).default;
      const response = await api.get(`/files/${item.id}/download`, {
        responseType: 'blob'
      });
      
      const url = URL.createObjectURL(response.data);
      setImagePreview(url);
    } catch (err) {
      console.error('Failed to load image:', err);
      setThumbnailError(true);
    }
  };

  const loadVideoThumbnail = async () => {
    try {
      const api = (await import('../../services/api')).default;
      const response = await api.get(`/files/${item.id}/download`, {
        responseType: 'blob'
      });
      
      const url = URL.createObjectURL(response.data);
      setVideoPreview(url);
    } catch (err) {
      console.error('Failed to load video:', err);
      setThumbnailError(true);
    }
  };

  const loadPDFThumbnail = async () => {
    try {
      // Check if PDF.js is available
      if (typeof window.pdfjsLib === 'undefined') {
        // Load PDF.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        document.head.appendChild(script);
        
        script.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          generatePDFThumbnail();
        };
      } else {
        generatePDFThumbnail();
      }
    } catch (err) {
      console.error('Failed to load PDF thumbnail:', err);
      setThumbnailError(true);
    }
  };

  const generatePDFThumbnail = async () => {
    try {
      // Import api client
      const api = (await import('../../services/api')).default;
      
      // Use api client to get the PDF with proper authentication
      const response = await api.get(`/files/${item.id}/download`, {
        responseType: 'blob'
      });
      
      // response.data is the blob from axios
      const arrayBuffer = await response.data.arrayBuffer();
      
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const page = await pdf.getPage(1);
      
      const scale = 0.5;
      const viewport = page.getViewport({ scale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      setPdfPreview(canvas.toDataURL());
    } catch (err) {
      console.error('Failed to generate PDF thumbnail:', err);
      setThumbnailError(true);
    }
  };

  const handleClick = () => {
    if (isFolder && onFolderClick) {
      onFolderClick(item);
    } else if (onPreview) {
      onPreview(item);
    } else if (onClick) {
      onClick(item);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
  };

  const renderThumbnail = () => {
    // Folder icon
    if (isFolder) {
      return (
        <div className="relative w-full h-full flex items-center justify-center">
          <Folder className="w-16 h-16 text-yellow-500" strokeWidth={1.5} />
        </div>
      );
    }

    // Image thumbnail
    if (isImage && !thumbnailError) {
      if (imagePreview) {
        return (
          <img
            src={imagePreview}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        );
      }
      
      return (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="animate-pulse">
            <span className="text-3xl">🖼️</span>
          </div>
          <span className="text-[8px] text-gray-500">Loading...</span>
        </div>
      );
    }

    // PDF thumbnail
    if (isPDF) {
      if (pdfPreview) {
        return (
          <img
            src={pdfPreview}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        );
      }
      
      if (thumbnailError) {
        return (
          <div className="flex flex-col items-center justify-center gap-2">
            <FileText className="w-12 h-12 text-red-400" strokeWidth={1.5} />
            <span className="text-[8px] text-gray-500">PDF</span>
          </div>
        );
      }

      return (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="animate-pulse">
            <FileText className="w-12 h-12 text-blue-400" strokeWidth={1.5} />
          </div>
          <span className="text-[8px] text-gray-500">Loading...</span>
        </div>
      );
    }

    // Video thumbnail
    if (isVideo) {
      if (videoPreview) {
        return (
          <div className="relative w-full h-full">
            <video
              src={videoPreview}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-gray-800 border-b-4 border-b-transparent ml-0.5"></div>
              </div>
            </div>
          </div>
        );
      }
      
      if (thumbnailError) {
        return (
          <div className="flex items-center justify-center">
            <span className="text-3xl">{getFileIcon(item)}</span>
          </div>
        );
      }
      
      return (
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="animate-pulse">
            <span className="text-3xl">🎥</span>
          </div>
          <span className="text-[8px] text-gray-500">Loading...</span>
        </div>
      );
    }

    // Text file preview (first few lines)
    if (isText && !thumbnailError) {
      return (
        <div className="w-full h-full bg-white p-2 overflow-hidden">
          <div className="text-[6px] font-mono text-gray-600 leading-tight whitespace-pre-wrap break-all">
            <TextFilePreview fileId={item.id} />
          </div>
        </div>
      );
    }

    // Default icon fallback
    return (
      <div className="flex items-center justify-center">
        <span className="text-3xl">{getFileIcon(item)}</span>
      </div>
    );
  };

  return (
    <div
      tabIndex={0}
      role="button"
      onClick={handleClick}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition-all duration-200 relative cursor-pointer group hover:border-blue-300"
    >
      {/* Top Right Controls */}
      <div className="absolute top-1 right-1 flex gap-1 z-10">
        {topRightCustomBadges && topRightCustomBadges(item)}

        {showSharedBadges && item.hasPublicLink && (
          <div className="px-1.5 py-0.5 bg-blue-500 text-white text-[8px] rounded-full flex items-center gap-0.5 shadow-sm">
            <Link2 className="w-2 h-2" />
            Link
          </div>
        )}

        {showSharedBadges && item.sharedWithCount > 0 && (
          <div className="px-1.5 py-0.5 bg-green-500 text-white text-[8px] rounded-full flex items-center gap-0.5 shadow-sm">
            <Users className="w-2 h-2" />
            {item.sharedWithCount}
          </div>
        )}

        {!isFolder && onToggleStar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(item.id);
            }}
            className={`p-1 bg-white rounded-full shadow hover:shadow-md transition ${
              item.isStarred ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <Star
              className={`w-3 h-3 ${
                item.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'
              }`}
            />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            openContextMenu(item, e.clientX, e.clientY);
          }}
          className="p-1 bg-white rounded-full shadow hover:shadow-md transition"
        >
          <MoreVertical className="w-3 h-3 text-gray-600" />
        </button>
      </div>

      {/* Top Left Badges */}
      <div className="absolute top-1 left-1 flex flex-col gap-1 z-10">
        {topLeftCustomBadges && topLeftCustomBadges(item)}
        
        {showPermissionBadge && item.permission && (
          <>
            {item.permission === 'edit' && (
              <div className="px-1.5 py-0.5 bg-green-500 text-white text-[8px] rounded-full flex items-center gap-0.5 shadow-sm">
                <Edit className="w-2 h-2" />
                <span>Edit</span>
              </div>
            )}

            {item.permission === 'view' && (
              <div className="px-1.5 py-0.5 bg-blue-500 text-white text-[8px] rounded-full flex items-center gap-0.5 shadow-sm">
                <Eye className="w-2 h-2" />
                <span>View</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview/Thumbnail Area */}
      <div className="aspect-square rounded-md mb-1.5 flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 relative">
        {renderThumbnail()}
      </div>

      {/* File Info */}
      <div className="space-y-1">
        <h3 className="font-medium text-gray-900 truncate text-xs leading-tight" title={item.name}>
          {item.name}
        </h3>

        <div className="space-y-0.5">
          {ownerEmail && (
            <p className="text-[10px] text-blue-600 truncate flex items-center gap-0.5" title={`Shared by ${ownerEmail}`}>
              <Users className="w-2.5 h-2.5" />
              {ownerEmail}
            </p>
          )}
          
          {showSharedBadges && item.sharedWithCount > 0 && !ownerEmail && (
            <p className="text-[10px] text-green-600 flex items-center gap-1">
              <Users className="w-2.5 h-2.5" />
              {item.sharedWithCount} {item.sharedWithCount === 1 ? 'person' : 'people'}
              {item.hasPublicLink && ' + link'}
            </p>
          )}

          <p className="text-[10px] text-gray-500">
            {isFolder ? 'Folder' : formatSize(item.size)}
          </p>
        </div>

        {showQuickActions && (
          customActions ? (
            customActions(item)
          ) : !isFolder ? (
            <div className="flex gap-1 pt-1 border-t border-gray-100">
              {onShare && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(item);
                  }}
                  className="flex-1 px-1 py-1 text-[10px] bg-green-50 text-green-600 rounded hover:bg-green-100 transition flex items-center justify-center gap-0.5"
                >
                  <Share2 className="w-2.5 h-2.5" />
                  Share
                </button>
              )}
              {onDownload && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(item);
                  }}
                  className="px-1 py-1 text-[10px] bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition"
                  title="Download"
                >
                  <Download className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

// Helper component for text file preview
function TextFilePreview({ fileId }) {
  const [preview, setPreview] = useState('Loading...');

  useEffect(() => {
    const loadPreview = async () => {
      try {
        // Import api client dynamically
        const api = (await import('../../services/api')).default;
        
        const response = await api.get(`/files/${fileId}/download`, {
          responseType: 'text'
        });
        
        const text = response.data;
        // Show first 200 characters
        setPreview(text.substring(0, 200) + (text.length > 200 ? '...' : ''));
      } catch (err) {
        setPreview('Preview unavailable');
      }
    };

    loadPreview();
  }, [fileId]);

  return <>{preview}</>;
}