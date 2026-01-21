import { Star, Download, Eye, Trash2, MoreVertical, Share2, Filter, Folder, Clock } from 'lucide-react';
import { useEffect, useState, useCallback } from 'react';
import axios from '../utils/axios';
import FilePreviewModal from '../components/files/FilePreview';
import ShareModal from '../components/share/ShareModal';
import ViewToggle from '../components/files/ViewToggle';
import FileContextMenu from '../components/common/FileContextMenu';
import RenameModal from '../components/common/RenameModal';
import useFileOperations from '../hooks/useFileOperations';
import { useToast } from "../components/Toast";
import { useFileFilter } from '../hooks/useFileFilter';
import { useViewPreference } from '../hooks/useViewPreference';
import { FilterBar } from '../components/common/FilterBar';

export default function Starred() {
  // View preference hook
  const [view, setView] = useViewPreference('starred');
  
  const toast = useToast();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);

  // Create showToast callback function FIRST
  const showToast = useCallback((type, message) => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else if (type === 'warning') toast.warning?.(message) || toast.info(message);
    else toast.info(message);
  }, [toast]);

  // Add fetchStarredFiles function
  async function fetchStarredFiles() {
    setLoading(true);
    try {
      const response = await axios.get('/api/files/starred');
      const data = response.data;
      setFiles(data.data || data || []);
      setError("");
    } catch (err) {
      console.error("Failed to load starred files", err);
      setError("Failed to load starred files. Please make sure you're logged in.");
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }

  // Use the reusable hook for file operations (AFTER showToast is defined)
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
  } = useFileOperations(fetchStarredFiles, showToast);

  // Add filter hook
  const {
    filters,
    updateFilter,
    resetFilters,
    getFilteredItems,
    hasActiveFilters,
    getActiveFilterCount
  } = useFileFilter(files);

  const filteredFiles = getFilteredItems();

  useEffect(() => {
    fetchStarredFiles();
  }, []);

  const getFileIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.startsWith('video/')) return '🎥';
    if (mimeType?.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType === 'text/html') return '🌐';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('sheet')) return '📊';
    return '📄';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        <p className="text-gray-600">Loading starred files...</p>
      </div>
    );
  }

  if (error && files.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6" onClick={closeContextMenu}>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Starred Files</h1>
            <p className="text-gray-600 mt-2 text-sm">
              {filteredFiles.length} {filteredFiles.length !== files.length ? `of ${files.length}` : ''} items
            </p>
          </div>
        </div>

        {/* ==================== FILTER BAR WITH VIEW TOGGLE ==================== */}
        {files.length > 0 && (
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
        )}

        {filteredFiles.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            {hasActiveFilters() ? (
              <>
                <Filter className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No files match your filters</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filter criteria</p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <Star className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No starred files</h3>
                <p className="text-gray-500">Star important files to quickly access them later</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* ==================== GRID VIEW ==================== */}
            {view === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                {filteredFiles.map((file) => (
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
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      </button>
                    </div>

                    <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md mb-1.5 flex items-center justify-center overflow-hidden">
                      {file.mimeType?.startsWith('image/') ? (
                        <img
                          src={`/api/files/${file.id}/download`}
                          alt={file.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span className={file.mimeType?.startsWith('image/') ? 'hidden' : 'text-2xl'}>
                        {getFileIcon(file.mimeType)}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-medium text-gray-900 truncate text-xs leading-tight" title={file.name}>
                        {file.name}
                      </h3>

                      <p className="text-[10px] text-gray-500">
                        {formatFileSize(file.size)}
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

            {/* ==================== LIST VIEW ==================== */}
            {view === 'list' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* List Header */}
                <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex-1 min-w-0">Name</div>
                  <div className="hidden md:block w-72">Location</div>
                  <div className="hidden lg:block w-48">Modified</div>
                  <div className="hidden xl:block w-32 text-right">Size</div>
                  <div className="w-28"></div> {/* Space for actions */}
                </div>

                {/* List Items */}
                {filteredFiles.map((file) => (
                  <div key={file.id} className="flex items-center px-6 py-3 hover:bg-gray-50 border-b border-gray-100 group transition-colors">
                    {/* Name column */}
                    <div 
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => setPreviewFile(file)}
                    >
                      {/* Star icon - always visible and filled for starred items */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleStar(file.id);
                        }}
                        className="flex-shrink-0"
                      >
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      </button>
                      
                      {/* File icon */}
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded">
                          <span className="text-sm">{getFileIcon(file.mimeType)}</span>
                        </div>
                      </div>
                      
                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-900 truncate block">
                          {file.name}
                        </span>
                      </div>
                    </div>

                    {/* Location column */}
                    <div className="hidden md:flex items-center w-72 flex-shrink-0">
                      <span className="text-sm text-gray-700">My Drive</span>
                    </div>

                    {/* Modified column */}
                    <div className="hidden lg:flex items-center w-48 flex-shrink-0">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{formatDate(file.updatedAt || file.createdAt)}</span>
                      </div>
                    </div>

                    {/* Size column */}
                    <div className="hidden xl:flex items-center justify-end w-32 flex-shrink-0">
                      <span className="text-sm text-gray-700">
                        {formatFileSize(file.size)}
                      </span>
                    </div>

                    {/* Actions column */}
                    <div className="flex items-center justify-end gap-1 w-28 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShareFile(file);
                        }}
                        className="opacity-0 group-hover:opacity-100 px-2.5 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded transition-all flex items-center gap-1.5"
                        title="Share"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Share</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openContextMenu(file, e.clientX, e.clientY);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-100 rounded transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {shareFile && (
        <ShareModal
          file={shareFile}
          onClose={() => setShareFile(null)}
          onShared={fetchStarredFiles}
        />
      )}

      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={() => setPreviewFile(null)}
          onToggleStar={handleToggleStar}
          onDelete={handleDelete}
        />
      )}

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

      <RenameModal
        item={renameItem}
        onClose={closeRenameModal}
        onRename={handleRename}
      />
    </>
  );
}