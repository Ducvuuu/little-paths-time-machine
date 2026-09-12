@echo off
rem Little Paths is served rather than opened straight from disk. Browsers only
rem let a served page remember a chosen folder, so this is what lets the Memory
rem Box hold on to your archive between visits.
rem
rem Double-click this file, then leave the window open while you use the phone.
rem Close the window when you are finished.

cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python was not found, so Little Paths cannot start.
  echo Install Python from https://www.python.org/downloads/ and run this again.
  echo.
  pause
  exit /b 1
)

echo Little Paths is running at http://localhost:8731/
echo Leave this window open. Press Ctrl+C to stop.
echo.

start "" http://localhost:8731/
python -m http.server 8731 --bind 127.0.0.1
