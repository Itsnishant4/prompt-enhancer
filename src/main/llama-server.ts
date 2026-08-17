import { spawn, ChildProcess } from 'child_process';
import { app, BrowserWindow } from 'electron';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import axios from 'axios';
import { createServer, Server } from 'net';
import { LLAMA_SERVER_MODELS, isLlamaServerModel } from '@shared/constants';
import type { LlamaModelInfo, LlamaServerStatus } from '@shared/types';

const CONTEXT_SIZE = 4096;
const HEALTH_TIMEOUT_MS = 120000;
const GENERATE_TIMEOUT_MS = 180000;

interface RunningServer {
  proc: ChildProcess;
  port: number;
}

let currentServer: RunningServer | null = null;
let downloadState: {
  modelId: string;
  percent: number | null;
  inProgress: boolean;
  error: string | null;
} = { modelId: '', percent: null, inProgress: false, error: null };

function getResourcesPath(): string {
  return app.isPackaged
    ? join(process.resourcesPath, 'resources')
    : join(__dirname, '../../resources');
}

function getBinaryDir(): string {
  const platform = process.platform === 'win32' ? 'win32' : 'darwin';
  const arch = process.arch;
  if (app.isPackaged) {
    if (platform === 'darwin') {
      return join(getResourcesPath(), 'bin', `darwin-${arch}`);
    }
    return join(getResourcesPath(), 'bin');
  }
  return join(getResourcesPath(), 'bin', `${platform}-${arch}`);
}

function getBinaryPath(): string {
  const exe = process.platform === 'win32' ? 'llama-server.exe' : 'llama-server';
  return join(getBinaryDir(), exe);
}

function getModelDir(model: LlamaModelInfo): string {
  return join(app.getPath('userData'), 'models', 'llama', model.id);
}

function getModelPath(model: LlamaModelInfo): string {
  return join(getModelDir(model), model.ggufFile);
}

function broadcast(event: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(event, payload);
    }
  }
}

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv: Server = createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error('Failed to allocate port')));
      }
    });
    srv.on('error', reject);
  });
}

async function downloadModel(model: LlamaModelInfo): Promise<void> {
  const dir = getModelDir(model);
  const dest = getModelPath(model);

  if (existsSync(dest)) {
    downloadState = { modelId: model.id, percent: 100, inProgress: false, error: null };
    return;
  }

  mkdirSync(dir, { recursive: true });
  downloadState = { modelId: model.id, percent: 0, inProgress: true, error: null };
  broadcast('llama:progress', downloadState);

  try {
    const writer = createWriteStream(dest);
    const response = await axios.get(model.ggufUrl, {
      responseType: 'stream',
      timeout: 0,
      maxRedirects: 5,
    });

    const total = Number(response.headers['content-length']) || 0;
    let received = 0;

    await new Promise<void>((resolve, reject) => {
      response.data.on('data', (chunk: Buffer) => {
        received += chunk.length;
        if (total > 0) {
          downloadState.percent = Math.round((received / total) * 100);
          if (downloadState.percent % 5 === 0 || downloadState.percent === 100) {
            broadcast('llama:progress', { ...downloadState });
          }
        }
      });
      response.data.on('error', reject);
      response.data.pipe(writer);
      writer.on('error', reject);
      writer.on('finish', resolve);
    });

    downloadState.percent = 100;
    downloadState.inProgress = false;
    broadcast('llama:progress', { ...downloadState });
  } catch (err) {
    downloadState.inProgress = false;
    downloadState.error = err instanceof Error ? err.message : 'Download failed';
    broadcast('llama:progress', { ...downloadState });
    try {
      const fs = await import('fs/promises');
      await fs.rm(dest, { force: true });
    } catch { /* noop */ }
    throw err;
  }
}

function waitForHealth(port: number, model: LlamaModelInfo): Promise<void> {
  const url = `http://127.0.0.1:${port}/health`;
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      if (Date.now() - started > HEALTH_TIMEOUT_MS) {
        reject(new Error(`llama-server failed to become ready within ${HEALTH_TIMEOUT_MS / 1000}s`));
        return;
      }
      try {
        const res = await axios.get(url, { timeout: 2000 });
        if (res.status === 200) {
          resolve();
          return;
        }
      } catch { /* not ready yet */ }
      setTimeout(poll, 1000);
    };
    poll();
  });
}

async function spawnServer(model: LlamaModelInfo): Promise<void> {
  if (currentServer) {
    return;
  }

  const binary = getBinaryPath();
  if (!existsSync(binary)) {
    throw new Error(`llama-server binary not found for this platform: ${binary}`);
  }

  const modelPath = getModelPath(model);
  if (!existsSync(modelPath)) {
    throw new Error('Model not downloaded. Call ensureModel first.');
  }

  const port = await findFreePort();
  const args = [
    '-m', modelPath,
    '--host', '127.0.0.1',
    '--port', String(port),
    '-c', String(CONTEXT_SIZE),
    '--jinja',
    '--chat-template-kwargs', JSON.stringify({ enable_thinking: false }),
    '--log-disable',
  ];

  const proc = spawn(binary, args, {
    cwd: getBinaryDir(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  proc.stdout?.on('data', () => { /* swallow */ });
  proc.stderr?.on('data', (data: Buffer) => {
    const text = data.toString();
    if (text.includes('error') || text.includes('Error')) {
      console.error('[llama-server]', text.trim());
    }
  });
  proc.on('exit', (code, signal) => {
    console.log(`[llama-server] exited code=${code} signal=${signal}`);
    if (currentServer?.proc === proc) {
      currentServer = null;
    }
  });

  currentServer = { proc, port };

  try {
    await waitForHealth(port, model);
  } catch (err) {
    proc.kill();
    currentServer = null;
    throw err;
  }
}

export async function ensureModel(modelId: string): Promise<LlamaModelInfo> {
  const model = LLAMA_SERVER_MODELS[modelId];
  if (!model) {
    throw new Error(`Unknown llama.cpp model: ${modelId}`);
  }
  await downloadModel(model);
  return model;
}

export async function ensureServer(modelId: string): Promise<void> {
  const model = await ensureModel(modelId);
  await spawnServer(model);
}

export async function generateWithLlama(modelId: string, text: string, systemPrompt: string): Promise<{ enhancedText: string; modelUsed: string }> {
  const model = LLAMA_SERVER_MODELS[modelId];
  if (!model) {
    throw new Error(`Unknown llama.cpp model: ${modelId}`);
  }

  await ensureServer(modelId);

  const { port } = currentServer!;
  const url = `http://127.0.0.1:${port}/v1/chat/completions`;

  const response = await axios.post(
    url,
    {
      model: model.id,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    },
    { timeout: GENERATE_TIMEOUT_MS },
  );

  const content = response.data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('llama-server returned an empty response');
  }

  return { enhancedText: content.trim(), modelUsed: `${model.id} (llama.cpp)` };
}

export function getLlamaStatus(modelId: string): LlamaServerStatus {
  const model = LLAMA_SERVER_MODELS[modelId];
  if (!model) {
    return { modelName: modelId, downloaded: false, serverRunning: false, port: null, downloadPercent: null, error: 'Unknown model' };
  }
  const downloaded = existsSync(getModelPath(model));
  return {
    modelName: modelId,
    downloaded,
    serverRunning: currentServer !== null,
    port: currentServer?.port ?? null,
    downloadPercent: downloadState.modelId === modelId ? downloadState.percent : downloaded ? 100 : null,
    error: downloadState.modelId === modelId ? downloadState.error : null,
  };
}

export function getDownloadState() {
  return downloadState;
}

export async function stopLlamaServer(): Promise<void> {
  if (currentServer) {
    currentServer.proc.kill();
    currentServer = null;
  }
}

export function llamaModelAvailable(modelId: string): boolean {
  return isLlamaServerModel(modelId);
}