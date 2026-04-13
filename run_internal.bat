@echo off
echo [1/4] Frontend dependency check...
if not exist "node_modules" (
    echo [INFO] node_modules not found. Running npm install...
    npm install
)

echo [2/4] Backend environment check...
if not exist "backend\venv" (
    echo [INFO] Creating Python virtual environment...
    python -m venv backend\venv
)

echo [3/4] Installing backend dependencies...
call backend\venv\Scripts\activate
pip install -r backend\requirements.txt

echo [4/4] Starting Internal Host (Backend + Frontend)...

:: Start backend in a new window
start "Adot-Workflow Backend" cmd /k "echo Starting Backend... && cd backend && ..\backend\venv\Scripts\activate && python main.py"

:: Start frontend in current window
echo [INFO] Starting Frontend...
npm run dev

pause
