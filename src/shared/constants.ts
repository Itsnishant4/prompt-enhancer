import type { Settings, LlamaModelInfo } from './types';

export const IPC_CHANNELS = {
  SETTINGS: {
    GET: 'settings:get',
    SAVE: 'settings:save',
  },
  HISTORY: {
    GET: 'history:get',
    SEARCH: 'history:search',
    DELETE: 'history:delete',
    CLEAR: 'history:clear',
  },
  ENHANCE: {
    PROMPT: 'enhance:prompt',
  },
  LOADING: {
    SHOW: 'loading:show',
    HIDE: 'loading:hide',
  },
  MODELS: {
    LIST: 'models:list',
    DELETE: 'models:delete',
  },
  EVENTS: {
    SETTINGS_CHANGED: 'settings:changed',
    HISTORY_UPDATED: 'history:updated',
  },
} as const;

export const DEFAULT_SETTINGS: Settings = {
  useLocalModel: true,
  localModelName: 'MiniCPM-V-4.6',
  systemPrompt: 'You are a prompt enhancer. Rewrite the user\'s prompt to make it clearer, more specific, structured, and effective for an AI model. Preserve the user\'s original intent, requirements, constraints, and tone. Fix ambiguity, add useful missing context when logically implied, remove unnecessary wording, and organize instructions in a logical order. Do not change the requested task or invent requirements. Output only the enhanced prompt.',
  shortcut: 'CommandOrControl+E',
  launchAtLogin: false,
  showLoadingOverlay: true,
};

// ---- Local model registry ----
// llama.cpp models run via the bundled `llama-server` binary (OpenAI-compatible API).
export const LLAMA_SERVER_MODELS: Record<string, LlamaModelInfo> = {
  'MiniCPM-V-4.6': {
    id: 'MiniCPM-V-4.6',
    label: 'MiniCPM-V 4.6 (llama.cpp)',
    ggufFile: 'MiniCPM-V-4_6-Q4_K_M.gguf',
    ggufUrl: 'https://huggingface.co/openbmb/MiniCPM-V-4.6-gguf/resolve/main/MiniCPM-V-4_6-Q4_K_M.gguf',
    sizeMB: 505,
  },
};

export function isLlamaServerModel(modelName: string): boolean {
  return modelName in LLAMA_SERVER_MODELS;
}
