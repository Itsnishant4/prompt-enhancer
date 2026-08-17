import { useState, useEffect, useCallback } from 'react';
import type { HistoryEntry } from '@shared/types';
import { useToast } from '../components/Toast';

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { show } = useToast();

  const loadHistory = useCallback(async (append = false) => {
    setLoading(true);
    try {
      const data = searchQuery
        ? await window.electronAPI.history.search(searchQuery, 20)
        : await window.electronAPI.history.get(20, page * 20);
      
      if (append) {
        setHistory(prev => [...prev, ...data]);
      } else {
        setHistory(data);
      }
      setHasMore(data.length === 20);
    } catch (error) {
      console.error('Failed to load history:', error);
      show('error', 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, show]);

  useEffect(() => {
    setPage(0);
    loadHistory(false);
  }, [searchQuery, loadHistory]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);

  const deleteEntry = useCallback(async (id: number) => {
    try {
      await window.electronAPI.history.delete(id);
      setHistory(prev => prev.filter(entry => entry.id !== id));
      show('success', 'Entry deleted');
    } catch (error) {
      console.error('Failed to delete entry:', error);
      show('error', 'Failed to delete entry');
    }
  }, [show]);

  const clearHistory = useCallback(async () => {
    try {
      await window.electronAPI.history.clear();
      setHistory([]);
      show('success', 'History cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
      show('error', 'Failed to clear history');
    }
  }, [show]);

  return {
    history,
    loading,
    hasMore,
    searchQuery,
    setSearchQuery,
    loadMore,
    deleteEntry,
    clearHistory,
    refresh: () => loadHistory(false),
  };
}