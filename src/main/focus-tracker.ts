import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface FocusedApp {
  name: string;
  processId?: number;
}

let frontmostApp: string | null = null;

export function captureFrontmostApp(): Promise<FocusedApp | null> {
  return process.platform === 'darwin'
    ? captureFrontmostAppMac()
    : captureFrontmostAppWindows();
}

export async function getCurrentFrontmostAppName(): Promise<string | null> {
  if (process.platform === 'darwin') {
    const script = 'tell application "System Events" to get name of first application process whose frontmost is true';
    try {
      const { stdout } = await execAsync(`osascript -e '${script}'`, { timeout: 5000 });
      return stdout.trim() || null;
    } catch (err) {
      console.error('[focus-tracker] Failed to read frontmost app:', err);
      return null;
    }
  }

  const script = [
    "Add-Type '[DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow();",
    "[DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr, out uint);'",
    '$h = GetForegroundWindow;',
    '[uint32]$procId = 0;',
    'GetWindowThreadProcessId $h ([ref]$procId) | Out-Null;',
    '(Get-Process -Id $procId).ProcessName',
  ].join(' ');
  try {
    const { stdout } = await execAsync(`powershell -NoProfile -Command "${script}"`, { timeout: 5000 });
    return stdout.trim() || null;
  } catch (err) {
    console.error('[focus-tracker] Failed to read frontmost app:', err);
    return null;
  }
}

async function captureFrontmostAppMac(): Promise<FocusedApp | null> {
  const script = 'tell application "System Events" to get name of first application process whose frontmost is true';
  try {
    const { stdout } = await execAsync(`osascript -e '${script}'`, { timeout: 5000 });
    const name = stdout.trim();
    if (!name) return null;
    frontmostApp = name;
    return { name };
  } catch (err) {
    console.error('[focus-tracker] Failed to capture frontmost app:', err);
    return null;
  }
}

async function captureFrontmostAppWindows(): Promise<FocusedApp | null> {
  const script = [
    "Add-Type '[DllImport(\"user32.dll\")] public static extern IntPtr GetForegroundWindow();",
    "[DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(IntPtr, out uint);'",
    '$h = GetForegroundWindow;',
    '[uint32]$procId = 0;',
    'GetWindowThreadProcessId $h ([ref]$procId) | Out-Null;',
    '(Get-Process -Id $procId).ProcessName',
  ].join(' ');
  try {
    const { stdout } = await execAsync(`powershell -NoProfile -Command "${script}"`, { timeout: 5000 });
    const name = stdout.trim();
    if (!name) return null;
    frontmostApp = name;
    return { name };
  } catch (err) {
    console.error('[focus-tracker] Failed to capture frontmost app:', err);
    return null;
  }
}

export function activateFrontmostApp(): Promise<boolean> {
  return process.platform === 'darwin'
    ? activateFrontmostAppMac()
    : activateFrontmostAppWindows();
}

async function activateFrontmostAppMac(): Promise<boolean> {
  const name = frontmostApp;
  if (!name) return false;
  const script = `tell application "System Events" to set frontmost of first application process whose name is "${name}" to true`;
  try {
    await execAsync(`osascript -e '${script}'`, { timeout: 5000 });
    return true;
  } catch (err) {
    console.error('[focus-tracker] Failed to activate frontmost app:', err);
    return false;
  }
}

async function activateFrontmostAppWindows(): Promise<boolean> {
  const name = frontmostApp;
  if (!name) return false;
  const script = [
    "Add-Type '[DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr hWnd);'",
    "$p = Get-Process -Name '" + name + "' -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1;",
    'if ($p) { [user32]::SetForegroundWindow($p.MainWindowHandle) }',
  ].join(' ');
  try {
    await execAsync(`powershell -NoProfile -Command "${script}"`, { timeout: 5000 });
    return true;
  } catch (err) {
    console.error('[focus-tracker] Failed to activate frontmost app:', err);
    return false;
  }
}

export function clearFrontmostApp(): void {
  frontmostApp = null;
}