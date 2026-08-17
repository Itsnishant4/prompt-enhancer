<#
.SYNOPSIS
    Prompt Enhancer Windows Build Script
.DESCRIPTION
    Builds the Windows installer (NSIS) and portable version of Prompt Enhancer
.EXAMPLE
    .\scripts\build-win.ps1
#>

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Prompt Enhancer Windows Builder" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "[INFO] Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org" -ForegroundColor Red
    pause
    exit 1
}

# Check pnpm
try {
    $pnpmVersion = pnpm --version
    Write-Host "[INFO] pnpm version: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "[INFO] pnpm not found, installing..." -ForegroundColor Yellow
    npm install -g pnpm
}

# Check if makensis is available (for NSIS)
try {
    $nsisVersion = & "makensis" /VERSION 2>$null
    Write-Host "[INFO] NSIS version: $nsisVersion" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] NSIS compiler (makensis) not found in PATH." -ForegroundColor Yellow
    Write-Host "[WARNING] electron-builder will use its bundled NSIS." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[STEP 1/6] Installing dependencies..." -ForegroundColor Magenta
& pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to install dependencies" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "[DONE] Dependencies installed" -ForegroundColor Green

Write-Host ""
Write-Host "[STEP 2/6] Cleaning previous builds..." -ForegroundColor Magenta
$null = Remove-Item -Path "dist", "release", "out" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "[DONE] Cleaned" -ForegroundColor Green

Write-Host ""
Write-Host "[STEP 3/6] Running type check..." -ForegroundColor Magenta
& npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Type check found errors, attempting build anyway..." -ForegroundColor Yellow
} else {
    Write-Host "[DONE] Type check passed" -ForegroundColor Green
}

Write-Host ""
Write-Host "[STEP 4/6] Building electron-vite..." -ForegroundColor Magenta
& npx electron-vite build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Build failed" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "[DONE] Build complete" -ForegroundColor Green

Write-Host ""
Write-Host "[STEP 5/6] Creating Windows Installer (NSIS)..." -ForegroundColor Magenta
& npx electron-builder --win --x64 --config package.json
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Installer build failed" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "[DONE] Installer created" -ForegroundColor Green

Write-Host ""
Write-Host "[STEP 6/6] Build Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# List all built artifacts
$releaseDir = Join-Path -Path $PWD.Path -ChildPath "release"
if (Test-Path $releaseDir) {
    $artifacts = Get-ChildItem -Path $releaseDir -Recurse -Filter "*.exe" -ErrorAction SilentlyContinue
    foreach ($artifact in $artifacts) {
        $sizeInMB = [math]::Round($artifact.Length / 1MB, 2)
        Write-Host "[SUCCESS] $($artifact.Name)" -ForegroundColor Green
        Write-Host "         Location: $($artifact.FullName)" -ForegroundColor Gray
        Write-Host "         Size: ${sizeInMB} MB" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Also list any blockmap files
    $blockmaps = Get-ChildItem -Path $releaseDir -Recurse -Filter "*.blockmap" -ErrorAction SilentlyContinue
    foreach ($blockmap in $blockmaps) {
        $sizeInKB = [math]::Round($blockmap.Length / 1KB, 1)
        Write-Host "[INFO] Blockmap: $($blockmap.Name) ($sizeInKB KB)" -ForegroundColor Yellow
    }
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Build completed successfully!" -ForegroundColor Green
Write-Host "  Installers are in the 'release' folder" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Available targets:" -ForegroundColor White
Write-Host "  - NSIS Installer: release\Prompt Enhancer-Setup-*-x64.exe" -ForegroundColor Yellow
Write-Host "  - Portable: release\Prompt Enhancer-Portable-*-x64.exe" -ForegroundColor Yellow
Write-Host ""
Write-Host "Uninstaller:" -ForegroundColor White
Write-Host "  - The installer automatically adds an entry in Windows 'Add or Remove Programs'" -ForegroundColor Gray
Write-Host "  - Or run 'Uninstall Prompt Enhancer.exe' from the installation directory" -ForegroundColor Gray
Write-Host ""

pause