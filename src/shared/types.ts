export interface Settings {
  useLocalModel: boolean;
  localModelName: string;
  systemPrompt: string;
  shortcut: string;
  launchAtLogin: boolean;
  showLoadingOverlay: boolean;
}

export interface HistoryEntry {
  id: number;
  original_text: string;
  enhanced_text: string;
  model_used: string;
  created_at: number;
}



export interface DownloadedModel {
  name: string;
  sizeMB: number;
}

export interface LlamaServerStatus {
  modelName: string;
  downloaded: boolean;
  serverRunning: boolean;
  port: number | null;
  downloadPercent: number | null;
  error: string | null;
}

export interface LlamaModelInfo {
  id: string;
  label: string;
  ggufFile: string;
  ggufUrl: string;
  sizeMB: number;
}

export interface EnhanceRequest {
  text: string;
}

export interface EnhanceResponse {
  enhancedText: string;
  modelUsed: string;
}

export interface AppInfo {
  version: string;
  platform: string;
}

export type IPCChannels = 
  | 'settings:get'
  | 'settings:save'
  | 'history:get'
  | 'history:search'
  | 'history:delete'
  | 'history:clear'
  | 'enhance:prompt'
  | 'loading:show'
  | 'loading:hide'
  | 'settings:changed'
  | 'history:updated';