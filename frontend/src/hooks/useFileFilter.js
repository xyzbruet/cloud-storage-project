import { useState } from 'react';

export function useFileFilter(items = []) {
  const [filters, setFilters] = useState({
    type: 'all',
    people: 'all',
    modified: 'all',
    source: 'all',
    starred: 'all'
  });

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      type: 'all',
      people: 'all',
      modified: 'all',
      source: 'all',
      starred: 'all'
    });
  };

  const getFilteredItems = () => {
    return items.filter(item => {
      const isFolder = item.isFolder || item.mimeType === 'folder';

      // Type filter
      if (filters.type !== 'all') {
        if (filters.type === 'folders' && !isFolder) return false;
        if (filters.type === 'images' && (!item.mimeType?.startsWith('image/') || isFolder)) return false;
        if (filters.type === 'videos' && (!item.mimeType?.startsWith('video/') || isFolder)) return false;
        if (filters.type === 'documents') {
          const docTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
          if (!docTypes.includes(item.mimeType) && !item.mimeType?.includes('word') && !item.mimeType?.includes('document')) return false;
        }
        if (filters.type === 'audio' && (!item.mimeType?.startsWith('audio/') || isFolder)) return false;
      }

      // People filter
      if (filters.people !== 'all') {
        if (filters.people === 'me' && item.ownerEmail) return false;
        if (filters.people === 'others' && !item.ownerEmail) return false;
      }

      // Modified filter
      if (filters.modified !== 'all') {
        const now = new Date();
        const itemDate = new Date(item.updatedAt || item.createdAt);
        const diffDays = Math.floor((now - itemDate) / (1000 * 60 * 60 * 24));

        if (filters.modified === 'today' && diffDays > 0) return false;
        if (filters.modified === 'week' && diffDays > 7) return false;
        if (filters.modified === 'month' && diffDays > 30) return false;
        if (filters.modified === 'year' && diffDays > 365) return false;
      }

      // Source filter
      if (filters.source !== 'all') {
        if (filters.source === 'owned' && item.ownerEmail) return false;
        if (filters.source === 'shared' && !item.ownerEmail && !item.sharedWith?.length) return false;
      }

      // Starred filter
      if (filters.starred !== 'all') {
        if (filters.starred === 'starred' && !item.isStarred) return false;
        if (filters.starred === 'not-starred' && item.isStarred) return false;
      }

      return true;
    });
  };

  const hasActiveFilters = () => {
    return Object.values(filters).some(value => value !== 'all');
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value !== 'all').length;
  };

  return {
    filters,
    updateFilter,
    resetFilters,
    getFilteredItems,
    hasActiveFilters,
    getActiveFilterCount
  };
}
