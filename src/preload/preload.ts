import { contextBridge, ipcRenderer } from 'electron';
import type { Settings, HistoryEntry, EnhanceResponse, LlamaServerStatus, LlamaModelInfo } from '@shared/types';

const ALLOWED_INVOKE_CHANNELS = [
  'settings:get',
  'settings:save',
  'history:get',
  'history:search',
  'history:delete',
  'history:clear',
  'history:get-stats',
  'models:list',
  'models:delete',
  'enhance:prompt',
  'llama:status',
  'llama:download',
  'llama:start',
  'llama:stop',
  'llama:generate',
  'llama:download-state',
  'app:open-external',
  'app:get-version',
  'app:get-platform',
  'system:check-accessibility',
  'system:request-accessibility',
  'dialog:show-message',
  'window:is-maximized',
] as const;

const ALLOWED_SEND_CHANNELS = [
  'window:minimize',
  'window:maximize',
  'window:close',
  'enhance:cancel',
  'enhance:undo',
] as const;

const ALLOWED_RECEIVE_CHANNELS = [
  'navigate-to-tab',
  'slide-out',
  'show-error',
  'show-success',
  'llama:progress',
] as const;

type InvokeChannel = typeof ALLOWED_INVOKE_CHANNELS[number];
type SendChannel = typeof ALLOWED_SEND_CHANNELS[number];
type ReceiveChannel = typeof ALLOWED_RECEIVE_CHANNELS[number];

contextBridge.exposeInMainWorld('electronAPI', {
  settings: {
    get: () => ipcRenderer.invoke('settings:get') as Promise<Settings>,
    save: (settings: Partial<Settings>) => ipcRenderer.invoke('settings:save', settings) as Promise<Settings>,
  },
  history: {
    get: (limit?: number, offset?: number) => ipcRenderer.invoke('history:get', limit, offset) as Promise<HistoryEntry[]>,
    search: (query: string, limit?: number) => ipcRenderer.invoke('history:search', query, limit) as Promise<HistoryEntry[]>,
    delete: (id: number) => ipcRenderer.invoke('history:delete', id) as Promise<boolean>,
    clear: () => ipcRenderer.invoke('history:clear') as Promise<number>,
    getStats: () => ipcRenderer.invoke('history:get-stats') as Promise<{ totalRuns: number; fallbackCount: number; timeSavedMinutes: number }>,
  },
  models: {
    list: () => ipcRenderer.invoke('models:list') as Promise<import('@shared/types').DownloadedModel[]>,
    delete: (name: string) => ipcRenderer.invoke('models:delete', name) as Promise<boolean>,
  },
  llama: {
    status: (modelId: string) => ipcRenderer.invoke('llama:status', modelId) as Promise<LlamaServerStatus>,
    download: (modelId: string) => ipcRenderer.invoke('llama:download', modelId) as Promise<{ ok: boolean; error?: string }>,
    start: (modelId: string) => ipcRenderer.invoke('llama:start', modelId) as Promise<{ ok: boolean; error?: string }>,
    stop: () => ipcRenderer.invoke('llama:stop') as Promise<void>,
    generate: (modelId: string, text: string, systemPrompt: string) =>
      ipcRenderer.invoke('llama:generate', modelId, text, systemPrompt) as Promise<EnhanceResponse>,
    getDownloadState: () => ipcRenderer.invoke('llama:download-state'),
    onProgress: (callback: (state: { modelId: string; percent: number | null; inProgress: boolean; error: string | null }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, state: any) => callback(state);
      ipcRenderer.on('llama:progress', listener);
      return () => ipcRenderer.removeListener('llama:progress', listener);
    },
  },
  enhance: {
    prompt: (text: string) => ipcRenderer.invoke('enhance:prompt', text) as Promise<EnhanceResponse>,
    cancel: () => ipcRenderer.send('enhance:cancel'),
    undo: () => ipcRenderer.send('enhance:undo'),
  },
  app: {
    openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
    getVersion: () => ipcRenderer.invoke('app:get-version') as Promise<string>,
    getPlatform: () => ipcRenderer.invoke('app:get-platform') as Promise<string>,
  },
  system: {
    checkAccessibility: () => ipcRenderer.invoke('system:check-accessibility') as Promise<boolean>,
    requestAccessibility: () => ipcRenderer.invoke('system:request-accessibility') as Promise<boolean>,
  },
  dialog: {
    showMessage: (options: { type: 'info' | 'warning' | 'error'; title: string; message: string; detail?: string }) =>
      ipcRenderer.invoke('dialog:show-message', options),
  },
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:is-maximized') as Promise<boolean>,
    onNavigateToTab: (callback: (tab: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, tab: string) => callback(tab);
      ipcRenderer.on('navigate-to-tab', listener);
      return () => ipcRenderer.removeListener('navigate-to-tab', listener);
    },
    onSlideOut: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('slide-out', listener);
      return () => ipcRenderer.removeListener('slide-out', listener);
    },
    onShowError: (callback: (message: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
      ipcRenderer.on('show-error', listener);
      return () => ipcRenderer.removeListener('show-error', listener);
    },
    onShowSuccess: (callback: (message: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
      ipcRenderer.on('show-success', listener);
      return () => ipcRenderer.removeListener('show-success', listener);
    },
  },
});

declare global {
  interface Window {
    electronAPI: {
      settings: {
        get: () => Promise<Settings>;
        save: (settings: Partial<Settings>) => Promise<Settings>;
      };
      history: {
        get: (limit?: number, offset?: number) => Promise<HistoryEntry[]>;
        search: (query: string, limit?: number) => Promise<HistoryEntry[]>;
        delete: (id: number) => Promise<boolean>;
        clear: () => Promise<number>;
        getStats: () => Promise<{ totalRuns: number; fallbackCount: number; timeSavedMinutes: number }>;
      };
      models: {
        list: () => Promise<import('@shared/types').DownloadedModel[]>;
        delete: (name: string) => Promise<boolean>;
      };
      llama: {
        status: (modelId: string) => Promise<LlamaServerStatus>;
        download: (modelId: string) => Promise<{ ok: boolean; error?: string }>;
        start: (modelId: string) => Promise<{ ok: boolean; error?: string }>;
        stop: () => Promise<void>;
        generate: (modelId: string, text: string, systemPrompt: string) => Promise<EnhanceResponse>;
        getDownloadState: () => Promise<unknown>;
        onProgress: (callback: (state: { modelId: string; percent: number | null; inProgress: boolean; error: string | null }) => void) => () => void;
      };
      enhance: {
        prompt: (text: string) => Promise<EnhanceResponse>;
        cancel: () => void;
        undo: () => void;
      };
      app: {
        openExternal: (url: string) => Promise<void>;
        getVersion: () => Promise<string>;
        getPlatform: () => Promise<string>;
      };
      system: {
        checkAccessibility: () => Promise<boolean>;
        requestAccessibility: () => Promise<boolean>;
      };
      dialog: {
        showMessage: (options: { type: 'info' | 'warning' | 'error'; title: string; message: string; detail?: string }) => Promise<Electron.MessageBoxReturnValue>;
      };
      window: {
        minimize: () => void;
        maximize: () => void;
        close: () => void;
        isMaximized: () => Promise<boolean>;
        onNavigateToTab: (callback: (tab: string) => void) => () => void;
        onSlideOut: (callback: () => void) => () => void;
        onShowError: (callback: (message: string) => void) => () => void;
        onShowSuccess: (callback: (message: string) => void) => () => void;
      };
    };
  }
}