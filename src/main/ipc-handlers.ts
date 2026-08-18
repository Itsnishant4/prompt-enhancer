import { ipcMain, shell, app, systemPreferences } from 'electron';
import { settingsStore } from './settings-store';
import { historyStore } from './history-store';
import { enhanceTextDirect, undoLastEnhancement, clearSuccessTimeout } from './text-automation';
import { loadingOverlay } from './loading-overlay';
import { validateSettings, validateEnhanceRequest } from '@shared/schemas';
import { isLlamaServerModel } from '@shared/constants';
import { ensureModel, generateWithLlama, getLlamaStatus, stopLlamaServer, getDownloadState, ensureServer } from './llama-server';
import type { Settings, EnhanceResponse, LlamaServerStatus } from '@shared/types';

export function registerIpcHandlers(): void {
  ipcMain.handle('settings:get', async (): Promise<Settings> => {
    return settingsStore.getAll();
  });

  ipcMain.handle('settings:save', async (_event, settings: Partial<Settings>): Promise<Settings> => {
    const current = settingsStore.getAll();
    const merged = { ...current, ...settings };
    const validated = validateSettings(merged);
    settingsStore.setMultiple(validated);
    
    return settingsStore.getAll();
  });

  ipcMain.handle('history:get', async (_event, limit = 50, offset = 0) => {
    return historyStore.get(limit, offset);
  });

  ipcMain.handle('history:search', async (_event, query: string, limit = 20) => {
    return historyStore.search(query, limit);
  });

  ipcMain.handle('history:delete', async (_event, id: number): Promise<boolean> => {
    return historyStore.delete(id);
  });

  ipcMain.handle('history:clear', async (): Promise<number> => {
    return historyStore.clear();
  });

  ipcMain.handle('history:get-stats', async () => {
    return historyStore.getStats();
  });

  ipcMain.handle('models:list', async () => {
    const fs = require('fs/promises');
    const path = require('path');
    const cacheDir = path.join(app.getPath('userData'), 'models', 'onnx-community');
    const models: import('@shared/types').DownloadedModel[] = [];
    
    try {
      const entries = await fs.readdir(cacheDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const modelPath = path.join(cacheDir, entry.name);
          let size = 0;
          try {
            const files = await fs.readdir(modelPath, { recursive: true, withFileTypes: true });
            for (const file of files) {
              if (file.isFile()) {
                const stat = await fs.stat(path.join(file.parentPath || file.path, file.name));
                size += stat.size;
              }
            }
          } catch (err) {
            console.error("Error reading model size:", err);
          }
          models.push({
            name: `onnx-community/${entry.name}`,
            sizeMB: Math.round(size / (1024 * 1024))
          });
        }
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error("Failed to list models:", err);
      }
    }
    return models;
  });

  ipcMain.handle('models:delete', async (_event, name: string) => {
    const fs = require('fs/promises');
    const path = require('path');
    
    if (!name.startsWith('onnx-community/')) return false;
    const folderName = name.split('/')[1];
    if (!folderName || folderName.includes('..')) return false;

    const modelPath = path.join(app.getPath('userData'), 'models', 'onnx-community', folderName);
    
    try {
      await fs.rm(modelPath, { recursive: true, force: true });
      return true;
    } catch (err) {
      console.error("Failed to delete model:", err);
      return false;
    }
  });

  ipcMain.handle('llama:status', async (_event, modelId: string): Promise<LlamaServerStatus> => {
    return getLlamaStatus(modelId);
  });

  ipcMain.handle('llama:download', async (_event, modelId: string): Promise<{ ok: boolean; error?: string }> => {
    if (!isLlamaServerModel(modelId)) {
      return { ok: false, error: `Model is not a llama.cpp model: ${modelId}` };
    }
    try {
      await ensureModel(modelId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Download failed' };
    }
  });

  ipcMain.handle('llama:stop', async (): Promise<void> => {
    await stopLlamaServer();
  });

  ipcMain.handle('llama:start', async (_event, modelId: string): Promise<{ ok: boolean; error?: string }> => {
    if (!isLlamaServerModel(modelId)) {
      return { ok: false, error: `Model is not a llama.cpp model: ${modelId}` };
    }
    try {
      await ensureModel(modelId);
      await ensureServer(modelId);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Failed to start model' };
    }
  });

  ipcMain.handle('llama:generate', async (_event, modelId: string, text: string, systemPrompt: string): Promise<EnhanceResponse> => {
    return generateWithLlama(modelId, text, systemPrompt);
  });

  ipcMain.handle('llama:download-state', (): unknown => {
    return getDownloadState();
  });

  ipcMain.handle('enhance:prompt', async (_event, text: string): Promise<EnhanceResponse> => {
    const validated = validateEnhanceRequest({ text });
    return enhanceTextDirect(validated.text);
  });

  ipcMain.on('enhance:cancel', (): void => {
    // Cancellation is now handled differently or locally. 
    // We just hide the overlay for now.
    clearSuccessTimeout();
    loadingOverlay.hide();
  });

  ipcMain.on('enhance:undo', async (): Promise<void> => {
    loadingOverlay.hide();
    await undoLastEnhancement();
  });

  ipcMain.handle('app:open-external', async (_event, url: string): Promise<void> => {
    await shell.openExternal(url);
  });

  ipcMain.handle('app:get-version', (): string => {
    return app.getVersion();
  });

  ipcMain.handle('app:get-platform', (): string => {
    return process.platform;
  });

  ipcMain.handle('system:check-accessibility', (): boolean => {
    if (process.platform !== 'darwin') return true;
    return systemPreferences.isTrustedAccessibilityClient(false);
  });

  ipcMain.handle('system:request-accessibility', (): boolean => {
    if (process.platform !== 'darwin') return true;
    return systemPreferences.isTrustedAccessibilityClient(true);
  });
}