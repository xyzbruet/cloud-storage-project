import { ChevronRight } from 'lucide-react'

export default function Breadcrumb({ path = [], onNavigate }) {
  if (path.length === 0) {
    return (
      <span className="text-sm font-medium text-gray-700">
        My Drive
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1 text-sm text-gray-600 overflow-x-auto whitespace-nowrap">
      <span
        role="button"
        tabIndex={0}
        className="cursor-pointer hover:underline font-medium text-gray-700"
        onClick={() => onNavigate(null)}
        onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') onNavigate(null) }}
      >
        My Drive
      </span>

      {path.map((folder, index) => {
        const isLast = index === path.length - 1

        return (
          <div key={folder.id} className="flex items-center gap-1">
            <ChevronRight className="w-4 h-4 text-gray-400" />
            {isLast ? (
              <span className="font-medium text-gray-800 truncate max-w-[150px]" title={folder.name}>
                {folder.name}
              </span>
            ) : (
              <span
                role="button"
                tabIndex={0}
                className="cursor-pointer hover:underline text-gray-700 truncate max-w-[150px]"
                title={folder.name}
                onClick={() => onNavigate(folder, index)}
                onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') onNavigate(folder, index) }}
              >
                {folder.name}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
