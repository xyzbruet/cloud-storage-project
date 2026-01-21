import { create } from 'zustand'

export const useFileStore = create((set) => ({
  files: [],
  currentFolder: null,
  selectedFiles: [],

  setFiles: (files) => set({ files }),
  
  setCurrentFolder: (folder) => set({ currentFolder: folder }),
  
  addFile: (file) => set((state) => ({ 
    files: [...state.files, file] 
  })),
  
  removeFile: (fileId) => set((state) => ({ 
    files: state.files.filter(f => f.id !== fileId) 
  })),
  
  toggleFileSelection: (fileId) => set((state) => {
    const isSelected = state.selectedFiles.includes(fileId)
    return {
      selectedFiles: isSelected
        ? state.selectedFiles.filter(id => id !== fileId)
        : [...state.selectedFiles, fileId]
    }
  }),
  
  clearSelection: () => set({ selectedFiles: [] }),
}))