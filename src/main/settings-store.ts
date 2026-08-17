import Store from 'electron-store';
import { validateSettings, type Settings } from '@shared/schemas';
import { DEFAULT_SETTINGS } from '@shared/constants';

const schema = {
  useLocalModel: { type: 'boolean', default: DEFAULT_SETTINGS.useLocalModel },
  localModelName: { type: 'string', default: DEFAULT_SETTINGS.localModelName },
  systemPrompt: { type: 'string', default: DEFAULT_SETTINGS.systemPrompt },
  shortcut: { type: 'string', default: DEFAULT_SETTINGS.shortcut },
  launchAtLogin: { type: 'boolean', default: DEFAULT_SETTINGS.launchAtLogin },
  showLoadingOverlay: { type: 'boolean', default: DEFAULT_SETTINGS.showLoadingOverlay },
};

const store = new Store<Settings>({ schema });

export class SettingsStore {
  private static instance: SettingsStore;
  private changeListeners: Set<() => void> = new Set();

  static getInstance(): SettingsStore {
    if (!SettingsStore.instance) {
      SettingsStore.instance = new SettingsStore();
    }
    return SettingsStore.instance;
  }

  getAll(): Settings {
    const settings = store.store as Settings;
    
    // Migration: force all users to the single supported model (MiniCPM-V-4.6 via llama.cpp)
    if (settings.localModelName !== 'MiniCPM-V-4.6') {
      store.set('localModelName', 'MiniCPM-V-4.6');
      settings.localModelName = 'MiniCPM-V-4.6';
    }

    return {
      ...DEFAULT_SETTINGS,
      ...settings,
    };
  }

  get<K extends keyof Settings>(key: K): Settings[K] {
    return store.get(key);
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    store.set(key, value);
    this.notifyChanges();
  }

  setMultiple(settings: Partial<Settings>): void {
    Object.entries(settings).forEach(([key, value]) => {
      store.set(key as keyof Settings, value);
    });
    this.notifyChanges();
  }

  validate(settings: Partial<Settings>): Settings {
    return validateSettings(settings);
  }

  reset(): void {
    store.clear();
    this.notifyChanges();
  }

  onChange(listener: () => void): () => void {
    this.changeListeners.add(listener);
    return () => this.changeListeners.delete(listener);
  }

  private notifyChanges(): void {
    this.changeListeners.forEach(listener => listener());
  }
}

export const settingsStore = SettingsStore.getInstance();