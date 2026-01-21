import {
  Eye,
  Share2,
  Download,
  Star,
  Edit2,
  Trash2,
  FolderOpen,
  FolderInput
} from 'lucide-react';
import { memo, useCallback, useEffect, useRef } from 'react';

const FileContextMenu = memo(({
  contextMenu,
  onClose,
  onPreview,
  onShare,
  onDownload,
  onToggleStar,
  onRename,
  onDelete,
  onMove,
  onOpenFolder,
  showPreview = true,
  showShare = true,
  showDownload = true,
  showStar = true,
  showRename = true,
  showDelete = true,
  showMove = true,
  showOpenFolder = false
}) => {
  const menuRef = useRef(null);

  const handleAction = useCallback((action) => {
    if (action && contextMenu?.item) {
      action(contextMenu.item);
    }
    onClose();
  }, [contextMenu?.item, onClose]);

  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenu, onClose]);

  useEffect(() => {
    if (!contextMenu || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = contextMenu.x;
    let adjustedY = contextMenu.y;

    if (rect.right > viewportWidth) {
      adjustedX = viewportWidth - rect.width - 10;
    }

    if (rect.bottom > viewportHeight) {
      adjustedY = viewportHeight - rect.height - 10;
    }

    adjustedX = Math.max(10, adjustedX);
    adjustedY = Math.max(10, adjustedY);

    if (adjustedX !== contextMenu.x || adjustedY !== contextMenu.y) {
      menu.style.left = `${adjustedX}px`;
      menu.style.top = `${adjustedY}px`;
    }
  }, [contextMenu]);

  if (!contextMenu) return null;

  const { item, x, y } = contextMenu;
  const isFolder = item?.isFolder || item?.mimeType === 'folder';

  const MenuItem = ({ onClick, icon: Icon, label, className = '', iconClassName = 'text-gray-600' }) => (
    <button
      onClick={() => handleAction(onClick)}
      className={`w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center gap-3 text-sm transition-colors ${className}`}
    >
      <Icon className={`w-4 h-4 ${iconClassName}`} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );

  const Divider = () => <div className="h-px bg-gray-200 my-1" role="separator" />;

  const hasFileOptions = !isFolder && (
    (showPreview && onPreview) || 
    (showDownload && onDownload) || 
    (showStar && onToggleStar)
  );

  const hasFolderOptions = isFolder && showOpenFolder && onOpenFolder;
  const hasCommonOptions = (showMove && onMove) || (showRename && onRename) || (showDelete && onDelete);

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="File actions menu"
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-200 py-2 z-50 min-w-[180px] animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: `${x}px`,
        top: `${y}px`
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* File-only options */}
      {!isFolder && (
        <>
          {showPreview && onPreview && (
            <MenuItem
              onClick={onPreview}
              icon={Eye}
              label="Preview"
            />
          )}

          {showDownload && onDownload && (
            <MenuItem
              onClick={onDownload}
              icon={Download}
              label="Download"
              iconClassName="text-blue-600"
            />
          )}

          {showStar && onToggleStar && (
            <MenuItem
              onClick={onToggleStar}
              icon={Star}
              label={item.isStarred ? 'Unstar' : 'Star'}
              iconClassName={item.isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-gray-600'}
            />
          )}

          {hasFileOptions && showShare && onShare && <Divider />}
        </>
      )}

      {/* Folder-only options */}
      {hasFolderOptions && (
        <>
          <MenuItem
            onClick={onOpenFolder}
            icon={FolderOpen}
            label="Open"
            iconClassName="text-yellow-600"
          />
          {showShare && onShare && <Divider />}
        </>
      )}

      {/* Share - Available for both files and folders */}
      {showShare && onShare && (
        <MenuItem
          onClick={onShare}
          icon={Share2}
          label="Share"
          iconClassName="text-green-600"
        />
      )}

      {/* Common options for both files and folders */}
      {(hasFileOptions || hasFolderOptions || (showShare && onShare)) && hasCommonOptions && (
        <Divider />
      )}

      {showMove && onMove && (
        <MenuItem
          onClick={onMove}
          icon={FolderInput}
          label="Move to..."
          iconClassName="text-purple-600"
        />
      )}

      {showRename && onRename && (
        <MenuItem
          onClick={onRename}
          icon={Edit2}
          label="Rename"
          iconClassName="text-orange-600"
        />
      )}

      {showDelete && onDelete && (
        <MenuItem
          onClick={onDelete}
          icon={Trash2}
          label="Delete"
          className="text-red-600"
          iconClassName="text-red-600"
        />
      )}
    </div>
  );
});

FileContextMenu.displayName = 'FileContextMenu';

export default FileContextMenu;