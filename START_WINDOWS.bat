@echo off
cd /d "%~dp0"
title CSE 2231 Midterm Studio
echo Starting CSE 2231 Midterm Studio...
echo Your browser will open at http://127.0.0.1:8765/
echo Press Ctrl+C in this window to stop.
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 app.py
  goto done
)
where python >nul 2>nul
if %errorlevel%==0 (
  python app.py
  goto done
)
echo Python 3.10+ was not found. Install it from https://www.python.org/downloads/
echo and make sure "Add python.exe to PATH" is checked.

:done
pause
