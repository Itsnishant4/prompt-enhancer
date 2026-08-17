import { app, BrowserWindow, screen, ipcMain, dialog, nativeImage } from 'electron';
import { join } from 'path';

// Force V8 to collect garbage early and cap heap size at 128MB to save background RAM
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=128');
import { registerIpcHandlers } from './ipc-handlers';
import { registerGlobalShortcut } from './shortcuts';
import { createTray } from './tray';
import { settingsStore } from './settings-store';
import { stopLlamaServer } from './llama-server';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

export function showMainWindow(tab?: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    mainWindow = createMainWindow();
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }

  if (tab) {
    if (mainWindow.webContents.isLoading()) {
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow?.webContents.send('navigate-to-tab', tab);
      });
    } else {
      mainWindow.webContents.send('navigate-to-tab', tab);
    }
  }
}

function createMainWindow(): BrowserWindow {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const isWindows = process.platform === 'win32';
  
  // In production, resources are at process.resourcesPath; in dev they're relative to project root
  const resourcesPath = app.isPackaged
    ? join(process.resourcesPath, 'resources')
    : join(__dirname, '../../resources');

  const win = new BrowserWindow({
    width: 900,
    height: 700,
    x: Math.round((width - 900) / 2),
    y: Math.round((height - 700) / 2),
    minWidth: 800,
    minHeight: 600,
    // Windows & Mac: use frameless with custom titlebar
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: isWindows ? undefined : { x: 16, y: 20 },
    icon: isWindows ? join(resourcesPath, 'icon.png') : undefined,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: join(__dirname, '../preload/preload.js'),
      backgroundThrottling: false, // Must be false to allow AI inference in background
    },
    show: false,
  });

  // On Windows, hide the menu bar (it's shown by default)
  win.setMenuBarVisibility(false);
  if (isWindows) {
    win.setMenu(null);
  }

  if (import.meta.env.DEV) {
    win.loadURL('http://localhost:5173');
    
    // Auto-reload on connection failure (e.g., if dev server starts slightly slower)
    win.webContents.on('did-fail-load', () => {
      setTimeout(() => {
        if (!win.isDestroyed()) {
          win.loadURL('http://localhost:5173');
        }
      }, 1000);
    });
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('close', (event) => {
    if (!isQuitting) {
      // Allow the window to close and destroy itself naturally to free memory
    }
  });

  win.on('closed', () => {
    if (win === mainWindow) {
      mainWindow = null;
    }
  });

  return win;
}

function setupWindowControls(): void {
  ipcMain.on('window:minimize', () => mainWindow?.minimize());
  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window:close', () => mainWindow?.close());
  ipcMain.handle('window:is-maximized', () => {
    return mainWindow?.isMaximized() ?? false;
  });
}

function setupAppEvents(): void {
  app.on('second-instance', () => {
    showMainWindow();
  });

  app.on('activate', () => {
    showMainWindow();
  });

  app.on('window-all-closed', () => {
    // Keep running in background tray
  });

  app.on('before-quit', () => {
    isQuitting = true;
    stopLlamaServer();
  });
}

async function initializeApp(): Promise<void> {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  await app.whenReady();

  if (process.platform === 'darwin') {
    const iconPath = join(__dirname, '../../resources/icon.png');
    const image = nativeImage.createFromPath(iconPath);
    if (!image.isEmpty()) {
      app.dock.setIcon(image);
    }
  }

  registerIpcHandlers();
  setupAppEvents();

  mainWindow = createMainWindow();
  setupWindowControls();

  createTray(showMainWindow);
  registerGlobalShortcut();

  const settings = settingsStore.getAll();

  const launchAtLogin = settingsStore.get('launchAtLogin');
  app.setLoginItemSettings({ openAtLogin: launchAtLogin });

  // Enable SharedArrayBuffer for WASM multi-threading
  const { session } = require('electron');
  session.defaultSession.webRequest.onHeadersReceived((details: any, callback: any) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Embedder-Policy': 'credentialless',
      },
    });
  });
}

app.whenReady().then(initializeApp).catch(console.error);

ipcMain.handle('dialog:show-message', async (_event, options: {
  type: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  detail?: string;
}) => {
  return dialog.showMessageBox(mainWindow as Electron.BrowserWindow, options);
});