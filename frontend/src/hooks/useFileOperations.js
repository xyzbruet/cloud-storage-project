// hooks/useFileOperations.js
import { useState } from 'react';
import folderService from '../services/folderService';

export default function useFileOperations(fetchData, showToast) {
  const [contextMenu, setContextMenu] = useState(null);
  const [renameItem, setRenameItem] = useState(null);
  const [moveItem, setMoveItem] = useState(null);

  const getAuthToken = () => {
    return (
      localStorage.getItem('token') ||
      localStorage.getItem('authToken') ||
      sessionStorage.getItem('token') ||
      sessionStorage.getItem('authToken')
    );
  };

  const handleDelete = async (item) => {
    const isFolder = item.isFolder || item.mimeType === 'folder';
    if (
      !confirm(
        `Are you sure you want to delete "${item.name}"? This will move it to trash.`
      )
    ) {
      return;
    }

    try {
      const token = getAuthToken();
      
      if (isFolder) {
        // Use folder service for folders
        await folderService.deleteFolder(item.id);
      } else {
        // Use file API for files
        const endpoint = `/api/files/${item.id}`;
        const response = await fetch(endpoint, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!response.ok) throw new Error('Delete failed');
      }

      showToast?.(
        'success',
        `${isFolder ? 'Folder' : 'File'} moved to trash`
      );
      await fetchData?.();
    } catch (err) {
      console.error('Delete failed', err);
      showToast?.('error', 'Delete failed: ' + err.message);
    }
  };

  const handleRename = async (item, newName) => {
    if (!newName.trim()) {
      showToast?.('warning', 'Please enter a name');
      return;
    }

    const isFolder = item.isFolder || item.mimeType === 'folder';

    try {
      if (isFolder) {
        // Use folder service for folders
        await folderService.renameFolder(item.id, newName);
      } else {
        // Use file API for files
        const token = getAuthToken();
        const endpoint = `/api/files/${item.id}`;
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ name: newName }),
        });

        if (!response.ok) throw new Error('Rename failed');
      }

      showToast?.(
        'success',
        `${isFolder ? 'Folder' : 'File'} renamed successfully!`
      );
      await fetchData?.();
    } catch (err) {
      console.error('Rename failed', err);
      showToast?.('error', 'Rename failed: ' + err.message);
    }
  };

  const handleMove = async (items, targetFolderId) => {
    // Support both single item and array of items
    const itemsArray = Array.isArray(items) ? items : [items];
    
    try {
      const token = getAuthToken();
      let successCount = 0;
      let errorCount = 0;

      for (const item of itemsArray) {
        const isFolder = item.isFolder || item.mimeType === 'folder';
        
        try {
          if (isFolder) {
            // Use PATCH for folders - update parentId
            const response = await fetch(`/api/folders/${item.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ parentId: targetFolderId }),
            });

            if (!response.ok) throw new Error('Move failed');
          } else {
            // Use PUT for files - update folderId
            const response = await fetch(`/api/files/${item.id}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ 
                folderId: targetFolderId,
                name: item.name // Keep the same name
              }),
            });

            if (!response.ok) throw new Error('Move failed');
          }
          successCount++;
        } catch (err) {
          console.error(`Failed to move ${item.name}:`, err);
          errorCount++;
        }
      }

      if (successCount > 0) {
        showToast?.(
          'success',
          `Successfully moved ${successCount} item${successCount > 1 ? 's' : ''}`
        );
        await fetchData?.();
      }

      if (errorCount > 0) {
        showToast?.(
          'error',
          `Failed to move ${errorCount} item${errorCount > 1 ? 's' : ''}`
        );
      }

      return { successCount, errorCount };
    } catch (err) {
      console.error('Move operation failed', err);
      showToast?.('error', 'Move operation failed: ' + err.message);
      return { successCount: 0, errorCount: itemsArray.length };
    }
  };

  const handleDownload = async (file) => {
    // Folders can't be downloaded individually
    if (file.isFolder || file.mimeType === 'folder') {
      showToast?.('warning', 'Cannot download folders');
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/files/${file.id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast?.('success', 'File downloaded successfully!');
    } catch (error) {
      console.error('Download failed', error);
      showToast?.('error', 'Download failed: ' + error.message);
    }
  };

  const handleToggleStar = async (fileId) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/files/${fileId}/star`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) throw new Error('Star toggle failed');

      await fetchData?.();
    } catch (err) {
      console.error('Star toggle failed', err);
      showToast?.('error', 'Failed to toggle star');
    }
  };

  const openContextMenu = (item, x, y) => {
    setContextMenu({ item, x, y });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const openRenameModal = (item) => {
    setRenameItem(item);
    closeContextMenu();
  };

  const closeRenameModal = () => {
    setRenameItem(null);
  };

  const openMoveModal = (item) => {
    setMoveItem(item);
    closeContextMenu();
  };

  const closeMoveModal = () => {
    setMoveItem(null);
  };

  return {
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
    handleMove,
    handleDownload,
    handleToggleStar,
  };
}