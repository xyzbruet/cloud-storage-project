import { Trash2, RotateCcw, Eye, X, Filter, Folder, Clock, MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast, useConfirm } from '../components/Toast';
import axios from '../utils/axios';
import folderService from '../services/folderService';
import FileCard from '../components/common/FileCard';
import ViewToggle from '../components/files/ViewToggle';
import FileContextMenu from '../components/common/FileContextMenu';
import { useFileFilter } from '../hooks/useFileFilter';
import { useViewPreference } from '../hooks/useViewPreference';
import { FilterBar } from '../components/common/FilterBar';

export default function Trash() {
  // View preference hook
  const [view, setView] = useViewPreference('trash');
  
  const toast = useToast();
  const confirm = useConfirm();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [previewItem, setPreviewItem] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  // Add filter hook - use combined array
  const {
    filters,
    updateFilter,
    resetFilters,
    getFilteredItems,
    hasActiveFilters,
    getActiveFilterCount
  } = useFileFilter([...folders, ...files]);

  const filteredItems = getFilteredItems();
  const allItems = [...folders, ...files];

  useEffect(() => {
    fetchTrashItems();
  }, []);

  const fetchTrashItems = async () => {
    setLoading(true);
    try {
      const [filesRes, foldersRes] = await Promise.all([
        axios.get("/api/files/trash"),
        folderService.getTrashFolders()
      ]);

      const filesData = filesRes.data.data || filesRes.data || [];
      const foldersData = foldersRes.data || [];

      const formattedFolders = foldersData.map(folder => ({
        ...folder,
        isFolder: true,
        mimeType: 'folder'
      }));

      setFiles(filesData);
      setFolders(formattedFolders);
      setError("");
    } catch (err) {
      console.error("Failed to load trash", err);
      setError("Failed to load trash items.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmptyTrash = async () => {
    const currentItems = [...folders, ...files];
    if (currentItems.length === 0) return;

    const confirmed = await confirm({
      title: 'Empty Trash',
      message: `Permanently delete all ${currentItems.length} items? This action cannot be undone.`,
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const currentFiles = [...files];
      const currentFolders = [...folders];

      if (currentFiles.length > 0) {
        await Promise.allSettled(
          currentFiles.map(file => 
            axios.delete(`/api/files/${file.id}/permanent`)
              .catch(err => {
                console.error(`Failed to delete file ${file.id}:`, err);
                return null;
              })
          )
        );
      }

      if (currentFolders.length > 0) {
        await Promise.allSettled(
          currentFolders.map(folder => 
            folderService.permanentlyDeleteFolder(folder.id)
              .catch(err => {
                console.error(`Failed to delete folder ${folder.id}:`, err);
                return null;
              })
          )
        );
      }
      
      setFiles([]);
      setFolders([]);
      setPreviewItem(null);
      closeContextMenu();
      toast.success("Trash emptied successfully");
      
      // Dispatch storage update event
      window.dispatchEvent(new Event('storage-updated'));
      
      await fetchTrashItems();
    } catch (err) {
      console.error("Failed to empty trash", err);
      toast.error("Some items could not be deleted");
      fetchTrashItems();
    }
  };

  const handleRestore = async (item, e) => {
    if (e) e.stopPropagation();
    
    const isFolder = item.isFolder || item.mimeType === 'folder';

    try {
      if (isFolder) {
        await folderService.restoreFolder(item.id);
        setFolders(prevFolders => prevFolders.filter(f => f.id !== item.id));
      } else {
        await axios.post(`/api/files/${item.id}/restore`);
        setFiles(prevFiles => prevFiles.filter(f => f.id !== item.id));
      }

      if (previewItem && previewItem.id === item.id) {
        setPreviewItem(null);
      }
      
      closeContextMenu();
      toast.success(`${isFolder ? 'Folder' : 'File'} restored successfully!`);
      
      // Dispatch storage update event
      window.dispatchEvent(new Event('storage-updated'));
    } catch (err) {
      console.error("Failed to restore", err);
      const errorMsg = err.response?.data?.message || 'Failed to restore';
      toast.error(errorMsg);
    }
  };

  const handlePermanentDelete = async (item, e) => {
    if (e) e.stopPropagation();
    
    const isFolder = item.isFolder || item.mimeType === 'folder';
    
    const confirmed = await confirm({
      title: 'Permanent Delete',
      message: `Permanently delete "${item.name}"? This action cannot be undone.`,
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      if (isFolder) {
        try {
          await folderService.permanentlyDeleteFolder(item.id);
          setFolders(prevFolders => prevFolders.filter(f => f.id !== item.id));
        } catch (folderErr) {
          if (folderErr.response?.status === 400) {
            toast.error("This folder contains files. Please delete files first or use 'Empty Trash' to delete all items.");
            return;
          }
          throw folderErr;
        }
      } else {
        await axios.delete(`/api/files/${item.id}/permanent`);
        setFiles(prevFiles => prevFiles.filter(f => f.id !== item.id));
      }

      if (previewItem && previewItem.id === item.id) {
        setPreviewItem(null);
      }
      
      closeContextMenu();
      toast.success(`${isFolder ? 'Folder' : 'File'} deleted permanently`);
      
      // Dispatch storage update event
      window.dispatchEvent(new Event('storage-updated'));
    } catch (err) {
      console.error("Failed to delete permanently", err);
      const errorMsg = err.response?.data?.message || 'Failed to delete permanently';
      toast.error(errorMsg);
    }
  };

  const handlePreview = (item) => {
    setPreviewItem(item);
    closeContextMenu();
  };

  const openContextMenu = (item, x, y) => {
    setContextMenu({ show: true, x, y, item });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const getItemIcon = (item) => {
    const isFolder = item.isFolder || item.mimeType === 'folder';
    if (isFolder) return '📁';
    
    const mimeType = item.mimeType;
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
        <p className="text-gray-600">Loading trash...</p>
      </div>
    );
  }

  if (error && allItems.length === 0) {
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
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">Trash</h1>
            <p className="text-gray-600 mt-2 text-sm">
              {filteredItems.length} {filteredItems.length !== allItems.length ? `of ${allItems.length}` : ''} {filteredItems.length === 1 ? 'item' : 'items'}
              {allItems.filter(item => item.isFolder || item.mimeType === 'folder').length > 0 && 
                ` (${allItems.filter(item => item.isFolder || item.mimeType === 'folder').length} ${allItems.filter(item => item.isFolder || item.mimeType === 'folder').length === 1 ? 'folder' : 'folders'})`}
              {' • '}Items deleted after 30 days
            </p>
          </div>

          {allItems.length > 0 && (
            <button 
              onClick={handleEmptyTrash}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition shadow-sm text-sm font-medium flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Empty Trash
            </button>
          )}
        </div>

        {/* ==================== FILTER BAR WITH VIEW TOGGLE ==================== */}
        {allItems.length > 0 && (
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

        {filteredItems.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
            {hasActiveFilters() ? (
              <>
                <Filter className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No items match your filters</h3>
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
                <Trash2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Trash is empty</h3>
                <p className="text-gray-500">Deleted files and folders will appear here</p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* ==================== GRID VIEW ==================== */}
            {view === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
                {filteredItems.map((item) => {
                  const isFolder = item.isFolder || item.mimeType === 'folder';
                  
                  return (
                    <FileCard
                      key={`${isFolder ? 'folder' : 'file'}-${item.id}`}
                      item={item}
                      onPreview={handlePreview}
                      openContextMenu={openContextMenu}
                      showQuickActions={true}
                      topLeftCustomBadges={(item) => (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[8px] rounded-full shadow-sm">
                          Trash
                        </span>
                      )}
                      customActions={(item) => (
                        <div className="flex gap-1 pt-1 border-t border-gray-100">
                          <button
                            onClick={(e) => handleRestore(item, e)}
                            className="flex-1 px-1 py-1 text-[10px] bg-green-50 text-green-600 rounded hover:bg-green-100 transition flex items-center justify-center gap-0.5"
                            title="Restore"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            Restore
                          </button>
                          <button
                            onClick={(e) => handlePermanentDelete(item, e)}
                            className="px-1 py-1 text-[10px] bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                            title="Delete forever"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    />
                  );
                })}
              </div>
            )}

            {/* ==================== LIST VIEW ==================== */}
            {view === 'list' && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* List Header */}
                <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <div className="flex-1 min-w-0">Name</div>
                  <div className="hidden lg:block w-56">Deleted</div>
                  <div className="hidden xl:block w-32 text-right">Size</div>
                  <div className="w-56"></div> {/* Space for actions */}
                </div>

                {/* List Items */}
                {filteredItems.map((item) => {
                  const isFolder = item.isFolder || item.mimeType === 'folder';
                  
                  return (
                    <div key={`${isFolder ? 'folder' : 'file'}-${item.id}`} className="flex items-center px-6 py-3 hover:bg-gray-50 border-b border-gray-100 group transition-colors">
                      {/* Name column */}
                      <div 
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                        onClick={() => handlePreview(item)}
                      >
                        {/* File/Folder icon */}
                        <div className="flex-shrink-0">
                          {isFolder ? (
                            <Folder className="w-5 h-5 text-yellow-500" />
                          ) : (
                            <div className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded">
                              <span className="text-sm">{getItemIcon(item)}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Name with trash badge */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900 truncate">
                              {item.name}
                            </span>
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] rounded flex-shrink-0">
                              Trash
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Deleted column */}
                      <div className="hidden lg:flex items-center w-56 flex-shrink-0">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{formatDate(item.deletedAt || item.updatedAt)}</span>
                        </div>
                      </div>

                      {/* Size column */}
                      <div className="hidden xl:flex items-center justify-end w-32 flex-shrink-0">
                        <span className="text-sm text-gray-700">
                          {isFolder ? '—' : formatFileSize(item.size)}
                        </span>
                      </div>

                      {/* Actions column */}
                      <div className="flex items-center justify-end gap-2 w-56 flex-shrink-0">
                        <button
                          onClick={(e) => handleRestore(item, e)}
                          className="px-3 py-1.5 text-xs text-green-600 hover:bg-green-50 rounded transition flex items-center gap-1.5"
                          title="Restore"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore</span>
                        </button>
                        <button
                          onClick={(e) => handlePermanentDelete(item, e)}
                          className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded transition flex items-center gap-1.5"
                          title="Delete Forever"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
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
      </div>

      <FileContextMenu
        contextMenu={contextMenu}
        onClose={closeContextMenu}
        onPreview={handlePreview}
        onDownload={null}
        onShare={null}
        onToggleStar={null}
        onRename={null}
        onDelete={handlePermanentDelete}
        showPreview={true}
        showDownload={false}
        showShare={false}
        showStar={false}
        showRename={false}
        showDelete={true}
      />

      {previewItem && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b bg-white">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-semibold text-gray-900 truncate">
                    {previewItem.name}
                  </h2>
                  <span className="px-2 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                    In Trash
                  </span>
                  {(previewItem.isFolder || previewItem.mimeType === 'folder') && (
                    <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-600 rounded-full">
                      Folder
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {previewItem.isFolder || previewItem.mimeType === 'folder' 
                    ? 'Folder' 
                    : previewItem.size 
                      ? formatFileSize(previewItem.size)
                      : 'Size unknown'}
                </p>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition ml-4"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto bg-gray-50 p-6">
              <div className="bg-white p-6 rounded-lg h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-4">{getItemIcon(previewItem)}</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {previewItem.isFolder || previewItem.mimeType === 'folder' 
                      ? 'Folder' 
                      : 'File'} in Trash
                  </h3>
                  <p className="text-gray-600 mb-2">
                    Restore this {previewItem.isFolder || previewItem.mimeType === 'folder' 
                      ? 'folder' 
                      : 'file'} to access it
                  </p>
                  <p className="text-sm text-gray-500">
                    {previewItem.isFolder || previewItem.mimeType === 'folder' 
                      ? 'Restoring will also restore all contents' 
                      : `Type: ${previewItem.mimeType || 'Unknown'}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t bg-white">
              <div className="text-sm text-gray-600">
                ⚠️ This {previewItem.isFolder || previewItem.mimeType === 'folder' 
                  ? 'folder' 
                  : 'file'} will be permanently deleted after 30 days
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => handlePermanentDelete(previewItem, e)}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition flex items-center gap-2 text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Forever
                </button>
                <button
                  onClick={(e) => handleRestore(previewItem, e)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 text-sm font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  Restore {previewItem.isFolder || previewItem.mimeType === 'folder' 
                    ? 'Folder' 
                    : 'File'}
                </button>
                <button
                  onClick={() => setPreviewItem(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}