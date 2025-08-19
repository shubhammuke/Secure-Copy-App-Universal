# 🚀 From Any OS to Linux Servers SCP

<div align="center">

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Python](https://img.shields.io/badge/Python-3.6+-green.svg)
![Flask](https://img.shields.io/badge/Flask-2.3.3+-red.svg)
![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)
![Version](https://img.shields.io/badge/Version-2.0.0-brightgreen.svg)

**A beautiful, secure web-based file transfer application with comprehensive cancellation system**

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [API](#-api-reference) • [Contributing](#-contributing)

</div>

---

## 🎯 Overview

Any OS to Linux Servers SCP is a modern, web-based file transfer application designed for seamless and secure file transfers between clients and Linux servers using the SCP (Secure Copy Protocol) over SSH. 

### 🆕 **Version 2.0 - Transfer Cancellation System**

This major release introduces comprehensive transfer cancellation functionality, resolving critical issues where transfers would get stuck indefinitely. Now users can cancel transfers at any time, and the system automatically detects stuck transfers.

### ✨ **Key Highlights**
- 🛑 **Transfer Cancellation**: Cancel any transfer mid-process
- 🔍 **Stuck Detection**: Auto-detects transfers stuck for 2+ minutes  
- ⚡ **Enhanced Monitoring**: More responsive progress updates
- 🛡️ **Better Error Handling**: Distinguishes cancellation from errors
- 📱 **Professional UI**: Glass morphism design with modern aesthetics

---

## ✨ Features

### 🎨 **Modern UI Design**
- **Windows 7 Aero Theme**: Beautiful glass-like interface with transparency effects
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Dual Panel Layout**: Side-by-side local and remote file views
- **Real-time Progress**: Visual progress indicators with cancellation support

### 🔐 **Secure Authentication**
- **Dual Authentication**: Support for both password and SSH key authentication
- **Encrypted Storage**: Credentials encrypted with Fernet encryption
- **Session Management**: Secure session handling with automatic timeout
- **SSH Key Support**: Upload and use private key files (.pem, .ppk, .key)

### 📁 **Advanced File Management**
- **Full Filesystem Access**: Browse from root directory to all subdirectories
- **Bidirectional Transfer**: Upload and download files seamlessly
- **Batch Operations**: Multiple file selection and transfer
- **Drag & Drop**: Intuitive drag-and-drop file operations
- **File Operations**: Create folders, rename, delete files and directories

### 🧠 **Smart Session Management**
- **Intelligent Keep-Alive**: 15-second lightweight pings with 1-hour idle timeout
- **Transfer-Aware Logic**: No interference during file uploads/downloads
- **Auto-Reconnection**: Smart reconnection with failure tolerance
- **Activity Tracking**: User interaction monitoring for optimal session management

### 🛑 **Transfer Cancellation System** ⭐ NEW
- **Immediate Cancellation**: Cancel transfers instantly with API integration
- **Stuck Transfer Detection**: Automatic detection of transfers with no progress
- **Smart Monitoring**: Enhanced progress tracking with timeout handling
- **User Feedback**: Clear messages about cancellation status

### 🌐 **Cross-Platform Compatibility**
- **macOS Optimized**: Native support for macOS with AirDrop conflict resolution
- **Linux Server Support**: Full compatibility with Linux servers
- **Windows Support**: Complete Windows compatibility with PowerShell scripts
- **Smart Port Selection**: Auto-selects from available ports (5000, 5001, 5002, 8000, 8080, 8888, 9000)

---

## 🚀 Quick Start

### **One-Command Setup**
```bash
# Clone the repository
git clone https://github.com/yourusername/macos-to-linux-servers-scp.git
cd macos-to-linux-servers-scp

# Start with interactive port selection
./start.sh
```

### **Alternative Setup Methods**

#### **Option 1: Automatic Setup (Recommended)**
```bash
# Extract if using zip file
unzip macos-to-linux-scp-with-cancel-fix.zip
cd macos-to-linux-servers-scp

# Run the start script (auto-installs dependencies)
./start.sh
```

#### **Option 2: Manual Setup**
```bash
# Install Python dependencies
pip3 install -r requirements.txt

# Start the application
python3 app_enhanced.py
```

#### **Option 3: Windows Setup**
```cmd
# Run the batch file
start.bat

# Or run PowerShell script
powershell -ExecutionPolicy Bypass -File start.ps1
```

### **Access the Application**
After starting, the application will be available at:
- **Local**: `http://localhost:5000` (or next available port)
- **Network**: `http://[your-ip]:5000`

---

## 📖 Usage Guide

### 🔐 **Authentication Methods**

#### **Password Authentication:**
1. Enter server IP/hostname and port (default: 22)
2. Provide username and password
3. Optionally save credentials securely
4. Test connection and connect

#### **SSH Key Authentication:**
1. Upload your SSH private key file
2. Enter server details and username
3. Test and connect

### 📁 **File Operations**

#### **Navigation:**
- **Left Panel**: Local files (your system)
- **Right Panel**: Remote files (Linux server)
- **Navigation Buttons**: Back, Up, Users, Root, Refresh
- **Breadcrumb**: Click path segments for quick navigation

#### **File Transfers:**
- **Download**: Select remote files → Click "⬇️ Download to Local"
- **Upload**: Select local files → Click "⬆️ Upload to Remote"
- **Drag & Drop**: Drag files between panels
- **Cancel Transfer**: Click "❌ Cancel Transfer" button anytime ⭐ NEW

#### **File Management:**
- **Create Folders**: Use "📁 New Folder" button
- **Rename**: Select file/folder → Click "✏️ Rename"
- **Delete**: Select items → Click "🗑️ Delete"
- **Multiple Selection**: Click multiple files for batch operations

### 🛑 **New Cancellation Features** ⭐

#### **Manual Cancellation:**
1. Start any file transfer (upload/download)
2. Click the **"❌ Cancel Transfer"** button in the progress modal
3. Transfer stops immediately with confirmation message

#### **Automatic Stuck Detection:**
- System monitors progress every 5 seconds
- If no progress for 2 minutes, automatically offers cancellation
- Prevents indefinitely stuck transfers

---

## 🛠️ Technical Architecture

### **Backend (Python/Flask)**
- **Flask Framework**: Lightweight web server with RESTful API
- **Paramiko Library**: SSH/SCP protocol implementation
- **Cryptography**: Fernet encryption for credential storage
- **Threading**: Background keep-alive monitoring
- **Session Management**: Secure Flask sessions with connection tracking

### **Frontend (JavaScript/HTML/CSS)**
- **Vanilla JavaScript**: No external dependencies for maximum compatibility
- **Modern CSS**: Glass effects with backdrop-filter and transparency
- **Responsive Design**: Mobile-friendly interface with touch support
- **Real-time Updates**: AJAX polling for progress with cancellation support
- **Event Management**: Proper cleanup to prevent memory leaks

### **Security Features**
- **Encrypted Credentials**: Fernet symmetric encryption for stored credentials
- **Secure Sessions**: Flask session management with timeout
- **SSH Protocol**: All transfers use encrypted SSH/SCP
- **Path Validation**: Directory traversal protection
- **Memory Safety**: SSH keys processed in memory only

---

## 📚 Documentation

### 📖 **Comprehensive Guides**
- **[📋 Project Documentation](PROJECT_DOCUMENTATION.html)**: Complete feature overview with visual design
- **[🔌 API Reference](API_DOCUMENTATION.md)**: Detailed API endpoint documentation
- **[📝 Git Workflow](GIT_DOCUMENTATION.md)**: Git setup, branching, and collaboration guidelines
- **[📋 Changelog](CHANGELOG.md)**: Complete version history and changes
- **[🖥️ Windows Setup](WINDOWS_SETUP.md)**: Windows-specific installation guide

### 🧪 **Testing**
```bash
# Test the new cancel functionality
python3 test_cancel_transfer.py

# Manual testing scenarios:
# 1. Start large file transfer
# 2. Click cancel button mid-transfer  
# 3. Verify immediate cancellation
# 4. Test stuck transfer detection
```

---

## 🔌 API Reference

### **Key Endpoints**

#### **Authentication**
- `POST /api/login` - Password authentication
- `POST /api/login-key` - SSH key authentication  
- `POST /api/test-connection` - Test server connectivity
- `POST /api/disconnect` - Disconnect from server

#### **File Operations**
- `GET /api/list-local` - List local directory
- `GET /api/list-remote` - List remote directory
- `POST /api/transfer-multiple` - Transfer multiple files
- `POST /api/upload` - Upload single file
- `POST /api/download` - Download single file

#### **Transfer Management** ⭐ NEW
- `GET /api/transfer-progress` - Get transfer progress
- `POST /api/cancel-transfer` - Cancel active transfer

#### **System**
- `POST /api/keep-alive` - Maintain session
- `GET /api/connection-status` - Get connection status

See **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** for complete endpoint details.

---

## 🔧 Advanced Configuration

### **Environment Variables**
```bash
export FLASK_ENV=production
export SCP_PORT=5001
export SCP_DEBUG=false
export SCP_MAX_FILE_SIZE=10737418240  # 10GB
```

### **Custom Configuration**
```python
# app_config.py
KEEP_ALIVE_INTERVAL = 15  # seconds
IDLE_TIMEOUT = 3600      # 1 hour
MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024  # 10GB
TRANSFER_TIMEOUT = 300   # 5 minutes
```

### **Network Configuration**
- **Firewall**: Ensure application ports are open (5000-5002, 8000, 8080, 8888, 9000)
- **SSH Access**: Verify SSH service on target servers (port 22)
- **Key Permissions**: SSH keys should have 600 permissions (`chmod 600 keyfile`)

---

## 📊 Performance Features

### **Large File Support**
- **Optimized Transfers**: 2GB window size, 1TB rekey threshold
- **Progress Tracking**: Real-time progress with completion callbacks
- **Memory Efficient**: Streaming transfers for large files (up to 10GB+)
- **Compression**: Configurable compression for better performance

### **Session Optimization**
- **Smart Keep-Alive**: Lightweight 15-second pings
- **Transfer Awareness**: No interference during file operations
- **Failure Tolerance**: Up to 4 consecutive failures before reconnection
- **Activity Monitoring**: User interaction resets idle timers

### **Cancellation System** ⭐ NEW
- **Immediate Response**: Transfers stop within seconds of cancellation
- **Progress Monitoring**: Enhanced with 200ms update intervals
- **Stuck Detection**: Automatic detection after 2 minutes of no progress
- **Cleanup**: Proper cleanup of resources and connections

---

## 🐛 Troubleshooting

### **Connection Issues**
```bash
# Test SSH connectivity
ssh username@server-ip

# Check port availability  
telnet server-ip 22

# Verify SSH service
sudo systemctl status ssh  # On Linux server
```

### **Transfer Issues**
- **Stuck Transfers**: Use the new cancel button or wait for auto-detection ⭐
- **Large Files**: Ensure sufficient disk space on both systems
- **Permissions**: Check file/directory permissions on target system
- **Network**: Verify stable network connection for large transfers

### **Common Solutions**
- **Port Conflicts**: App automatically selects alternative ports
- **SSH Keys**: Ensure proper key format and permissions (600)
- **Timeouts**: New cancellation system handles stuck transfers
- **Memory**: Monitor system resources during large transfers

---

## 📋 System Requirements

### **Client System (macOS/Linux/Windows)**
- **OS**: macOS 10.14+, Linux (any modern distro), Windows 10+
- **Python**: 3.6 or higher
- **RAM**: 512MB minimum (1GB recommended for large transfers)
- **Network**: Internet/LAN connectivity
- **Browser**: Modern browser with JavaScript enabled

### **Target Server (Linux)**
- **SSH Service**: OpenSSH server running and accessible
- **Port Access**: SSH port (default 22) accessible from client
- **User Account**: Valid user account with appropriate permissions
- **Disk Space**: Sufficient space for file transfers

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

### **Development Setup**
```bash
# Fork and clone the repository
git clone https://github.com/yourusername/macos-to-linux-servers-scp.git
cd macos-to-linux-servers-scp

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip3 install -r requirements.txt

# Run in development mode
python3 app_enhanced.py --debug
```

### **Contribution Guidelines**
1. **Fork** the repository and create your feature branch
2. **Follow** the established code style and conventions
3. **Add** comprehensive tests for new features
4. **Update** documentation for user-facing changes
5. **Use** semantic commit messages (see Git documentation)
6. **Submit** a pull request with detailed description

### **Development Workflow**
See **[GIT_DOCUMENTATION.md](GIT_DOCUMENTATION.md)** for detailed Git workflow, branching strategy, and collaboration guidelines.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### **MIT License Summary**
- ✅ Commercial use allowed
- ✅ Modification allowed  
- ✅ Distribution allowed
- ✅ Private use allowed
- ❌ No warranty provided
- ❌ No liability assumed

---

## 🙏 Acknowledgments

- **[Paramiko](https://www.paramiko.org/)**: Excellent SSH/SCP implementation for Python
- **[Flask](https://flask.palletsprojects.com/)**: Lightweight and powerful web framework
- **[Cryptography](https://cryptography.io/)**: Secure credential encryption library
- **Community**: Feedback, bug reports, and feature suggestions from users

---

## 📞 Support and Contact

### **Getting Help**
- **📚 Documentation**: Check the comprehensive HTML documentation
- **🐛 Issues**: Report bugs via [GitHub Issues](https://github.com/yourusername/macos-to-linux-servers-scp/issues)
- **💬 Discussions**: Join [GitHub Discussions](https://github.com/yourusername/macos-to-linux-servers-scp/discussions)
- **📧 Email**: shubhammuke@gmail.com

### **Quick Links**
- **🌟 Star the Project**: If you find this useful, please star the repository
- **🍴 Fork**: Create your own version or contribute improvements
- **📢 Share**: Help others discover this tool

---

## 🎯 What's New in v2.0

### 🛑 **Transfer Cancellation System**
The major highlight of this release is the comprehensive transfer cancellation system that resolves the critical issue where transfers would get stuck indefinitely.

#### **Key Improvements:**
- ✅ **Immediate Cancellation**: Click cancel button to stop transfers instantly
- ✅ **Stuck Detection**: Automatic detection of transfers with no progress for 2+ minutes
- ✅ **Enhanced Monitoring**: More responsive progress updates (200ms intervals)
- ✅ **Better Error Handling**: Clear distinction between cancellation and actual errors
- ✅ **Proper Cleanup**: Complete cleanup of resources and connection state

#### **Technical Implementation:**
- **Backend**: New `/api/cancel-transfer` endpoint with proper state management
- **Frontend**: Enhanced cancel button with API integration and user feedback
- **Monitoring**: Improved progress polling with stuck transfer detection algorithm
- **Error Handling**: Separate handling for user cancellation vs system errors

---

<div align="center">

**🌟 Any OS to Linux Servers SCP - Making secure file transfers beautiful, reliable, and cancellable!**

*Developed with ❤️ for seamless Server file management*

**[⬆️ Back to Top](#-macos-to-linux-servers-scp)**

</div>
