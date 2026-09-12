@echo off
cd /d "%~dp0"
echo ===================================================
echo     Pushing RouteMind AI to GitHub Repository       
echo ===================================================
echo.
echo Remote repository: https://github.com/salahuddin9123/RouteMind-AI.git
echo.

"C:\Program Files\Git\cmd\git.exe" push -u origin main
if errorlevel 1 (
    echo.
    echo [ERROR] Push failed. If prompted, please click "Sign in with your browser" in the popup.
    echo.
) else (
    echo.
    echo [SUCCESS] Project pushed successfully to GitHub!
    echo.
)

pause
