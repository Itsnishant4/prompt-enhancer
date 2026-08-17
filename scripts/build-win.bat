@echo off
REM ============================================
REM  Prompt Enhancer - Windows Build Script
REM  Builds the installer and portable versions
REM ============================================

echo ============================================
echo  Prompt Enhancer Windows Builder
echo ============================================
echo.

REM Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed. Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=2" %%I in ('node -v') do set NODE_VERSION=%%I
echo [INFO] Node.js version: %NODE_VERSION%

REM Check for pnpm
where pnpm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] pnpm not found, installing...
    npm install -g pnpm
)

echo.
echo [STEP 1/6] Installing dependencies...
call pnpm install
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)
echo [DONE] Dependencies installed

echo.
echo [STEP 2/6] Cleaning previous builds...
call npx rimraf dist release out
echo [DONE] Cleaned

echo.
echo [STEP 3/6] Running type check...
call npx tsc --noEmit
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Type check found errors, attempting build anyway...
) else (
    echo [DONE] Type check passed
)

echo.
echo [STEP 4/6] Building electron-vite...
call npx electron-vite build
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [DONE] Build complete

echo.
echo [STEP 5/6] Creating Windows Installer (NSIS)...
call npx electron-builder --win --x64 --config electron-builder.yml
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Installer build failed
    pause
    exit /b 1
)
echo [DONE] Installer created

echo.
echo [STEP 6/6] Build Summary
echo ============================================
echo.

REM Find the installer file
for /r %%i in (release\*.exe) do (
    if "%%~xi"==".exe" (
        echo [SUCCESS] Installer: %%~nxi
        echo [SUCCESS] Location: %%~fi
        echo [SUCCESS] Size: %%~zi bytes
    )
)

REM Find portable file
for /r %%i in (release\*.exe) do (
    echo %%i | find /i "Portable" >nul
    if !ERRORLEVEL! EQU 0 (
        echo [SUCCESS] Portable: %%~nxi
    )
)

echo.
echo ============================================
echo  Build completed successfully!
echo  Installers are in the 'release' folder
echo ============================================
echo.
echo Available targets:
echo   - NSIS Installer: release\Prompt Enhancer-Setup-*-x64.exe
echo   - Portable: release\Prompt Enhancer-Portable-*-x64.exe
echo.
pause