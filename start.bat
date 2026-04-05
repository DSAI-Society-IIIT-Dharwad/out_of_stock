@echo off
setlocal

echo ============================================
echo  PriceSentinel - Starting All Services
echo ============================================

@REM REM Add UV to PATH for this session
@REM set "Path=C:\Users\SHREEYA\.local\bin;%Path%"

REM ── 1. Backend: install deps if needed, then start FastAPI ──
echo.
echo [1/3] Setting up backend...
cd /d "%~dp0backend"

echo Using UV package manager...
call uv sync --quiet
if %errorlevel% neq 0 (
    echo ERROR: uv sync failed for backend
    pause
    exit /b 1
)

echo [2/3] Starting backend (FastAPI on http://localhost:8000) ...
start "PriceSentinel Backend" cmd /k "set Path=C:\Users\SHREEYA\.local\bin;%Path% && uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

REM ── 2. Frontend: install deps if needed, then start Vite ──
echo.
echo [3/3] Setting up and starting frontend (Vite on http://localhost:5173) ...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Installing frontend dependencies...
    call npm install --legacy-peer-deps
    if %errorlevel% neq 0 (
        echo ERROR: npm install failed for frontend
        pause
        exit /b 1
    )
)

start "PriceSentinel Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo  Services started:
echo    Backend  -> http://localhost:8000
echo    API Docs -> http://localhost:8000/docs
echo    Frontend -> http://localhost:5173
echo    ML Predict Tab -> http://localhost:5173/predict
echo ============================================
echo.
echo Close the opened terminal windows to stop the services.
pause
