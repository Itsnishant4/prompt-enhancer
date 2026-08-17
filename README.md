# Prompt Enhancer

Local-first AI prompt enhancer for macOS and Windows. Select any text anywhere, press a shortcut, and get a clearer, more specific, and better-structured prompt — powered entirely offline by a bundled llama.cpp server running the **MiniCPM-V 4.6** model.

No API keys. No cloud calls. Your text never leaves your machine.

## Features

- **Global shortcut (⌘E / Ctrl+E)** — works in any app, any text field
- **100% offline** — bundled llama.cpp server + MiniCPM-V 4.6 (Q4_K_M) GGUF
- **Smart paste** — enhances and pastes right back into the app you're working in; if you switch apps while it runs, the result is copied to your clipboard instead
- **First-run model gate** — a friendly page downloads and loads the model before first use
- **Enhancement history** — search, review, and undo past enhancements
- **Undo** — restore your original text with one shortcut
- **Tray integration** — runs quietly in the menu bar / tray

## Requirements

- macOS (Apple Silicon or Intel) or Windows (x64/ARM64)
- ~1 GB of free RAM for the model at runtime
- ~500 MB of disk space for the bundled GGUF (downloaded on first run)

## Install

Grab the latest installer for your platform from the [Releases](../../releases) page:

- **macOS**: `.dmg` for Apple Silicon or Intel
- **Windows**: NSIS installer (`.exe`) for x64 or ARM64, plus portable builds

On first launch the app downloads the model (~505 MB) and loads it into memory, then you're ready to go.

## Usage

1. Launch Prompt Enhancer (it lives in the menu bar / tray)
2. Select any text in any app
3. Press **⌘E** (macOS) or **Ctrl+E** (Windows)
4. A small pill shows "Enhancing…" — the enhanced prompt replaces your selection

To undo, press the undo shortcut (see Settings) and your original text returns to the clipboard.

## Development

```bash
# install deps
pnpm install

# dev mode (hot reload)
pnpm dev

# typecheck
npx tsc --noEmit

# build for current platform
npx electron-vite build && npx electron-builder --mac --dir   # or --win --x64 --dir
```

> Note: this repo uses `npx` for typecheck/build because pnpm 11's dep-check step rejects the `lzma-native` build config.

### Packaging

- `build:mac` — DMG + ZIP for x64 and arm64
- `build:win` — NSIS installer + portable `.exe`
- Binaries for both platforms are bundled in `resources/bin/`; each package ships only the binaries for its platform(s)

## Architecture

```
src/
  main/        Electron main process (shortcut, llama server, automation, IPC)
  preload/     Context-bridged preload API
  renderer/    React UI (settings, history, download gate, loading pill)
  shared/      Types, constants, schemas shared across processes
```

The main process speaks to the bundled `llama-server` binary over its OpenAI-compatible HTTP API (`127.0.0.1:<free port>`). The model GGUF is downloaded once to `userData/models/llama/`.

## License

[MIT](./LICENSE)
