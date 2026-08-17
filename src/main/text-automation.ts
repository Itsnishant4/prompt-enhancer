import { keyboard, Key } from '@nut-tree-fork/nut-js';
import { clipboard, dialog } from 'electron';

import { historyStore } from './history-store';
import { loadingOverlay } from './loading-overlay';
import { settingsStore } from './settings-store';
import { generateWithLlama } from './llama-server';
import { captureFrontmostApp, getCurrentFrontmostAppName } from './focus-tracker';

interface EnhanceOptions {
  showLoading?: boolean;
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getModifierKey(): any {
  return process.platform === 'darwin' ? Key.LeftSuper : Key.LeftControl;
}

async function copyToClipboard(): Promise<string> {
  await keyboard.type(getModifierKey(), Key.C);
  await delay(200);
  return clipboard.readText() || '';
}

async function selectAll(): Promise<void> {
  await keyboard.type(getModifierKey(), Key.A);
  await delay(100);
}

async function pasteFromClipboard(): Promise<void> {
  await keyboard.type(getModifierKey(), Key.V);
  await delay(100);
}

let lastEnhancement: {
  originalText: string;
  previousClipboardText: string;
} | null = null;

let successTimeout: NodeJS.Timeout | null = null;

async function runInference(text: string, systemPrompt: string, modelName: string): Promise<{ enhancedText: string; modelUsed: string }> {
  return generateWithLlama(modelName, text, systemPrompt);
}

export function clearSuccessTimeout(): void {
  if (successTimeout) {
    clearTimeout(successTimeout);
    successTimeout = null;
  }
}

export async function undoLastEnhancement(): Promise<void> {
  clearSuccessTimeout();
  if (!lastEnhancement) {
    console.log('No enhancement to undo');
    return;
  }

  const { originalText } = lastEnhancement;
  lastEnhancement = null;

  // Restore the original text to the clipboard so the user can paste it back
  clipboard.writeText(originalText);
}

export async function enhanceText(options: EnhanceOptions = {}): Promise<void> {
  const { showLoading = true } = options;
  const previousClipboardText = clipboard.readText();
  let hasError = false;
  let didAutoPaste = false;

  // Clear any existing success timeout
  clearSuccessTimeout();

  // Wait a brief moment to allow the user to release the shortcut keys (Cmd+E)
  // before we simulate any keyboard automation keys
  await delay(150);

  try {
    if (showLoading) {
      loadingOverlay.show();
    }

    // Remember which app the user triggered the shortcut in so we can decide
    // whether to auto-paste (same app still focused) or fall back to clipboard.
    const sourceApp = await captureFrontmostApp();

    await selectAll();
    const originalText = await copyToClipboard();

    if (!originalText?.trim()) {
      throw new Error('No text selected or clipboard is empty');
    }

    const modelName = settingsStore.get('localModelName') || 'MiniCPM-V-4.6';
    const systemPrompt = settingsStore.get('systemPrompt') || '';

    const { enhancedText, modelUsed } = await runInference(originalText, systemPrompt, modelName);

    lastEnhancement = {
      originalText,
      previousClipboardText,
    };

    // Write the result to the clipboard in all cases — auto-paste reads from it,
    // and the clipboard fallback relies on it too.
    clipboard.writeText(enhancedText);
    await delay(100);

    // Only fall back to clipboard+toast when we have POSITIVE evidence the user
    // switched apps during inference. If we can't read the frontmost app (e.g.
    // osascript Automation permission not granted), assume they're still in the
    // source app and auto-paste — otherwise the toast would show on every run.
    let switchedApps = false;
    if (sourceApp) {
      const currentApp = await getCurrentFrontmostAppName();
      switchedApps = !!currentApp && currentApp.toLowerCase() !== sourceApp.name.toLowerCase();
    }

    if (!switchedApps) {
      didAutoPaste = true;
      await selectAll();
      await pasteFromClipboard();
      await delay(200);

      // No toast — result was pasted in place.
      if (showLoading) {
        loadingOverlay.hide();
      }
    } else {
      // User switched apps during inference: leave result on the clipboard and
      // notify them so they can paste it wherever they are now.
      if (showLoading) {
        loadingOverlay.showSuccess('Enhanced prompt copied to clipboard');
        clearSuccessTimeout();
        successTimeout = setTimeout(() => {
          loadingOverlay.hide();
          successTimeout = null;
        }, 4000);
      }
    }

    historyStore.add({
      original_text: originalText,
      enhanced_text: enhancedText,
      model_used: modelUsed,
      created_at: Date.now(),
    });

  } catch (error) {
    lastEnhancement = null;
    if (error instanceof Error && error.message === 'CANCELED') {
      console.log('Enhancement request was cancelled by user.');
      if (showLoading) {
        loadingOverlay.hide();
      }
    } else {
      console.error('Enhancement failed:', error);
      hasError = true;
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      if (showLoading) {
        loadingOverlay.showError(errorMessage);
        clearSuccessTimeout();
        successTimeout = setTimeout(() => {
          loadingOverlay.hide();
          successTimeout = null;
        }, 5000);
      } else {
        dialog.showErrorBox('Prompt Enhancer Error', errorMessage);
      }
      throw error;
    }
  } finally {
    // If we auto-pasted the result, restore the user's previous clipboard contents.
    // If we fell back to clipboard, leave the enhanced text on the clipboard
    // so the user can paste it manually. On error, also restore the previous clipboard.
    if (didAutoPaste || hasError) {
      if (previousClipboardText) {
        clipboard.writeText(previousClipboardText);
      } else {
        clipboard.clear();
      }
    }
  }
}

export async function enhanceTextDirect(text: string): Promise<{ enhancedText: string; modelUsed: string }> {
  const modelName = settingsStore.get('localModelName') || 'MiniCPM-V-4.6';
  const systemPrompt = settingsStore.get('systemPrompt') || '';

  return runInference(text, systemPrompt, modelName);
}