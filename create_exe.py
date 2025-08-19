#!/usr/bin/env python3
"""
Script to create Windows executable using PyInstaller
Run this on Windows: python create_exe.py
"""

import os
import sys
import subprocess
import shutil

def create_exe():
    print("🔧 Creating Windows executable...")
    
    # Check if PyInstaller is installed
    try:
        import PyInstaller
        print("✅ PyInstaller found")
    except ImportError:
        print("📦 Installing PyInstaller...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    
    # Create spec file content
    spec_content = '''
# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['app_enhanced.py'],
    pathex=[],
    binaries=[],
    datas=[
        ('templates', 'templates'),
        ('static', 'static'),
        ('requirements.txt', '.'),
    ],
    hiddenimports=[
        'flask',
        'paramiko',
        'cryptography',
        'werkzeug',
        'jinja2',
        'markupsafe',
        'itsdangerous',
        'click',
        'bcrypt',
        'cffi',
        'pycparser',
        'six',
        'pynacl',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='SCP_Web_Transfer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='icon.ico' if os.path.exists('icon.ico') else None,
)
'''
    
    # Write spec file
    with open('scp_web_transfer.spec', 'w') as f:
        f.write(spec_content)
    
    print("📝 Created spec file")
    
    # Run PyInstaller
    print("🔨 Building executable...")
    try:
        subprocess.check_call([
            'pyinstaller',
            '--clean',
            '--onefile',
            '--console',
            '--name=SCP_Web_Transfer',
            '--add-data=templates;templates',
            '--add-data=static;static',
            '--add-data=requirements.txt;.',
            '--hidden-import=flask',
            '--hidden-import=paramiko',
            '--hidden-import=cryptography',
            'app_enhanced.py'
        ])
        
        print("✅ Executable created successfully!")
        print("📁 Location: dist/SCP_Web_Transfer.exe")
        
        # Create a simple launcher batch file
        launcher_content = '''@echo off
title SCP Web Transfer
color 0A
echo.
echo ======================================================================
echo 🚀 SCP Web Transfer - Standalone Version
echo ======================================================================
echo.
echo 🌐 Starting application with interactive port selection...
echo.
SCP_Web_Transfer.exe
echo.
echo 🛑 Application stopped
echo 👋 Thank you for using SCP Web Transfer!
pause'''
        
        with open('dist/start.bat', 'w') as f:
            f.write(launcher_content)
        
        # Create a direct launcher for specific port
        direct_launcher = '''@echo off
title SCP Web Transfer - Port %1
color 0A
echo.
echo ======================================================================
echo 🚀 SCP Web Transfer - Standalone Version
echo ======================================================================
echo.
if "%1"=="" (
    echo 🌐 Starting with interactive port selection...
    SCP_Web_Transfer.exe
) else (
    echo 🌐 Starting on port %1...
    SCP_Web_Transfer.exe %1
)
echo.
echo 🛑 Application stopped
pause'''
        
        with open('dist/start_with_port.bat', 'w') as f:
            f.write(direct_launcher)
        
        print("✅ Launcher created: dist/start.bat")
        print("✅ Port launcher created: dist/start_with_port.bat")
        print("💡 Usage:")
        print("   - Double-click start.bat for interactive port selection")
        print("   - Use start_with_port.bat 8080 for specific port")
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to create executable: {e}")
        return False
    
    return True

def create_installer():
    """Create NSIS installer script"""
    nsis_content = '''
; SCP Web Transfer Installer
!define APPNAME "SCP Web Transfer"
!define COMPANYNAME "SCP Web Transfer"
!define DESCRIPTION "Secure file transfer web application"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 0

!include "MUI2.nsh"

Name "${APPNAME}"
OutFile "SCP_Web_Transfer_Installer.exe"
InstallDir "$PROGRAMFILES\\${APPNAME}"
RequestExecutionLevel admin

!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Section "Install"
    SetOutPath $INSTDIR
    File "dist\\SCP_Web_Transfer.exe"
    File "dist\\start.bat"
    
    CreateDirectory "$SMPROGRAMS\\${APPNAME}"
    CreateShortCut "$SMPROGRAMS\\${APPNAME}\\${APPNAME}.lnk" "$INSTDIR\\SCP_Web_Transfer.exe"
    CreateShortCut "$SMPROGRAMS\\${APPNAME}\\Uninstall.lnk" "$INSTDIR\\uninstall.exe"
    CreateShortCut "$DESKTOP\\${APPNAME}.lnk" "$INSTDIR\\SCP_Web_Transfer.exe"
    
    WriteUninstaller "$INSTDIR\\uninstall.exe"
SectionEnd

Section "Uninstall"
    Delete "$INSTDIR\\SCP_Web_Transfer.exe"
    Delete "$INSTDIR\\start.bat"
    Delete "$INSTDIR\\uninstall.exe"
    RMDir "$INSTDIR"
    
    Delete "$SMPROGRAMS\\${APPNAME}\\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\\${APPNAME}\\Uninstall.lnk"
    Delete "$DESKTOP\\${APPNAME}.lnk"
    RMDir "$SMPROGRAMS\\${APPNAME}"
SectionEnd
'''
    
    with open('installer.nsi', 'w') as f:
        f.write(nsis_content)
    
    print("✅ NSIS installer script created: installer.nsi")
    print("ℹ️  Install NSIS and run: makensis installer.nsi")

if __name__ == "__main__":
    print("🚀 SCP Web Transfer - Windows Executable Creator")
    print("=" * 50)
    
    if create_exe():
        print("\n🎉 Success! Your Windows executable is ready!")
        print("\nFiles created:")
        print("- dist/SCP_Web_Transfer.exe (Main executable)")
        print("- dist/start.bat (Simple launcher)")
        print("\nTo create installer:")
        print("1. Install NSIS (https://nsis.sourceforge.io/)")
        print("2. Run: makensis installer.nsi")
        
        create_installer()
    else:
        print("\n❌ Failed to create executable")
        sys.exit(1)
