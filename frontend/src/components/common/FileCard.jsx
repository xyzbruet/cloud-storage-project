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
  FolderOpen
} from 'lucide-react';

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
        {/* Custom badges in top right */}
        {topRightCustomBadges && topRightCustomBadges(item)}

        {/* Standard badges */}
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

        {/* Star button for files - before context menu */}
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

        {/* Context menu button - always last */}
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
        {/* Custom badges in top left */}
        {topLeftCustomBadges && topLeftCustomBadges(item)}
        
        {/* Permission badges */}
        {showPermissionBadge && item.permission && (
          <>
            {item.permission === 'edit' && (
              <div className="px-1.5 py-0.5 bg-green-500 text-white text-[8px] rounded-full flex items-center gap-0.5 shadow-sm">
                <Edit className="w-2 h-2" />
                <span>Edit</span>
              </div>
            )}

            {item.permission === 'view' && (
              <div className="px-1.5 py-0.5 bg-blue-500 text-white text-white text-[8px] rounded-full flex items-center gap-0.5 shadow-sm">
                <Eye className="w-2 h-2" />
                <span>View</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview/Icon Area */}
      <div className="aspect-square rounded-md mb-1.5 flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50">
        {isFolder ? (
          <div className="relative">
            <Folder className="w-12 h-12 text-yellow-500" />
          </div>
        ) : item.mimeType?.startsWith('image/') ? (
          <>
            <img
              src={`/api/files/${item.id}/download`}
              alt={item.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex';
              }}
            />
            <span className="hidden text-2xl">
              {getFileIcon(item)}
            </span>
          </>
        ) : (
          <span className="text-2xl">
            {getFileIcon(item)}
          </span>
        )}
      </div>

      {/* File Info */}
      <div className="space-y-1">
        <h3 className="font-medium text-gray-900 truncate text-xs leading-tight" title={item.name}>
          {item.name}
        </h3>

        {/* Metadata Line */}
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

        {/* Quick Actions - Custom or Default */}
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