# 🪟 PowerShell Script Usage Guide - Secure Copy App Universal

## 🚀 Quick Start

### Method 1: Right-Click Method (Easiest)
1. **Navigate** to the project folder in File Explorer
2. **Right-click** on `start.ps1`
3. **Select** "Run with PowerShell"
4. **Allow** execution if prompted

### Method 2: PowerShell Command (Recommended)
1. **Open PowerShell** (Windows key + X, then select "Windows PowerShell" or "Terminal")
2. **Navigate** to project directory:
   ```powershell
   cd "C:\path\to\Secure-Copy-App-Universal"
   ```
3. **Run** the script:
   ```powershell
   powershell -ExecutionPolicy Bypass -File start.ps1
   ```

### Method 3: Direct PowerShell Execution
1. **Open PowerShell as Administrator** (recommended)
2. **Navigate** to project directory
3. **Run** directly:
   ```powershell
   .\start.ps1
   ```

## 🔧 Advanced Usage

### With Specific Port
```powershell
.\start.ps1 -Port 8080
```

### Show Help
```powershell
.\start.ps1 -Help
```

### With Execution Policy Bypass
```powershell
powershell -ExecutionPolicy Bypass -File start.ps1 -Port 5000
```

## 🛠️ Troubleshooting

### Problem 1: "Execution Policy" Error
**Error**: `cannot be loaded because running scripts is disabled on this system`

**Solutions**:
1. **Temporary Fix** (Recommended):
   ```powershell
   powershell -ExecutionPolicy Bypass -File start.ps1
   ```

2. **Permanent Fix** (Run as Administrator):
   ```powershell
   Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **One-time Fix**:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process
   .\start.ps1
   ```

### Problem 2: "Python not found" Error
**Solutions**:
1. **Install Python**:
   - Download from [python.org](https://python.org/downloads/)
   - ✅ **IMPORTANT**: Check "Add Python to PATH" during installation
   - Restart PowerShell after installation

2. **Verify Installation**:
   ```powershell
   python --version
   pip --version
   ```

3. **Manual PATH Addition**:
   - Open System Properties → Environment Variables
   - Add Python installation path to PATH variable
   - Restart PowerShell

### Problem 3: Permission Denied
**Solutions**:
1. **Run as Administrator**:
   - Right-click PowerShell → "Run as Administrator"
   - Navigate to project folder and run script

2. **Check Antivirus**:
   - Temporarily disable antivirus
   - Add Python and project folder to antivirus exceptions

3. **Windows Defender**:
   - Add project folder to Windows Defender exclusions

### Problem 4: Port Already in Use
**Solutions**:
1. **Use Different Port**:
   ```powershell
   .\start.ps1 -Port 8080
   ```

2. **Find Available Ports**:
   ```powershell
   netstat -an | findstr :5000
   ```

3. **Kill Process Using Port**:
   ```powershell
   netstat -ano | findstr :5000
   taskkill /PID <PID_NUMBER> /F
   ```

### Problem 5: Virtual Environment Issues
**Solutions**:
1. **Delete and Recreate**:
   ```powershell
   Remove-Item -Recurse -Force venv
   .\start.ps1
   ```

2. **Manual Virtual Environment**:
   ```powershell
   python -m venv venv
   venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python app_enhanced.py
   ```

## 🔍 Detailed Steps

### Step 1: Prerequisites Check
Before running the script, ensure you have:
- ✅ **Windows 10/11**
- ✅ **Python 3.6+** installed with PATH configured
- ✅ **PowerShell 5.0+** (usually pre-installed)
- ✅ **Internet connection** for package installation

### Step 2: Download Project
```powershell
# Option 1: Git clone
git clone https://github.com/shubhammuke/Secure-Copy-App-Universal.git
cd Secure-Copy-App-Universal

# Option 2: Download ZIP
# Extract ZIP file to desired location
cd "C:\path\to\extracted\folder"
```

### Step 3: Run PowerShell Script
```powershell
# Method 1: With execution policy bypass (safest)
powershell -ExecutionPolicy Bypass -File start.ps1

# Method 2: Direct execution (if policy allows)
.\start.ps1

# Method 3: With specific port
.\start.ps1 -Port 8080
```

### Step 4: Access Application
Once started, the script will display:
```
🌐 Server running at: http://localhost:5000
📱 Network access: http://192.168.1.100:5000
```

Open your browser and navigate to the displayed URL.

## 🎯 What the Script Does

1. **🔍 System Check**: Verifies Python, pip, and PowerShell versions
2. **📦 Environment Setup**: Creates virtual environment if needed
3. **⬇️ Dependencies**: Installs required Python packages
4. **🚀 Launch**: Starts the Secure Copy App Universal server
5. **🌐 Access**: Provides URLs for local and network access

## 🔒 Security Notes

### Execution Policy
- **RemoteSigned**: Allows local scripts, requires signature for downloaded scripts
- **Bypass**: Temporarily allows all scripts (used in our command)
- **Restricted**: Default, blocks all scripts

### Safe Usage
```powershell
# Safest method - doesn't change system policy
powershell -ExecutionPolicy Bypass -File start.ps1
```

## 📋 Command Reference

### Basic Commands
```powershell
# Start with interactive port selection
.\start.ps1

# Start on specific port
.\start.ps1 -Port 8080

# Show help
.\start.ps1 -Help

# With execution policy bypass
powershell -ExecutionPolicy Bypass -File start.ps1
```

### System Commands
```powershell
# Check Python installation
python --version
pip --version

# Check PowerShell version
$PSVersionTable.PSVersion

# Check execution policy
Get-ExecutionPolicy

# Set execution policy (as Administrator)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Network Commands
```powershell
# Check if port is in use
netstat -an | findstr :5000

# Find process using port
netstat -ano | findstr :5000

# Kill process by PID
taskkill /PID <PID> /F
```

## 🎉 Success Indicators

When the script runs successfully, you'll see:
```
✅ Python found: Python 3.x.x
✅ pip found: pip x.x.x
✅ Virtual environment activated
✅ All packages installed successfully
🚀 Starting with interactive port selection...
🌐 Server running at: http://localhost:5000
```

## 📞 Getting Help

If you're still having issues:

1. **Check the error message** displayed by the script
2. **Run as Administrator** to eliminate permission issues
3. **Verify Python installation** with `python --version`
4. **Check antivirus settings** - add Python to exceptions
5. **Try different port** with `-Port 8080` parameter
6. **Report issues** on [GitHub](https://github.com/shubhammuke/Secure-Copy-App-Universal/issues)

## 🌟 Pro Tips

1. **Always use execution policy bypass** for safety:
   ```powershell
   powershell -ExecutionPolicy Bypass -File start.ps1
   ```

2. **Run as Administrator** to avoid permission issues

3. **Add to Windows Defender exclusions** for better performance

4. **Use specific ports** if default ports are busy:
   ```powershell
   .\start.ps1 -Port 8080
   ```

5. **Create desktop shortcut** for easy access:
   ```
   Target: powershell.exe -ExecutionPolicy Bypass -File "C:\path\to\start.ps1"
   Start in: C:\path\to\project\folder
   ```

---

**🎯 The PowerShell script is designed to handle most common issues automatically. If you encounter problems, the script will provide specific guidance for your situation!**
