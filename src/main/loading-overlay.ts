import { BrowserWindow, screen } from 'electron';

let loadingWindow: BrowserWindow | null = null;

const INLINE_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    background: transparent !important;
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif;
  }
  .pill {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(18, 18, 24, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    color: #f1f5f9;
    font-size: 12px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  .spinner {
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: #6366f1;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  .pill.error {
    background: rgba(220, 38, 38, 0.95);
    border-color: rgba(239, 68, 68, 0.4);
  }
  .pill.error .spinner { display: none; }
  .pill.success {
    background: rgba(16, 185, 129, 0.95);
    border-color: rgba(52, 211, 153, 0.4);
  }
  .pill.success .spinner { display: none; }
</style>
</head>
<body>
  <div class="pill" id="pill">
    <div class="spinner" id="spinner"></div>
    <span id="label">Enhancing...</span>
  </div>
</body>
</html>`;

const DATA_URL = `data:text/html;charset=utf-8,${encodeURIComponent(INLINE_HTML)}`;

export const loadingOverlay = {
  show(): void {
    if (loadingWindow && !loadingWindow.isDestroyed()) return;

    const { width: workWidth, height: workHeight, y: workY } = screen.getPrimaryDisplay().workArea;
    const winWidth = 240;
    const winHeight = 64;

    loadingWindow = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      x: Math.round((workWidth - winWidth) / 2),
      y: workY + workHeight - 96,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
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
        sandbox: false,
      },
    });

    loadingWindow.setBackgroundColor('#00000000');
    loadingWindow.setMenuBarVisibility(false);
    loadingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    loadingWindow.loadURL(DATA_URL);

    loadingWindow.once('ready-to-show', () => {
      loadingWindow?.showInactive();
    });

    loadingWindow.on('closed', () => {
      loadingWindow = null;
    });
  },

  showError(message: string): void {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      const code = `
        const pill = document.getElementById('pill');
        const label = document.getElementById('label');
        if (pill && label) {
          pill.className = 'pill error';
          label.textContent = ${JSON.stringify(message || 'Enhancement failed')};
        }
      `;
      loadingWindow.webContents.executeJavaScript(code).catch(() => {});
    }
  },

  showSuccess(message: string): void {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      const code = `
        const pill = document.getElementById('pill');
        const label = document.getElementById('label');
        if (pill && label) {
          pill.className = 'pill success';
          label.textContent = ${JSON.stringify(message || 'Copied to clipboard')};
        }
      `;
      loadingWindow.webContents.executeJavaScript(code).catch(() => {});
    }
  },

  hide(): void {
    if (loadingWindow && !loadingWindow.isDestroyed()) {
      const win = loadingWindow;
      loadingWindow = null;
      win.close();
    } else {
      loadingWindow = null;
    }
  },

  isVisible(): boolean {
    return loadingWindow !== null && !loadingWindow.isDestroyed();
  },
};
