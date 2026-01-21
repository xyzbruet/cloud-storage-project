import api from './api'

export const dashboardService = {
  getDashboard: async () => {
    try {
      // Fetch all required data
      const [filesRes, foldersRes, starredRes] = await Promise.all([
        api.get('/files'),
        api.get('/folders'),
        api.get('/files/starred'),
      ])

      const files = filesRes.data.data || []
      const folders = foldersRes.data.data || []
      const starred = starredRes.data.data || []

      // Sort files by created date
      const recentFiles = [...files]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)

      return {
        data: {
          totalFiles: files.length,
          folders: folders.length,
          starred: starred.length,
          recentFiles: recentFiles,
        },
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error)
      throw error
    }
  },
}