#!/bin/bash
# Diagnose a Prompt Enhancer install: tray resources, llama binary, model, permissions.
# Usage: bash scripts/test-install.sh ["/Applications/Prompt Enhancer.app"]
set -uo pipefail

APP="${1:-/Applications/Prompt Enhancer.app}"
pass=0; fail=0

ok()   { echo "  ✓ $1"; pass=$((pass+1)); }
bad()  { echo "  ✗ $1"; fail=$((fail+1)); }

echo "== Checking: $APP =="
[ -d "$APP" ] || { echo "App not found: $APP"; exit 1; }

RES="$APP/Contents/Resources"

echo
echo "[1] Tray / dock icon (extraResources)"
if [ -f "$RES/resources/icon.png" ]; then ok "icon present: $RES/resources/icon.png"; else bad "icon MISSING (tray will be invisible)"; fi
# asar must NOT contain resources/icon.png (would shadow the real one)
ASAR_ICON=$(npx --yes @electron/asar list "$RES/app.asar" 2>/dev/null | grep -c "resources/icon.png")
if [ "$ASAR_ICON" -eq 0 ]; then ok "icon not bundled inside app.asar (correct)"; else bad "icon found INSIDE app.asar ($ASAR_ICON hits) - path resolution bug"; fi

echo
echo "[2] llama.cpp bundle"
if [ "$(uname -m)" = "arm64" ]; then NATIVE="darwin-arm64"; else NATIVE="darwin-x64"; fi
echo "  (this mac: $(uname -m) -> native dir $NATIVE)"
if [ -d "$RES/resources/bin/$NATIVE" ]; then
  ok "native binary dir present: $NATIVE"
  BIN="$RES/resources/bin/$NATIVE/llama-server"
else
  echo "  ! native dir $NATIVE not bundled; listing what IS bundled:"
  ls "$RES/resources/bin/" | sed 's/^/    /'
  # pick whatever darwin bundle exists so dylib check still runs
  BIN=""
  for d in darwin-arm64 darwin-x64; do
    if [ -d "$RES/resources/bin/$d" ]; then
      echo "  ! note: using $d (arch mismatch - app built for other CPU; will run under Rosetta)"
      BIN="$RES/resources/bin/$d/llama-server"
      break
    fi
  done
fi

if [ -n "$BIN" ] && [ -x "$BIN" ]; then
  echo -n "  running --version: "
  OUT=$("$BIN" --version 2>&1)
  if echo "$OUT" | grep -q "version:"; then echo "$OUT" | head -1 | sed 's/^/    /'; ok "llama-server executes"; else echo "$OUT" | head -2 | sed 's/^/    /'; bad "llama-server FAILED to start (missing dylib?)"; fi
else
  bad "llama-server binary not executable"
fi

BINDIR=$(dirname "$BIN")
if [ -n "$BIN" ] && [ -d "$BINDIR" ]; then
  MISS=0
  for lib in $(otool -L "$BIN" 2>/dev/null | grep "@rpath" | awk '{print $1}' | sed 's|@rpath/||'); do
    [ -f "$BINDIR/$lib" ] || { bad "missing dylib: $lib"; MISS=1; }
  done
  [ "$MISS" -eq 0 ] && ok "all @rpath dylibs present"
fi

echo
echo "[3] Model file (userData)"
UD=$(defaults read "com.promptenhancer.app" 2>/dev/null; echo "")
MODEL_DIR="$HOME/Library/Application Support/prompt-enhancer/models/llama/MiniCPM-V-4.6"
if [ -f "$MODEL_DIR/MiniCPM-V-4_6-Q4_K_M.gguf" ]; then
  SZ=$(du -sh "$MODEL_DIR/MiniCPM-V-4_6-Q4_K_M.gguf" | awk '{print $1}')
  ok "model downloaded ($SZ)"
else
  bad "model not downloaded yet (app must download ~500MB on first run / in Settings)"
fi

echo
echo "[4] macOS permissions"
# Accessibility (nut-js keyboard automation needs it)
osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true' >/dev/null 2>&1 && ok "Automation/osascript works" || echo "  ? osascript needs permission (first run prompt)"

echo
echo "== RESULT: $pass passed, $fail failed =="
[ "$fail" -eq 0 ] && echo "ALL CHECKS PASSED - install is healthy" || echo "FIXES NEEDED (see failures above)"
exit $fail
