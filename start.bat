@echo off
title RetinaVision-AI Full Stack Launcher
echo ========================================================
echo Starting RetinaVision-AI Backend and Frontend Services...
echo ========================================================

if exist "%~dp0.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
) else (
    set "PYTHON_EXE=python"
)

start "RetinaVision Backend (FastAPI)" cmd /k "cd /d %~dp0backend && "%PYTHON_EXE%" run_backend.py"
timeout /t 3 /nobreak >nul

start "RetinaVision Frontend (Vite/React)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both services are starting:
echo  - Backend API: http://localhost:8000 (Docs: http://localhost:8000/docs)
echo  - Frontend Web App: http://localhost:5173
echo.
pause
