@echo off
REM Quick setup script for backend (Windows)

echo.
echo 🚀 Trainer Management Backend Setup
echo =====================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%

REM Navigate to backend directory
cd backend

REM Install dependencies
echo.
echo 📦 Installing dependencies...
echo Please wait, this may take a few minutes...
call npm install

REM Create .env file if it doesn't exist
if not exist .env (
    echo.
    echo 📝 Creating .env file...
    copy .env.example .env
    echo ✅ .env file created. Please update it with your MongoDB connection string.
    echo    Edit: backend\.env
) else (
    echo ✅ .env file already exists.
)

echo.
echo ✅ Backend setup complete!
echo.
echo 📋 Next steps:
echo 1. Update backend\.env with your MongoDB connection string
echo 2. Run 'npm run dev' to start the backend server
echo 3. In another terminal, run 'npm run dev' in the frontend directory
echo.
echo Default backend URL: http://localhost:5000
echo Make sure VITE_API_URL in frontend matches this URL
echo.
pause
