@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ===================================================
echo     RouteMind AI - Automated Git Sync & Deploy      
echo ===================================================
echo.
echo Remote: https://github.com/salahuddin9123/RouteMind-AI.git
echo.

:: Check for Git
where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git is not installed or not in PATH.
    pause
    exit /b 1
)

:: Check for changes
echo [1/4] Checking repository status...
git status --short > "%temp%\git_status.tmp"
set /p STATUS=<"%temp%\git_status.tmp"
del "%temp%\git_status.tmp"

if "%STATUS%"=="" (
    echo No uncommitted changes found. Checking for unpushed commits...
) else (
    echo [2/4] Staging all modified and new files...
    git add -A

    set /p COMMIT_MSG="Enter commit message (Press Enter for auto-message): "
    if "!COMMIT_MSG!"=="" (
        for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set MYDATE=%%c-%%a-%%b)
        for /f "tokens=1-2 delims=: " %%a in ('time /t') do (set MYTIME=%%a:%%b)
        set COMMIT_MSG=Auto-update: RouteMind AI updates (!MYDATE! !MYTIME!)
    )

    echo [3/4] Committing changes: "!COMMIT_MSG!"...
    git commit -m "!COMMIT_MSG!"
)

echo.
echo [4/4] Pushing to GitHub (origin main)...
git push origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Push failed. Attempting to pull remote changes and re-push...
    git pull --rebase origin main
    git push origin main
    if errorlevel 1 (
        echo [ERROR] Could not push to GitHub. Please check your GitHub credentials or internet connection.
        pause
        exit /b 1
    )
)

echo.
echo ===================================================
echo   [SUCCESS] Code successfully pushed to GitHub!
echo ===================================================
echo.
echo Your hosting provider (Vercel / Render) has detected
echo this push and is now automatically rebuilding and 
echo deploying your live updates.
echo.
pause
