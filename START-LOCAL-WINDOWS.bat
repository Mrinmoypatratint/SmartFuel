@echo off
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
 echo First time: Creating Python environment...
 py -3.11 -m venv .venv
 if errorlevel 1 (echo Please install Python 3.11 and try again.& pause & exit /b 1)
 .venv\Scripts\python.exe -m pip install -r requirements.txt
 if errorlevel 1 (echo Dependency installation failed.& pause & exit /b 1)
)
.venv\Scripts\python.exe run-local.py
pause
