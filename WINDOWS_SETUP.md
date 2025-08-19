# 🪟 Windows Setup Guide

## Quick Start Options

### Option 1: Interactive Mode (Recommended)
```cmd
# Double-click to run with port selection menu
start.bat

# Or run directly
python app_enhanced.py
```

**Interactive Port Selection Menu:**
```
🌐 PORT SELECTION
======================================================================
🔍 Checking available ports...
   ✅ Port 5000 - Available
   ❌ Port 5001 - In use
   ✅ Port 5002 - Available

📋 Available ports: 5000, 5002, 8000, 8080

Choose an option:
1. 🚀 Auto-select first available port (Recommended)
2. 📋 Choose from available ports  
3. ⚙️  Enter custom port
4. ❌ Exit

👉 Enter your choice (1-4): 
```

### Option 2: Specific Port
```cmd
# Batch file with port
start.bat 8080

# PowerShell with port
start.ps1 -Port 8080

# Python with port
python app_enhanced.py 5000
```

### Option 3: PowerShell Script
```powershell
# Interactive mode
start.ps1

# Specific port
start.ps1 -Port 8080
```

## Creating Windows Executable

### Step 1: Install PyInstaller
```cmd
pip install pyinstaller
```

### Step 2: Create Executable
```cmd
python create_exe.py
```

This creates:
- `dist/SCP_Web_Transfer.exe` - Main executable with interactive port selection
- `dist/start.bat` - Interactive launcher
- `dist/start_with_port.bat` - Port-specific launcher
- `installer.nsi` - NSIS installer script

### Step 3: Using the Executable
```cmd
# Interactive mode
SCP_Web_Transfer.exe

# Specific port
SCP_Web_Transfer.exe 8080

# Using launchers
start.bat                    # Interactive
start_with_port.bat 8080    # Specific port
```

## Port Selection Features

### Automatic Detection
- ✅ Scans ports 5000, 5001, 5002, 8000, 8080, 8888, 9000
- ✅ Shows which ports are available/in use
- ✅ Auto-selects first available port
- ✅ Handles port conflicts gracefully

### Interactive Options
1. **Auto-select** - Fastest option, uses first available port
2. **Choose from list** - Pick from available ports
3. **Custom port** - Enter any port (1024-65535)
4. **Exit** - Cancel startup

### Smart Fallbacks
- If preferred ports busy → finds alternative
- If custom port busy → asks for another
- If no ports available → shows error with suggestions

## File Structure
```
📁 Project/
├── 🚀 start.bat              # Interactive Windows launcher
├── 🚀 start.ps1              # Interactive PowerShell launcher  
├── 🚀 start.sh               # Linux/macOS launcher
├── 🔧 create_exe.py          # Executable creator
├── 📱 app_enhanced.py        # Main application (with interactive port selection)
├── 📋 requirements.txt       # Python dependencies
├── 📁 templates/             # HTML templates
├── 📁 static/                # CSS/JS files
└── 📁 dist/                  # Built executables
    ├── SCP_Web_Transfer.exe  # Standalone exe with port selection
    ├── start.bat             # Interactive launcher
    └── start_with_port.bat   # Port-specific launcher
```

## Usage Examples

### Interactive Mode
```cmd
C:\> start.bat
🚀 SCP Web Transfer - Enhanced Version
==================================================
🌐 PORT SELECTION
======================================================================
🔍 Checking available ports...
   ✅ Port 5000 - Available
   ❌ Port 5001 - In use
   ✅ Port 5002 - Available

👉 Enter your choice (1-4): 1
✅ Auto-selected port: 5000

🌐 Server starting on port: 5000
📍 Access URLs:
   • Local:   http://localhost:5000
   • Network: http://192.168.1.100:5000
```

### Direct Port
```cmd
C:\> start.bat 8080
🌐 Starting on specified port 8080...
✅ Port 8080 is available

🌐 Server starting on port: 8080
```

### Executable Mode
```cmd
C:\> SCP_Web_Transfer.exe
🚀 SCP Web Transfer - Enhanced Version
==================================================
🔍 Auto-selecting available port...
✅ Auto-selected port: 5000
```

## Troubleshooting

### Python Not Found
```cmd
# Download from: https://python.org
# Make sure to check "Add Python to PATH" during installation
```

### All Ports Busy
```
⚠️  All preferred ports are busy!
🔍 Finding any available port...
✅ Found available port: 5847
```

### Permission Issues
```cmd
# Run as Administrator if needed
# Right-click → "Run as administrator"
```

### Firewall Issues
```cmd
# Allow Python/SCP_Web_Transfer through Windows Firewall when prompted
# Or manually add exception for the selected port
```

## Advanced Usage

### Environment Variables
```cmd
set SCP_DEFAULT_PORT=8080
start.bat
```

### Development Mode
```cmd
set FLASK_ENV=development
python app_enhanced.py
```

### Custom Port Range
```python
# Edit app_enhanced.py
preferred_ports = [8000, 8001, 8002, 9000, 9001]
```
