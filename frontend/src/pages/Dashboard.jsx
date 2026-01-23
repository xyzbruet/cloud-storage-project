import { Upload, FolderPlus, Star, Clock, TrendingUp, Users, Link2, HardDrive, Search, Filter, Grid3x3, List, ChevronRight, FileText, Image, Video, Music, Archive, File, MoreVertical, Share2, Download, Folder } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../components/Toast';
import { useAuthStore } from '../store/authStore';
import FilePreviewModal from '../components/files/FilePreview';
import ShareModal from '../components/share/ShareModal';
import ViewToggle from '../components/files/ViewToggle';
import FileContextMenu from '../components/common/FileContextMenu';
import RenameModal from '../components/common/RenameModal';
import MoveModal from '../components/files/MoveModal';
import FileCard from '../components/common/FileCard';
import useFileOperations from '../hooks/useFileOperations';
import { useViewPreference } from '../hooks/useViewPreference';
import api from '../services/api';

export default function Home() {
  const [view, setView] = useViewPreference('home');
  const toast = useToast();
  const { token } = useAuthStore();
  const fileInputRef = useRef(null);
  
  const [stats, setStats] = useState({
    totalFiles: 0,
    folders: 0,
    starred: 0,
    shared: 0,
    storageUsed: 0,
    storageLimit: 5 * 1024 * 1024 * 1024, // 5GB default
  });
  
  const [recentItems, setRecentItems] = useState([]);
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [quickAccess, setQuickAccess] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);

  const fetchHomeData = useCallback(async () => {
    setLoading(true);
    
    try {
      if (!token) return;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch user data first for accurate storage info
      let userStorageUsed = 0;
      let userStorageLimit = 5 * 1024 * 1024 * 1024; // Default 5GB

      try {
        const userResponse = await api.get('/auth/me');
        if (userResponse.data) {
          const userData = userResponse.data.user || userResponse.data;
          if (userData.storageUsed !== undefined && userData.storageLimit !== undefined) {
            userStorageUsed = userData.storageUsed;
            userStorageLimit = userData.storageLimit;
          }
        }
      } catch (userErr) {
        console.error('Failed to fetch user storage:', userErr);
      }

      // Fetch all data
      const [filesRes, foldersRes, starredRes, sharedRes] = await Promise.all([
        fetch('/api/files', { headers }).catch(() => null),
        fetch('/api/folders', { headers }).catch(() => null),
        fetch('/api/files/starred', { headers }).catch(() => null),
        fetch('/api/files/shared-with-me', { headers }).catch(() => null),
      ]);

      let allFiles = [];
      let allFolders = [];
      let starredCount = 0;
      let sharedCount = 0;

      if (filesRes?.ok) {
        const data = await filesRes.json();
        allFiles = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      }

      if (foldersRes?.ok) {
        const data = await foldersRes.json();
        allFolders = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        allFolders = allFolders.map(f => ({ ...f, isFolder: true, mimeType: 'folder' }));
      }

      if (starredRes?.ok) {
        const data = await starredRes.json();
        starredCount = Array.isArray(data.data) ? data.data.length : 0;
      }

      if (sharedRes?.ok) {
        const data = await sharedRes.json();
        sharedCount = Array.isArray(data.data) ? data.data.length : 0;
      }

      // Calculate storage - use user data if available, otherwise calculate from files
      let calculatedStorageUsed = userStorageUsed;
      if (userStorageUsed === 0) {
        const activeFiles = allFiles.filter(file => !file.deletedAt && !file.isDeleted);
        calculatedStorageUsed = activeFiles.reduce((sum, f) => sum + (f.size || 0), 0);
      }

      setStats({
        totalFiles: allFiles.length,
        folders: allFolders.length,
        starred: starredCount,
        shared: sharedCount,
        storageUsed: calculatedStorageUsed,
        storageLimit: userStorageLimit,
      });

      // Combine files and folders for recent items
      const allItems = [...allFiles, ...allFolders];
      
      // Recent items (last 8, both files and folders)
      const recent = [...allItems]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 8);
      setRecentItems(recent);

      // Quick access (starred files and folders)
      const starred = allItems.filter(item => item.isStarred).slice(0, 4);
      setQuickAccess(starred);

      // Suggested actions
      const suggestions = [];
      if (allFiles.length === 0) {
        suggestions.push({
          title: 'Upload your first file',
          description: 'Get started by uploading documents, photos, or videos',
          action: 'upload',
          icon: Upload,
          color: 'blue'
        });
      }
      if (allFolders.length === 0) {
        suggestions.push({
          title: 'Create a folder',
          description: 'Organize your files better with folders',
          action: 'createFolder',
          icon: FolderPlus,
          color: 'yellow'
        });
      }
      if (starredCount === 0 && allItems.length > 0) {
        suggestions.push({
          title: 'Star important files',
          description: 'Quick access to your most important items',
          action: 'starred',
          icon: Star,
          color: 'purple'
        });
      }
      if (sharedCount === 0 && allFiles.length > 3) {
        suggestions.push({
          title: 'Share with others',
          description: 'Collaborate by sharing files with your team',
          action: 'share',
          icon: Users,
          color: 'green'
        });
      }

      setSuggestedActions(suggestions.slice(0, 4));

    } catch (err) {
      console.error('Home data error:', err);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  const showToast = useCallback((type, message) => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast.info(message);
  }, [toast]);

  const {
    contextMenu,
    renameItem,
    moveItem,
    openContextMenu,
    closeContextMenu,
    openRenameModal,
    closeRenameModal,
    openMoveModal,
    closeMoveModal,
    handleDelete,
    handleRename,
    handleDownload,
    handleToggleStar,
  } = useFileOperations(fetchHomeData, showToast);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  // Listen for storage updates
  useEffect(() => {
    const handleStorageUpdate = () => {
      fetchHomeData();
    };
    
    window.addEventListener('storage-updated', handleStorageUpdate);
    window.addEventListener('file-uploaded', handleStorageUpdate);
    window.addEventListener('file-deleted', handleStorageUpdate);
    window.addEventListener('file-restored', handleStorageUpdate);
    
    return () => {
      window.removeEventListener('storage-updated', handleStorageUpdate);
      window.removeEventListener('file-uploaded', handleStorageUpdate);
      window.removeEventListener('file-deleted', handleStorageUpdate);
      window.removeEventListener('file-restored', handleStorageUpdate);
    };
  }, [fetchHomeData]);

  const handleActionClick = (action) => {
    switch(action) {
      case 'upload':
        fileInputRef.current?.click();
        break;
      case 'createFolder':
      case 'starred':
      case 'share':
        window.location.href = `/${action === 'createFolder' ? 'my-drive' : action}`;
        break;
      default:
        break;
    }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (response.ok) {
          toast.success(`${file.name} uploaded!`);
          window.dispatchEvent(new Event('storage-updated'));
        }
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    
    fetchHomeData();
    e.target.value = '';
  };

  const handleFolderClick = (folder) => {
    window.location.href = `/my-drive?folder=${folder.id}`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const storagePercent = (stats.storageUsed / stats.storageLimit) * 100;

  const getFileTypeIcon = (item) => {
    if (item.isFolder || item.mimeType === 'folder') {
      return <Folder className="w-4 h-4 text-yellow-500" />;
    }
    const mime = item.mimeType || '';
    if (mime.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (mime.startsWith('video/')) return <Video className="w-4 h-4" />;
    if (mime.startsWith('audio/')) return <Music className="w-4 h-4" />;
    if (mime.includes('zip') || mime.includes('rar')) return <Archive className="w-4 h-4" />;
    if (mime.includes('pdf')) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const quickStats = [
    { label: 'Files', value: stats.totalFiles, icon: FileText, link: '/my-drive' },
    { label: 'Folders', value: stats.folders, icon: FolderPlus, link: '/my-drive' },
    { label: 'Starred', value: stats.starred, icon: Star, link: '/starred' },
    { label: 'Shared', value: stats.shared, icon: Users, link: '/shared' },
  ];

  return (
    <>
      <div className="space-y-6" onClick={closeContextMenu}>
        {/* Header with Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Home</h1>
            <p className="text-gray-600 mt-1">Access and manage your files</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button
              onClick={() => window.location.href = '/my-drive'}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm"
            >
              <FolderPlus className="w-4 h-4" />
              New Folder
            </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={handleUpload}
        />

        {/* Quick Stats - Clickable Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStats.map((stat) => (
            <button
              key={stat.label}
              onClick={() => window.location.href = stat.link}
              className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all text-left group"
            >
              <div className="flex items-center justify-between mb-2">
                <stat.icon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 transition" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </button>
          ))}
        </div>

        {/* Storage Usage - Improved Design */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-50 rounded-lg">
                <HardDrive className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Storage</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatBytes(stats.storageUsed)} of {formatBytes(stats.storageLimit)} used
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-blue-600">
                {formatBytes(stats.storageLimit - stats.storageUsed)} free
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {storagePercent.toFixed(1)}%
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="relative">
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storagePercent >= 100 ? 'bg-red-500' :
                  storagePercent > 90 ? 'bg-red-500' :
                  storagePercent > 75 ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${Math.min(storagePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Warning Messages */}
          {storagePercent >= 100 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <span className="text-red-500 text-sm">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">Storage limit reached!</p>
                <p className="text-xs text-red-600 mt-0.5">Delete some files to free up space</p>
              </div>
            </div>
          )}

          {storagePercent > 80 && storagePercent < 100 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <span className="text-yellow-600 text-sm">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-700">Running out of storage</p>
                <p className="text-xs text-yellow-600 mt-0.5">Consider cleaning up unused files</p>
              </div>
            </div>
          )}
        </div>

        {/* Suggested Actions */}
        {suggestedActions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Suggested for you</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestedActions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleActionClick(suggestion.action)}
                  className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      suggestion.color === 'blue' ? 'bg-blue-100' :
                      suggestion.color === 'yellow' ? 'bg-yellow-100' :
                      suggestion.color === 'purple' ? 'bg-purple-100' :
                      'bg-green-100'
                    }`}>
                      <suggestion.icon className={`w-5 h-5 ${
                        suggestion.color === 'blue' ? 'text-blue-600' :
                        suggestion.color === 'yellow' ? 'text-yellow-600' :
                        suggestion.color === 'purple' ? 'text-purple-600' :
                        'text-green-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition">
                        {suggestion.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {suggestion.description}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition flex-shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Access */}
        {quickAccess.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Quick Access</h2>
              <button
                onClick={() => window.location.href = '/starred'}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {quickAccess.map((item) => {
                const isFolder = item.isFolder || item.mimeType === 'folder';
                return (
                  <div
                    key={item.id}
                    onClick={() => isFolder ? handleFolderClick(item) : setPreviewFile(item)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      openContextMenu(item, e.clientX, e.clientY);
                    }}
                    className="bg-white p-2 rounded-lg border border-gray-200 hover:shadow-md transition-all cursor-pointer group relative"
                  >
                    <div className="absolute top-1 right-1 flex gap-0.5 z-10">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openContextMenu(item, e.clientX, e.clientY);
                        }}
                        className="p-0.5 bg-white rounded-full shadow hover:shadow-md transition opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-2.5 h-2.5 text-gray-600" />
                      </button>
                    </div>
                    
                    <div className="aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 rounded mb-1.5 flex items-center justify-center overflow-hidden">
                      {isFolder ? (
                        <Folder className="w-8 h-8 text-yellow-500" />
                      ) : item.mimeType?.startsWith('image/') ? (
                        <img
                          src={`/api/files/${item.id}/download`}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <span className={item.mimeType?.startsWith('image/') && !isFolder ? 'hidden text-lg' : 'text-lg'}>
                        {isFolder ? '' : item.mimeType?.startsWith('image/') ? '🖼️' :
                         item.mimeType?.startsWith('video/') ? '🎥' :
                         item.mimeType?.startsWith('audio/') ? '🎵' :
                         item.mimeType === 'application/pdf' ? '📄' : '📄'}
                      </span>
                    </div>
                    
                    <p className="text-[10px] font-medium text-gray-900 truncate" title={item.name}>
                      {item.name}
                    </p>
                    <p className="text-[9px] text-gray-500">
                      {isFolder ? 'Folder' : formatBytes(item.size)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Recent</h2>
            <div className="flex items-center gap-2">
              <ViewToggle view={view} onViewChange={setView} />
              <button
                onClick={() => window.location.href = '/my-drive'}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View all
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : recentItems.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No files yet</h3>
              <p className="text-gray-500 mb-4">Upload your first file to get started</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Upload File
              </button>
            </div>
          ) : (
            <>
              {view === 'grid' && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {recentItems.map((item) => (
                    <FileCard
                      key={item.id}
                      item={item}
                      onToggleStar={handleToggleStar}
                      onDownload={handleDownload}
                      onPreview={setPreviewFile}
                      onShare={setShareFile}
                      onFolderClick={handleFolderClick}
                      openContextMenu={openContextMenu}
                    />
                  ))}
                </div>
              )}

              {view === 'list' && (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {recentItems.map((item) => {
                    const isFolder = item.isFolder || item.mimeType === 'folder';
                    return (
                      <div
                        key={item.id}
                        className="flex items-center px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 group cursor-pointer"
                        onClick={() => isFolder ? handleFolderClick(item) : setPreviewFile(item)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          openContextMenu(item, e.clientX, e.clientY);
                        }}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-gray-100 rounded">
                            {getFileTypeIcon(item)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {isFolder ? 'Folder' : formatBytes(item.size)}
                            </p>
                          </div>
                        </div>
                        
                        {!isFolder && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStar(item.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition"
                          >
                            <Star className={`w-4 h-4 ${item.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {shareFile && (
        <ShareModal
          file={shareFile}
          onClose={() => setShareFile(null)}
          onShared={fetchHomeData}
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
        onMove={openMoveModal}
        onOpenFolder={handleFolderClick}
        showOpenFolder={true}
      />

      <RenameModal
        item={renameItem}
        onClose={closeRenameModal}
        onRename={handleRename}
      />

      {moveItem && (
        <MoveModal
          items={moveItem}
          onClose={closeMoveModal}
          onMove={async () => {
            await fetchHomeData();
            closeMoveModal();
          }}
        />
      )}
    </>
  );
}