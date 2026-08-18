import { Tray, Menu, nativeImage, app } from 'electron';
import { join } from 'path';
import { settingsStore } from './settings-store';
import { enhanceText } from './text-automation';

let tray: Tray | null = null;
let showMainWindowCallback: (tab?: string) => void;

export function createTray(showWindow: (tab?: string) => void): void {
  showMainWindowCallback = showWindow;
  
  const isWindows = process.platform === 'win32';
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'resources', 'icon.png')
    : join(__dirname, '../../resources/icon.png');
  let icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    console.warn('Tray icon not found, using default');
    // Create a 16x16 transparent icon as fallback
    icon = nativeImage.createEmpty();
  }
  
  // Windows tray icons should be 16x16 or 32x32
  const traySize = isWindows ? 32 : 16;
  const trayIcon = icon.isEmpty() ? icon : icon.resize({ width: traySize, height: traySize });
  
  tray = new Tray(trayIcon);
  tray.setToolTip('Prompt Enhancer');
  
  // On Windows, clicking the tray icon opens the window
  if (isWindows) {
    tray.on('click', () => {
      showMainWindowCallback();
    });
  } else {
    tray.on('double-click', () => {
      showMainWindowCallback();
    });
  }
  
  // Right-click opens context menu on both platforms
  updateTrayMenu();

  settingsStore.onChange(() => {
    updateTrayMenu();
  });
}

function updateTrayMenu(): void {
  if (!tray) return;

  const shortcut = settingsStore.get('shortcut') || (process.platform === 'win32' ? 'Ctrl+E' : 'Cmd+E');
  const launchAtLogin = settingsStore.get('launchAtLogin');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Enhance Prompt (${shortcut})`,
      click: async () => {
        try {
          await enhanceText({ showLoading: settingsStore.get('showLoadingOverlay') });
        } catch (error) {
          console.error('Tray enhancement failed:', error);
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Open Settings',
      click: () => showMainWindowCallback('settings'),
    },
    {
      label: 'View History',
      click: () => showMainWindowCallback('history'),
    },
    { type: 'separator' },
    {
      label: 'Launch at Login',
      type: 'checkbox',
      checked: launchAtLogin,
      click: () => {
        const newValue = !launchAtLogin;
        settingsStore.set('launchAtLogin', newValue);
        app.setLoginItemSettings({ openAtLogin: newValue });
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => app.quit(),
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function getTray(): Tray | null {
  return tray;
}

export function updateTrayIcon(): void {
  if (!tray) return;
  
  const isWindows = process.platform === 'win32';
  const iconPath = app.isPackaged
    ? join(process.resourcesPath, 'resources', 'icon.png')
    : join(__dirname, '../../resources/icon.png');
  let icon = nativeImage.createFromPath(iconPath);
  
  if (!icon.isEmpty()) {
    tray.setImage(icon.resize({ width: isWindows ? 32 : 16, height: isWindows ? 32 : 16 }));
  }
}