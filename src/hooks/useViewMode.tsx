import { useState, useEffect, useCallback } from 'react';

export type ViewMode = 'grid' | 'tiktok';

const STORAGE_KEY = 'ms-view-mode';

export const useViewMode = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored as ViewMode) || 'grid';
    }
    return 'grid';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, viewMode);
  }, [viewMode]);

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'grid' ? 'tiktok' : 'grid');
  }, []);

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
    isGridView: viewMode === 'grid',
    isTikTokView: viewMode === 'tiktok',
  };
};
