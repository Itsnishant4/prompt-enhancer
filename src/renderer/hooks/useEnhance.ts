import { useState, useCallback } from 'react';
import type { EnhanceResponse } from '@shared/types';
import { useToast } from '../components/Toast';
import { useSettings } from './useSettings';

export function useEnhance() {
  const [enhancing, setEnhancing] = useState(false);
  const { show } = useToast();
  const { settings } = useSettings();

  const enhancePrompt = useCallback(async (text: string): Promise<EnhanceResponse | null> => {
    if (!text.trim()) return null;
    
    setEnhancing(true);
    try {
      if (settings?.useLocalModel && settings?.localModelName) {
        // Call the native main process AI engine via IPC
        const result = await window.electronAPI.enhance.prompt(text);
        return result;
      } else {
        throw new Error('Local model is not enabled or configured.');
      }
    } catch (error) {
      console.error('Enhancement failed:', error);
      show('error', 'Enhancement failed', error instanceof Error ? error.message : 'Unknown error');
      return null;
    } finally {
      setEnhancing(false);
    }
  }, [show, settings]);

  return {
    enhancePrompt,
    enhancing,
  };
}