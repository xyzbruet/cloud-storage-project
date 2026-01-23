// services/folderService.js
import api from './api'

export const folderService = {
  // ================= FOLDER LISTING =================
  getRootFolders: async () => {
    const response = await api.get('/folders')
    return response.data
  },

  getSubFolders: async (parentId) => {
    const response = await api.get(`/folders/${parentId}/subfolders`)
    return response.data
  },

  // ================= FOLDER MANAGEMENT =================
  createFolder: async (name, parentId) => {
    const response = await api.post('/folders', {
      name,
      parentId: parentId || null,
    })
    return response.data
  },

  renameFolder: async (folderId, newName) => {
    const response = await api.put(`/folders/${folderId}`, {
      name: newName,
    })
    return response.data
  },

  deleteFolder: async (folderId) => {
    const response = await api.delete(`/folders/${folderId}`)
    return response.data
  },

  // ================= MOVE/ORGANIZE =================
  moveFolder: async (folderId, targetParentId) => {
    const response = await api.patch(`/folders/${folderId}`, {
      parentId: targetParentId,
    })
    return response.data
  },

  // ================= TRASH OPERATIONS =================
  restoreFolder: async (folderId) => {
    const response = await api.post(`/folders/${folderId}/restore`)
    return response.data
  },

  getTrashFolders: async () => {
    const response = await api.get('/folders/trash')
    return response.data
  },

  permanentlyDeleteFolder: async (folderId) => {
    const response = await api.delete(`/folders/${folderId}/permanent`)
    return response.data
  },

  // ================= SHARING =================
  shareFolder: async (folderId, email, permission) => {
    const response = await api.post(`/folders/${folderId}/share`, {
      email,
      permission,
    })
    return response.data
  },

  generateShareLink: async (folderId) => {
    const response = await api.post(`/folders/${folderId}/share-link`);
    console.log('✅ Share link generated:', response.data);
    return response.data;
  },

  getShareLink: async (folderId) => {
    const response = await api.get(`/folders/${folderId}/share-link`);
    console.log('✅ Retrieved share link:', response.data);
    return response.data;
  },

  getSharedFolder: async (token) => {
    const response = await api.get(`/folders/shared-link/${token}`);
    return response.data;
  },

  revokeShareLink: async (folderId) => {
    const response = await api.delete(`/folders/${folderId}/share-link`)
    return response.data
  },

  revokeShare: async (folderId, shareId) => {
    const response = await api.delete(`/folders/${folderId}/shares/${shareId}`)
    return response.data
  },

  updateSharePermission: async (folderId, shareId, permission) => {
    const response = await api.patch(`/folders/${folderId}/shares/${shareId}`, {
      permission,
    })
    return response.data
  },

  removeAllAccess: async (folderId) => {
    const response = await api.delete(`/folders/${folderId}/shares/all`)
    return response.data
  },
}

export default folderService