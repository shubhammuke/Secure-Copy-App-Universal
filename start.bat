@echo off
title SCP Web Transfer - Enhanced Version
color 0A

echo.
echo ======================================================================
echo 🚀 SCP Web Transfer - Enhanced Version Starting
echo ======================================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.6+ from https://python.org
    echo.
    pause
    exit /b 1
)

REM Check if pip is available
pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pip is not available
    echo Please ensure pip is installed with Python
    echo.
    pause
    exit /b 1
)

echo ✅ Python detected
echo.

REM Install requirements if they don't exist
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
)

echo 🔧 Activating virtual environment...
call venv\Scripts\activate.bat

echo 📦 Installing/updating requirements...
pip install -r requirements.txt >nul 2>&1
if errorlevel 1 (
    echo ❌ Failed to install requirements
    pause
    exit /b 1
)

echo.

REM Check if port is provided as argument
if "%1"=="" (
    echo 🌐 Starting with interactive port selection...
    python app_enhanced.py
) else (
    echo 🌐 Starting on specified port %1...
    python app_enhanced.py %1
)

if errorlevel 1 (
    echo.
    echo ❌ Failed to start server
    echo 💡 Common solutions:
    echo    - Try running as Administrator
    echo    - Check if antivirus is blocking Python
    echo    - Ensure no other applications are using the port
    echo.
)

echo.
echo 🛑 Server stopped
echo 👋 Thank you for using SCP Web Transfer!
pause
