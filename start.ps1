# SCP Web Transfer - Enhanced Version PowerShell Startup Script
# Run with: powershell -ExecutionPolicy Bypass -File start.ps1

param(
    [int]$Port = 0
)

$Host.UI.RawUI.WindowTitle = "SCP Web Transfer - Enhanced Version"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🚀 SCP Web Transfer - Enhanced Version Starting" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python detected: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Python 3.6+ from https://python.org" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if pip is available
try {
    $pipVersion = pip --version 2>&1
    Write-Host "✅ pip detected: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pip is not available" -ForegroundColor Red
    Write-Host "Please ensure pip is installed with Python" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
& "venv\Scripts\Activate.ps1"

# Install requirements
Write-Host "📦 Installing/updating requirements..." -ForegroundColor Yellow
pip install -r requirements.txt | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install requirements" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Start server
try {
    if ($Port -eq 0) {
        Write-Host "🌐 Starting with interactive port selection..." -ForegroundColor Green
        python app_enhanced.py
    } else {
        Write-Host "🌐 Starting on specified port $Port..." -ForegroundColor Green
        python app_enhanced.py $Port
    }
} catch {
    Write-Host ""
    Write-Host "❌ Failed to start server" -ForegroundColor Red
    Write-Host "💡 Common solutions:" -ForegroundColor Yellow
    Write-Host "   - Try running as Administrator" -ForegroundColor Yellow
    Write-Host "   - Check if antivirus is blocking Python" -ForegroundColor Yellow
    Write-Host "   - Ensure no other applications are using the port" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host ""
Write-Host "🛑 Server stopped" -ForegroundColor Red
Write-Host "👋 Thank you for using SCP Web Transfer!" -ForegroundColor Green
Read-Host "Press Enter to exit"
