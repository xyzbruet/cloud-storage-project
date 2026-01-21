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
  Clock
} from 'lucide-react';

export default function FileListItem({ 
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
  showSharedBadges = false,
  showPermissionBadge = false,
  ownerEmail = null,
  customActions = null
}) {
  const isFolder = item.isFolder || item.mimeType === 'folder';

  const getFileIcon = (item) => {
    if (isFolder) return '📁';
    const mimeType = item.mimeType;
    if (mimeType?.startsWith('image/')) return '🖼️';
    if (mimeType?.startsWith('video/')) return '🎥';
    if (mimeType?.startsWith('audio/')) return '🎵';
    if (mimeType === 'application/pdf') return '📄';
    if (mimeType?.includes('word')) return '📝';
    if (mimeType?.includes('excel') || mimeType?.includes('sheet')) return '📊';
    if (mimeType?.includes('presentation')) return '📊';
    if (mimeType?.includes('zip') || mimeType?.includes('rar')) return '📦';
    return '📄';
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

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={onContextMenu}
      className="flex items-center px-6 py-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer group transition-colors"
    >
      {/* Star button - Fixed width */}
      <div className="w-10 flex items-center justify-center flex-shrink-0">
        {!isFolder && onToggleStar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(item.id);
            }}
            className="p-1"
          >
            <Star
              className={`w-5 h-5 ${
                item.isStarred 
                  ? 'text-yellow-500 fill-yellow-500' 
                  : 'text-gray-300 hover:text-gray-400'
              }`}
            />
          </button>
        )}
      </div>

      {/* Icon & Name - Flexible width */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* File/Folder icon */}
        <div className="flex-shrink-0">
          {isFolder ? (
            <Folder className="w-6 h-6 text-yellow-500" />
          ) : item.mimeType?.startsWith('image/') ? (
            <img
              src={`/api/files/${item.id}/download`}
              alt={item.name}
              className="w-6 h-6 object-cover rounded"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}
          {!isFolder && (!item.mimeType?.startsWith('image/') || true) && (
            <span className="text-xl flex items-center justify-center">{getFileIcon(item)}</span>
          )}
        </div>

        {/* Name & badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm text-gray-900 truncate">
              {item.name}
            </p>
            
            {/* Badges */}
            {showPermissionBadge && item.permission === 'edit' && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                <Edit className="w-3 h-3" />
                Edit
              </span>
            )}
            
            {showPermissionBadge && item.permission === 'view' && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                <Eye className="w-3 h-3" />
                View
              </span>
            )}

            {showSharedBadges && item.hasPublicLink && (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                <Link2 className="w-3 h-3" />
              </span>
            )}
          </div>
          
          {ownerEmail && (
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Users className="w-3 h-3" />
              {ownerEmail}
            </p>
          )}
        </div>
      </div>

      {/* Shared - Fixed width, centered */}
      <div className="hidden md:flex items-center justify-center w-56 flex-shrink-0">
        {showSharedBadges && item.sharedWithCount > 0 ? (
          <p className="text-sm text-gray-600 flex items-center gap-1">
            <Users className="w-4 h-4 text-green-600" />
            {item.sharedWithCount} {item.sharedWithCount === 1 ? 'person' : 'people'}
          </p>
        ) : ownerEmail ? (
          <p className="text-sm text-gray-600 truncate">{ownerEmail}</p>
        ) : (
          <p className="text-sm text-gray-500">Me</p>
        )}
      </div>

      {/* Modified - Fixed width, right-aligned */}
      <div className="hidden lg:flex items-center justify-end w-48 flex-shrink-0">
        <p className="text-sm text-gray-600 flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          {formatDate(item.updatedAt || item.createdAt)}
        </p>
      </div>

      {/* Size - Fixed width, right-aligned */}
      <div className="hidden xl:flex items-center justify-end w-32 flex-shrink-0">
        <p className="text-sm text-gray-600">
          {isFolder ? '—' : formatSize(item.size)}
        </p>
      </div>

      {/* Actions - Fixed width */}
      <div className="flex items-center justify-end gap-1 w-16 flex-shrink-0">
        {/* Quick actions - hidden by default, show on hover */}
        {!isFolder && customActions ? (
          customActions(item)
        ) : !isFolder ? (
          <>
            {onShare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare(item);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition opacity-0 group-hover:opacity-100"
                title="Share"
              >
                <Share2 className="w-4 h-4 text-gray-600" />
              </button>
            )}
            {onDownload && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload(item);
                }}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition opacity-0 group-hover:opacity-100"
                title="Download"
              >
                <Download className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </>
        ) : null}

        {/* Context menu - always visible */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            openContextMenu(item, e.clientX, e.clientY);
          }}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition"
        >
          <MoreVertical className="w-4 h-4 text-gray-600" />
        </button>
      </div>
    </div>
  );
}