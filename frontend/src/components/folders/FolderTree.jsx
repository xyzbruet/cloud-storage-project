import { useQuery } from '@tanstack/react-query'
import { folderService } from '../../services/folderService'
import { Folder } from 'lucide-react'

export default function FolderTree({ onFolderClick }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['folders'],
    queryFn: folderService.getRootFolders,
  })

  if (isLoading) {
    return <p className="text-sm text-gray-500">Loading folders...</p>
  }

  if (isError) {
    return <p className="text-sm text-red-500">Error loading folders: {error.message}</p>
  }

  const folders = data?.data || []

  if (folders.length === 0) {
    return <p className="text-sm text-gray-400">No folders</p>
  }

  return (
    <div className="space-y-1">
      {folders.map(folder => (
        <div
          key={folder.id}
          onClick={() => onFolderClick(folder)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') onFolderClick(folder)
          }}
          tabIndex={0}
          className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <Folder className="w-4 h-4 text-blue-600" />
          <span className="text-sm">{folder.name}</span>
        </div>
      ))}
    </div>
  )
}
