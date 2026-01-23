import api from './api'

export const fileService = {
  getFiles: async (folderId = null) => {
    const params = folderId ? { folderId } : {}
    const response = await get('/files', { params })
    return response.data
  },

  uploadFile: async (file, folderId = null, onProgress) => {
    const formData = new FormData()
    formData.append('file', file)
    if (folderId) formData.append('folderId', folderId)

    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          onProgress?.(progress)
        }
      },
    })
    return response.data
  },

  downloadFile: async (fileId) => {
    const response = await get(`/files/${fileId}/download`, {
      responseType: 'blob',
    })
    return response.data
  },

  deleteFile: async (fileId) => {
    const response = await delete(`/files/${fileId}`)
    return response.data
  },

  starFile: async (fileId) => {
    const response = await post(`/files/${fileId}/star`)
    return response.data
  },

  searchFiles: async (query) => {
    const response = await get('/files/search', { params: { q: query } })
    return response.data
  },

  getStarredFiles: async () => {
    const response = await get('/files/starred')
    return response.data
  },

  getTrash: async () => {
    const response = await get('/files/trash')
    return response.data
  },

  restoreFile: async (fileId) => {
    const response = await post(`/files/${fileId}/restore`)
    return response.data
  },
}