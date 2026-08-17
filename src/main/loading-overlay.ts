import { BrowserWindow, screen } from 'electron';
import { join } from 'path';

let loadingWindow: BrowserWindow | null = null;

export const loadingOverlay = {
  show(): void {
    if (loadingWindow) return;

    const { width: workWidth, height: workHeight, y: workY } = screen.getPrimaryDisplay().workArea;

    loadingWindow = new BrowserWindow({
      width: 240,
      height: 64,
      x: Math.round((workWidth - 240) / 2),
      y: workY + workHeight - 96,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      movable: false,
      hasShadow: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        preload: join(__dirname, '../preload/preload.js'),
      },
    });

    loadingWindow.setMenuBarVisibility(false);
    loadingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    if (import.meta.env.DEV) {
      loadingWindow.loadURL('http://localhost:5173/loading.html');
    } else {
      loadingWindow.loadFile(join(__dirname, '../renderer/loading.html'));
    }

    loadingWindow.once('ready-to-show', () => {
      loadingWindow?.showInactive();
    });

    loadingWindow.on('closed', () => {
      loadingWindow = null;
    });
  },

  showError(message: string): void {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.webContents.send('show-error', message);
    }
  },

  showSuccess(message: string): void {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.webContents.send('show-success', message);
    }
  },

  hide(): void {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      loadingWindow.webContents.send('slide-out');
      const win = loadingWindow;
      loadingWindow = null;
      setTimeout(() => {
        if (!win.isDestroyed()) {
          win.close();
        }
      }, 250);
    } else {
      loadingWindow = null;
    }
  },

  isVisible(): boolean {
    return loadingWindow !== null && !loadingWindow.isDestroyed();
  },
};