import { useState, useEffect, useCallback } from 'react';

export interface ProductivityStats {
  totalRuns: number;
  fallbackCount: number;
  timeSavedMinutes: number;
}

export function useStats() {
  const [stats, setStats] = useState<ProductivityStats | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.history.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStats({ totalRuns: 0, fallbackCount: 0, timeSavedMinutes: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  return { stats, loading, refresh };
}
