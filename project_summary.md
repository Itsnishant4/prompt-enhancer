# Prompt Enhancer — Project Summary

## Overview
**Prompt Enhancer** is a local-first, privacy-focused desktop utility for macOS and Windows. It allows users to select text anywhere in any application, press a global keyboard shortcut (`⌘E` / `Ctrl+E`), and instantly receive a refined, structured, and clearer prompt. 

All AI inference runs 100% offline using a bundled `llama-server` binary running the **MiniCPM-V 4.6** GGUF model (`MiniCPM-V-4_6-Q4_K_M.gguf`, ~505 MB). No cloud APIs, credentials, or network connections are required for core operations.

---

## Tech Stack & Dependencies

- **Framework**: Electron 32, React 18, TypeScript 5.3, Vite (`electron-vite`), Tailwind CSS 3.4
- **AI Engine**: Bundled native `llama-server` binaries (darwin/win32, x64/arm64) communicating via OpenAI-compatible HTTP API (`127.0.0.1:<free_port>/v1/chat/completions`).
- **Database**: SQLite (`better-sqlite3`) for prompt enhancement history, stats tracking, and credential storage.
- **Automation**: `@nut-tree-fork/nut-js` for cross-platform system keyboard simulation (Select All, Copy, Paste).
- **Packaging**: `electron-builder` (macOS DMG/ZIP, Windows NSIS/Portable).

---

## Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                       Global Shortcut                       │
│                     (⌘E / Ctrl+E)                          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Main Process (Electron)                     │
│  1. Capture focused app info (focus-tracker)               │
│  2. Simulate Select All + Copy via nut-js                  │
│  3. Read original text from Clipboard                      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                Bundled llama-server Binary                  │
│  • MiniCPM-V 4.6 (Q4_K_M GGUF)                              │
│  • Local HTTP Server (127.0.0.1:<random_port>)              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Result Handling Logic                     │
│  • Same app focused? → Select All + Paste back into app     │
│  • App focus changed? → Copy to Clipboard + Show Toast      │
│  • Save entry to SQLite history database                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Modules & File Breakdown

### Main Process (`src/main/`)
- `main.ts`: Application entry point, window management, single-instance lock, tray integration, shortcut registration.
- `llama-server.ts`: Manages binary lifecycle (spawn/stop/health checks), model GGUF downloads from HuggingFace, HTTP completion requests.
- `text-automation.ts`: Handles keyboard automation for copying/pasting text, app focus tracking, loading overlay management, undo stack.
- `history-store.ts`: SQLite database layer managing `enhancements` table, search, pagination, fallback counts, and statistics.
- `settings-store.ts`: JSON-backed configuration store (`electron-store`) for shortcuts, model selection, system prompt, launch at login.
- `loading-overlay.ts`: Manages a floating, frameless, transparent overlay pill ("Enhancing...") displayed during AI inference.
- `focus-tracker.ts`: Detects active frontmost application on macOS/Windows.
- `ipc-handlers.ts`: Exposes IPC handlers between main process and renderer.

### Renderer (`src/renderer/`)
- `App.tsx`: Main layout, custom drag-enabled titlebar, window controls, tab switcher (Preferences & History).
- `DownloadGate.tsx`: First-run onboarding screen that downloads and initialises the offline model before main app access.
- `SettingsPanel.tsx`: Preference manager for system prompts, global hotkeys, model download/status controls, launch-at-login toggles.
- `HistoryPanel.tsx`: Searchable list of past prompt enhancements with side-by-side original/enhanced text, copy, delete, and re-enhance actions.

### Shared (`src/shared/`)
- `constants.ts`: Model definitions, HuggingFace download URLs, default system prompt, IPC channel names.
- `schemas.ts`: Zod validation schemas for IPC payloads and settings.
- `types.ts`: TypeScript interfaces for settings, history entries, model status, and IPC responses.
