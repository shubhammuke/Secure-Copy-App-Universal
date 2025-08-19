# SCP Web Transfer - Enhanced Version PowerShell Startup Script
# Secure Copy App Universal v2.0
# Run with: powershell -ExecutionPolicy Bypass -File start.ps1

param(
    [int]$Port = 0,
    [switch]$Help
)

# Show help if requested
if ($Help) {
    Write-Host ""
    Write-Host "🚀 Secure Copy App Universal v2.0 - PowerShell Launcher" -ForegroundColor Cyan
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Green
    Write-Host "  .\start.ps1                    # Interactive port selection"
    Write-Host "  .\start.ps1 -Port 5000         # Use specific port"
    Write-Host "  .\start.ps1 -Help              # Show this help"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File start.ps1"
    Write-Host "  powershell -ExecutionPolicy Bypass -File start.ps1 -Port 8080"
    Write-Host ""
    exit 0
}

# Set window title
$Host.UI.RawUI.WindowTitle = "Secure Copy App Universal v2.0"

# Clear screen for better presentation
Clear-Host

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🚀 Secure Copy App Universal v2.0 - Starting Up" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ Features: Transfer Cancellation | Windows WSL | GitHub Integration" -ForegroundColor Magenta
Write-Host ""

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Check administrator status
$isAdmin = Test-Administrator
if ($isAdmin) {
    Write-Host "🔑 Running as Administrator: YES" -ForegroundColor Green
} else {
    Write-Host "⚠️  Running as Administrator: NO (may cause permission issues)" -ForegroundColor Yellow
}

Write-Host ""

# Check PowerShell version
$psVersion = $PSVersionTable.PSVersion
Write-Host "🔧 PowerShell Version: $($psVersion.Major).$($psVersion.Minor)" -ForegroundColor Cyan

# Check execution policy
$executionPolicy = Get-ExecutionPolicy
Write-Host "🛡️  Execution Policy: $executionPolicy" -ForegroundColor Cyan

Write-Host ""

# Check if Python is installed and get version
Write-Host "🔍 Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonCmd = Get-Command python -ErrorAction Stop
    $pythonVersion = & python --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
        Write-Host "📍 Location: $($pythonCmd.Source)" -ForegroundColor Gray
    } else {
        throw "Python version check failed"
    }
} catch {
    Write-Host "❌ Python is not installed or not in PATH" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 To fix this:" -ForegroundColor Yellow
    Write-Host "   1. Download Python from https://python.org/downloads/" -ForegroundColor White
    Write-Host "   2. During installation, check 'Add Python to PATH'" -ForegroundColor White
    Write-Host "   3. Restart PowerShell after installation" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if pip is available
Write-Host "🔍 Checking pip installation..." -ForegroundColor Yellow
try {
    $pipVersion = & pip --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ pip found: $pipVersion" -ForegroundColor Green
    } else {
        throw "pip version check failed"
    }
} catch {
    Write-Host "❌ pip is not available" -ForegroundColor Red
    Write-Host "💡 pip should be included with Python 3.4+" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""

# Check if requirements.txt exists
if (-not (Test-Path "requirements.txt")) {
    Write-Host "❌ requirements.txt not found" -ForegroundColor Red
    Write-Host "💡 Make sure you're running this script from the project directory" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if app_enhanced.py exists
if (-not (Test-Path "app_enhanced.py")) {
    Write-Host "❌ app_enhanced.py not found" -ForegroundColor Red
    Write-Host "💡 Make sure you're running this script from the project directory" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Create virtual environment if it doesn't exist
if (-not (Test-Path "venv")) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
    try {
        & python -m venv venv
        if ($LASTEXITCODE -ne 0) {
            throw "Virtual environment creation failed"
        }
        Write-Host "✅ Virtual environment created successfully" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to create virtual environment: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "💡 Try running as Administrator or check Python installation" -ForegroundColor Yellow
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit 1
    }
} else {
    Write-Host "✅ Virtual environment already exists" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "🔧 Activating virtual environment..." -ForegroundColor Yellow
$activateScript = "venv\Scripts\Activate.ps1"

if (Test-Path $activateScript) {
    try {
        & $activateScript
        Write-Host "✅ Virtual environment activated" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Could not activate virtual environment, continuing anyway..." -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  Virtual environment activation script not found, continuing anyway..." -ForegroundColor Yellow
}

# Install/update requirements
Write-Host "📦 Installing/updating Python packages..." -ForegroundColor Yellow
try {
    $pipOutput = & pip install -r requirements.txt 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All packages installed successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some packages may have issues, but continuing..." -ForegroundColor Yellow
        Write-Host "Output: $pipOutput" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to install packages: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "💡 Try running as Administrator or check internet connection" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "🌐 STARTING SECURE COPY APP UNIVERSAL" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

# Start the application
try {
    if ($Port -eq 0) {
        Write-Host "🚀 Starting with interactive port selection..." -ForegroundColor Green
        Write-Host "💡 The application will automatically find an available port" -ForegroundColor Cyan
        Write-Host ""
        & python app_enhanced.py
    } else {
        Write-Host "🚀 Starting on specified port $Port..." -ForegroundColor Green
        Write-Host ""
        & python app_enhanced.py $Port
    }
} catch {
    Write-Host ""
    Write-Host "❌ Failed to start server: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Troubleshooting steps:" -ForegroundColor Yellow
    Write-Host "   1. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "   2. Check Windows Firewall settings" -ForegroundColor White
    Write-Host "   3. Ensure antivirus isn't blocking Python" -ForegroundColor White
    Write-Host "   4. Try a different port: .\start.ps1 -Port 8080" -ForegroundColor White
    Write-Host "   5. Check if another application is using the port" -ForegroundColor White
    Write-Host ""
} finally {
    Write-Host ""
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host "🛑 Secure Copy App Universal Stopped" -ForegroundColor Red
    Write-Host "======================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🙏 Thank you for using Secure Copy App Universal v2.0!" -ForegroundColor Green
    Write-Host "🌟 Star us on GitHub: https://github.com/shubhammuke/Secure-Copy-App-Universal" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Press Enter to exit"
}
