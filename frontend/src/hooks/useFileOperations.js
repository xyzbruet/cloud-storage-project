// hooks/useFileOperations.js
import { useState } from 'react';
import api from '../services/api';
import folderService from '../services/folderService';

export default function useFileOperations(fetchData, showToast) {
  const [contextMenu, setContextMenu] = useState(null);
  const [renameItem, setRenameItem] = useState(null);
  const [moveItem, setMoveItem] = useState(null);

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
      if (isFolder) {
        // Use folder service for folders
        await folderService.deleteFolder(item.id);
      } else {
        // Use API client for files
        await api.delete(`/files/${item.id}`);
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
        // Use API client for files
        await api.put(`/files/${item.id}`, { name: newName });
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
      let successCount = 0;
      let errorCount = 0;

      for (const item of itemsArray) {
        const isFolder = item.isFolder || item.mimeType === 'folder';
        
        try {
          if (isFolder) {
            // Use PATCH for folders - update parentId
            await api.patch(`/folders/${item.id}`, { 
              parentId: targetFolderId 
            });
          } else {
            // Use PUT for files - update folderId
            await api.put(`/files/${item.id}`, { 
              folderId: targetFolderId,
              name: item.name // Keep the same name
            });
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
      const response = await api.get(`/files/${file.id}/download`, {
        responseType: 'blob'
      });

      // Create blob URL and trigger download
      const blob = new Blob([response.data]);
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
      await api.post(`/files/${fileId}/star`);
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