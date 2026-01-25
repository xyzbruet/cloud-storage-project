// pages/SearchResults.jsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Download, Star, ArrowLeft, MoreVertical, Share2 } from 'lucide-react';
import api from '../services/api';
import FilePreviewModal from '../components/files/FilePreview';
import ShareModal from '../components/share/ShareModal';
import FileContextMenu from '../components/common/FileContextMenu';
import RenameModal from '../components/common/RenameModal';
import useFileOperations from '../hooks/useFileOperations';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);

  const showToast = (type, message) => {
    // Implement your toast notification here
    console.log(`${type}: ${message}`);
  };

  // Use the reusable hook for file operations
  const {
    contextMenu,
    renameItem,
    openContextMenu,
    closeContextMenu,
    openRenameModal,
    closeRenameModal,
    handleDelete,
    handleRename,
    handleDownload,
    handleToggleStar,
  } = useFileOperations(searchFiles, showToast);

  useEffect(() => {
    if (query) {
      searchFiles(query);
    } else {
      setLoading(false);
    }
  }, [query]);

  async function searchFiles(searchQuery = query) {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/files');
      
      const files = Array.isArray(response.data?.data) ? response.data.data : [];
      
      const searchLower = searchQuery.toLowerCase();
      const filtered = files.filter(file => 
        file.name?.toLowerCase().includes(searchLower) ||
        file.mimeType?.toLowerCase().includes(searchLower)
      );
      
      setResults(filtered);
    } catch (err) {
      console.error('Search failed:', err);
      setError(err.message || 'Failed to fetch files');
    } finally {
      setLoading(false);
    }
  }

  const getFileIcon = (file) => {
    const mimeType = file.mimeType;
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.startsWith('video/')) return '🎥';
    if (mimeType?.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType === 'text/html') return '🌐';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('sheet')) return '📊';
    return '📄';
  };

  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-yellow-200 text-gray-900 px-0.5 rounded">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <>
      <div className="space-y-6" onClick={closeContextMenu}>
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-3 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Search Results</h1>
            <p className="text-gray-600 mt-2 text-sm">
              {query ? (
                <>
                  Results for "<span className="font-medium text-gray-900">{query}</span>"
                  {!loading && ` - ${results.length} ${results.length === 1 ? 'file' : 'files'} found`}
                </>
              ) : (
                'Enter a search query'
              )}
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-gray-600">Searching...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            <h3 className="font-semibold">Search failed</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!loading && !query && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No search query</h3>
            <p className="text-gray-500">Use the search bar above to find files</p>
          </div>
        )}

        {!loading && query && results.length === 0 && !error && (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-gray-500 mb-2">No files match "{query}"</p>
            <p className="text-sm text-gray-400">Try using different keywords</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
            {results.map((file) => (
              <div
                key={file.id}
                tabIndex={0}
                role="button"
                onClick={() => setPreviewFile(file)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  openContextMenu(file, e.clientX, e.clientY);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setPreviewFile(file);
                  }
                }}
                className="bg-white border border-gray-200 rounded-lg p-2 hover:shadow-md transition-all duration-200 relative cursor-pointer hover:border-blue-300"
              >
                <div className="absolute top-1 right-1 flex gap-1 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openContextMenu(file, e.clientX, e.clientY);
                    }}
                    className="p-1 bg-white rounded-full shadow hover:shadow-md transition"
                  >
                    <MoreVertical className="w-3 h-3 text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleStar(file.id);
                    }}
                    className="p-1 bg-white rounded-full shadow hover:shadow-md transition"
                  >
                    <Star
                      className={`w-3 h-3 ${
                        file.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'
                      }`}
                    />
                  </button>
                </div>

                <div className="aspect-square bg-gradient-to-br from-green-50 to-blue-50 rounded-md mb-1.5 flex items-center justify-center overflow-hidden">
                  {file.mimeType?.startsWith('image/') ? (
                    <img
                      src={`${api.defaults.baseURL}/files/${file.id}/download`}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <span className={file.mimeType?.startsWith('image/') ? 'hidden' : 'text-2xl'}>
                    {getFileIcon(file)}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="font-medium text-gray-900 truncate text-xs leading-tight" title={file.name}>
                    {highlightMatch(file.name, query)}
                  </h3>

                  <p className="text-[10px] text-gray-500">
                    {file.size ? `${(file.size / 1024).toFixed(1)} KB` : 'Unknown'}
                  </p>

                  <div className="flex gap-1 pt-1 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareFile(file);
                      }}
                      className="flex-1 px-1 py-1 text-[10px] bg-green-50 text-green-600 rounded hover:bg-green-100 transition flex items-center justify-center gap-0.5"
                    >
                      <Share2 className="w-2.5 h-2.5" />
                      Share
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(file);
                      }}
                      className="px-1 py-1 text-[10px] bg-gray-50 text-gray-600 rounded hover:bg-gray-100 transition"
                    >
                      <Download className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareFile && (
        <ShareModal
          file={shareFile}
          onClose={() => setShareFile(null)}
          onShared={() => searchFiles()}
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
      />

      {/* Reusable Rename Modal */}
      <RenameModal
        item={renameItem}
        onClose={closeRenameModal}
        onRename={handleRename}
      />
    </>
  );
}