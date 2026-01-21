import { useState } from 'react';
import { ChevronDown, Filter, X } from 'lucide-react';

function FilterDropdown({ label, value, options, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition text-sm ${
          value !== 'all'
            ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <span>{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm transition ${
                  value === option.value
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FilterBar({ 
  filters, 
  updateFilter, 
  resetFilters, 
  hasActiveFilters,
  getActiveFilterCount,
  config = {} 
}) {
  const {
    showType = true,
    showPeople = false,
    showModified = true,
    showSource = false,
    showStarred = false
  } = config;

  const typeOptions = [
    { value: 'all', label: 'All types' },
    { value: 'folders', label: 'Folders' },
    { value: 'images', label: 'Images' },
    { value: 'videos', label: 'Videos' },
    { value: 'documents', label: 'Documents' },
    { value: 'audio', label: 'Audio' }
  ];

  const peopleOptions = [
    { value: 'all', label: 'All people' },
    { value: 'me', label: 'Owned by me' },
    { value: 'others', label: 'Shared by others' }
  ];

  const modifiedOptions = [
    { value: 'all', label: 'Any time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This week' },
    { value: 'month', label: 'This month' },
    { value: 'year', label: 'This year' }
  ];

  const sourceOptions = [
    { value: 'all', label: 'All sources' },
    { value: 'owned', label: 'My files' },
    { value: 'shared', label: 'Shared with me' }
  ];

  const starredOptions = [
    { value: 'all', label: 'All files' },
    { value: 'starred', label: 'Starred only' },
    { value: 'not-starred', label: 'Not starred' }
  ];

  const activeCount = getActiveFilterCount ? getActiveFilterCount() : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="font-medium text-gray-900 text-sm">Filters</span>
          {hasActiveFilters() && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
              {activeCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {showType && (
            <FilterDropdown
              label="Type"
              value={filters.type}
              options={typeOptions}
              onChange={(value) => updateFilter('type', value)}
            />
          )}
          {showPeople && (
            <FilterDropdown
              label="People"
              value={filters.people}
              options={peopleOptions}
              onChange={(value) => updateFilter('people', value)}
            />
          )}
          {showModified && (
            <FilterDropdown
              label="Modified"
              value={filters.modified}
              options={modifiedOptions}
              onChange={(value) => updateFilter('modified', value)}
            />
          )}
          {showSource && (
            <FilterDropdown
              label="Source"
              value={filters.source}
              options={sourceOptions}
              onChange={(value) => updateFilter('source', value)}
            />
          )}
          {showStarred && (
            <FilterDropdown
              label="Starred"
              value={filters.starred}
              options={starredOptions}
              onChange={(value) => updateFilter('starred', value)}
            />
          )}

          {hasActiveFilters() && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition border border-transparent hover:border-red-200"
            >
              <X className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

