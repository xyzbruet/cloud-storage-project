import { useState, useEffect } from 'react';
import { X, Folder, ChevronRight, Home, FolderOpen, AlertCircle, Check } from 'lucide-react';
import folderService from '../../services/folderService';
import api from '../../services/api';

export default function MoveModal({ items, onClose, onMove }) {
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: 'My Drive' }]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Support both single item and multiple items
  const itemsArray = Array.isArray(items) ? items : [items];
  const isBulkMove = itemsArray.length > 1;

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  useEffect(() => {
    fetchFolders();
  }, [currentFolder]);

  const fetchFolders = async () => {
    setLoading(true);
    try {
      let result;
      
      if (currentFolder) {
        result = await folderService.getSubFolders(currentFolder);
      } else {
        result = await folderService.getRootFolders();
      }
      
      // Handle different response formats
      const foldersData = result.data || result.folders || result || [];
      
      // Filter out the items being moved to prevent moving into themselves or their children
      const itemIds = itemsArray.map(item => item.id || item._id);
      const filteredFolders = Array.isArray(foldersData) 
        ? foldersData.filter(folder => !itemIds.includes(folder.id || folder._id))
        : [];
      
      setFolders(filteredFolders);
    } catch (err) {
      console.error('Failed to fetch folders:', err);
      showMessage('error', 'Failed to load folders');
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folder) => {
    setCurrentFolder(folder.id || folder._id);
    setBreadcrumbs(prev => [...prev, { id: folder.id || folder._id, name: folder.name }]);
  };

  const navigateToBreadcrumb = (index) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    setBreadcrumbs(newBreadcrumbs);
    setCurrentFolder(newBreadcrumbs[newBreadcrumbs.length - 1].id);
  };

  const handleMove = async () => {
    setMoving(true);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      
      for (const item of itemsArray) {
        try {
          const isFolder = item.isFolder || item.mimeType === 'folder';
          
          if (isFolder) {
            // Use PATCH for folders - update with new parentId
            await api.patch(`/folders/${item.id}`, {
              parentId: currentFolder
            });
          } else {
            // Use PUT for files - update with new folderId
            await api.put(`/files/${item.id}`, {
              folderId: currentFolder,
              name: item.name // Keep the name the same
            });
          }
          
          successCount++;
        } catch (err) {
          errorCount++;
          console.error(`Failed to move ${item.name}:`, err);
        }
      }

      if (successCount > 0) {
        const destination = breadcrumbs[breadcrumbs.length - 1].name;
        showMessage(
          'success', 
          `Successfully moved ${successCount} item${successCount > 1 ? 's' : ''} to ${destination}`
        );
        
        if (onMove) {
          await onMove();
        }
        
        // Close after a short delay to show success message
        setTimeout(() => onClose(), 1500);
      }

      if (errorCount > 0) {
        showMessage('error', `Failed to move ${errorCount} item${errorCount > 1 ? 's' : ''}`);
      }
    } catch (err) {
      console.error('Move operation failed:', err);
      showMessage('error', 'Failed to move items');
    } finally {
      setMoving(false);
    }
  };

  const canMoveHere = () => {
    // Can't move into the same location
    if (itemsArray.length === 1) {
      const item = itemsArray[0];
      if (item.parentId === currentFolder) {
        return false;
      }
    }
    return true;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">
              Move {isBulkMove ? `${itemsArray.length} items` : itemsArray[0]?.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Choose a destination folder
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white rounded-lg transition ml-4"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        {message.text && (
          <div className={`mx-6 mt-4 p-3 rounded-lg flex items-start gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
            'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {/* Breadcrumb Navigation */}
        <div className="px-6 pt-4 pb-2 border-b bg-gray-50">
          <div className="flex items-center gap-2 text-sm overflow-x-auto">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id || 'root'} className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => navigateToBreadcrumb(index)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition ${
                    index === breadcrumbs.length - 1
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-200 text-gray-600'
                  }`}
                >
                  {index === 0 ? (
                    <Home className="w-4 h-4" />
                  ) : (
                    <Folder className="w-4 h-4" />
                  )}
                  <span>{crumb.name}</span>
                </button>
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Folder List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : folders.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 font-medium">No folders here</p>
              <p className="text-sm text-gray-400 mt-1">
                You can move items to this location
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {folders.map((folder) => (
                <button
                  key={folder.id || folder._id}
                  onClick={() => navigateToFolder(folder)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 border-2 border-transparent hover:border-blue-200 transition group"
                >
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Folder className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {folder.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {folder.createdAt && new Date(folder.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {!canMoveHere() && (
              <span className="text-orange-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                Already in this location
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={moving}
              className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={moving || !canMoveHere()}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg flex items-center gap-2"
            >
              {moving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Moving...
                </>
              ) : (
                <>
                  Move Here
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}