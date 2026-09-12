@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ===================================================
echo        Starting RouteMind AI Application       
echo ===================================================
echo.

echo [1/4] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ and restart your computer.
    pause
    exit /b 1
)
echo Node.js found.
echo.

echo [2/4] Installing backend dependencies...
cd server
if not exist "node_modules\" (
    call npm install
) else (
    echo Backend dependencies already installed.
)
cd ..
echo.

echo [3/4] Installing frontend dependencies...
if not exist "node_modules\" (
    call npm install
) else (
    echo Frontend dependencies already installed.
)
echo.

echo [4/4] Starting servers...
echo.

:: Start backend in a separate window
start "RouteMind Backend" cmd /c "cd server && npm start"

:: Wait 3 seconds
timeout /t 3 /nobreak >nul

:: Open browser
start "" "http://localhost:5173"

:: Start frontend Vite server
call npm run dev

pause
