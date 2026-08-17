import { useState, useEffect, useCallback } from 'react';
import type { Settings } from '@shared/types';
import { useToast } from '../components/Toast';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { show } = useToast();

  const loadSettings = useCallback(async () => {
    try {
      const data = await window.electronAPI.settings.get();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
      show('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, [show]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveSettings = useCallback(async (newSettings: Partial<Settings>) => {
    setSaving(true);
    try {
      const saved = await window.electronAPI.settings.save(newSettings);
      setSettings(saved);
      show('success', 'Settings saved');
      return saved;
    } catch (error) {
      console.error('Failed to save settings:', error);
      show('error', 'Failed to save settings');
      throw error;
    } finally {
      setSaving(false);
    }
  }, [show]);

  return {
    settings,
    loading,
    saving,
    loadSettings,
    saveSettings,
  };
}