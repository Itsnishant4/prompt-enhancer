import { useCallback } from 'react';

export function windowControls() {
  const minimize = useCallback(() => {
    window.electronAPI.window.minimize();
  }, []);

  const maximize = useCallback(() => {
    window.electronAPI.window.maximize();
  }, []);

  const close = useCallback(() => {
    window.electronAPI.window.close();
  }, []);

  const checkMaximized = useCallback(async () => {
    return window.electronAPI.window.isMaximized();
  }, []);

  return { minimize, maximize, close, checkMaximized };
}