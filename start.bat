@echo off
REM Secure Copy App Universal v2.0 - Windows Batch Launcher
REM Simple alternative to PowerShell script

title Secure Copy App Universal v2.0

echo.
echo ======================================================================
echo 🚀 Secure Copy App Universal v2.0 - Starting Up
echo ======================================================================
echo.
echo ✨ Features: Transfer Cancellation ^| Windows WSL ^| GitHub Integration
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo.
    echo 💡 To fix this:
    echo    1. Download Python from https://python.org/downloads/
    echo    2. During installation, check 'Add Python to PATH'
    echo    3. Restart Command Prompt after installation
    echo.
    pause
    exit /b 1
)

REM Get Python version
for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYTHON_VERSION=%%i
echo ✅ Python found: %PYTHON_VERSION%

REM Check if pip is available
pip --version >nul 2>&1
if errorlevel 1 (
    echo ❌ pip is not available
    echo 💡 pip should be included with Python 3.4+
    echo.
    pause
    exit /b 1
)

echo ✅ pip is available

REM Check if we're in the right directory
if not exist "app_enhanced.py" (
    echo ❌ app_enhanced.py not found
    echo 💡 Make sure you're running this from the project directory
    echo.
    pause
    exit /b 1
)

if not exist "requirements.txt" (
    echo ❌ requirements.txt not found
    echo 💡 Make sure you're running this from the project directory
    echo.
    pause
    exit /b 1
)

echo.

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        echo 💡 Try running as Administrator
        echo.
        pause
        exit /b 1
    )
    echo ✅ Virtual environment created
) else (
    echo ✅ Virtual environment already exists
)

REM Activate virtual environment
echo 🔧 Activating virtual environment...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
    echo ✅ Virtual environment activated
) else (
    echo ⚠️  Virtual environment activation failed, continuing anyway...
)

REM Install requirements
echo 📦 Installing/updating Python packages...
pip install -r requirements.txt >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Some packages may have issues, but continuing...
) else (
    echo ✅ All packages installed successfully
)

echo.
echo ======================================================================
echo 🌐 STARTING SECURE COPY APP UNIVERSAL
echo ======================================================================
echo.
echo 🚀 Starting with interactive port selection...
echo 💡 The application will automatically find an available port
echo.

REM Start the application
python app_enhanced.py

echo.
echo ======================================================================
echo 🛑 Secure Copy App Universal Stopped
echo ======================================================================
echo.
echo 🙏 Thank you for using Secure Copy App Universal v2.0!
echo 🌟 Star us on GitHub: https://github.com/shubhammuke/Secure-Copy-App-Universal
echo.
pause
