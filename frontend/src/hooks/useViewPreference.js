import { useState, useEffect } from 'react';

export function useViewPreference(pageKey = 'default') {
  const storageKey = `fileView_${pageKey}`;
  
  const [view, setView] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved || 'grid';
  });

  const changeView = (newView) => {
    setView(newView);
    localStorage.setItem(storageKey, newView);
  };

  return [view, changeView];
}
