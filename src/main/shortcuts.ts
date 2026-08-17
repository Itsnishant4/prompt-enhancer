import { globalShortcut, app } from 'electron';
import { settingsStore } from './settings-store';
import { enhanceText } from './text-automation';

let registeredShortcut: string | null = null;

export function registerGlobalShortcut(): void {
  const shortcut = settingsStore.get('shortcut') || 'CommandOrControl+E';
  registerShortcut(shortcut);

  settingsStore.onChange(() => {
    const newShortcut = settingsStore.get('shortcut');
    if (newShortcut !== registeredShortcut) {
      registerShortcut(newShortcut);
    }
  });
}

function registerShortcut(shortcut: string): void {
  if (registeredShortcut) {
    globalShortcut.unregister(registeredShortcut);
  }

  const ret = globalShortcut.register(shortcut, async () => {
    if (!app.isReady()) return;
    try {
      await enhanceText({ showLoading: settingsStore.get('showLoadingOverlay') });
    } catch (error) {
      console.error('Global shortcut enhancement failed:', error);
    }
  });

  if (!ret) {
    console.error(`Failed to register global shortcut: ${shortcut}`);
  } else {
    registeredShortcut = shortcut;
    console.log(`Registered global shortcut: ${shortcut}`);
  }
}

export function unregisterGlobalShortcut(): void {
  if (registeredShortcut) {
    globalShortcut.unregister(registeredShortcut);
    registeredShortcut = null;
  }
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});