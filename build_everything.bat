@echo off
:: Check for administrative privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [SUCCESS] Running with administrative privileges.
) else (
    echo [INFO] Requesting administrative privileges...
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"
echo ======================================================
echo    QURAN TOOL - COMPREHENSIVE BUILD (PC + MOBILE)
echo ======================================================
echo.
echo [1/2] Starting Build Process...
echo.

call npm run build:all

echo.
echo ======================================================
echo    BUILD FINISHED! 
echo    PC: Check 'dist-electron'
echo    Mobile: Check 'android/app/build/outputs/apk/debug'
echo ======================================================
pause
