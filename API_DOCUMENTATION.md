# 🔌 API Documentation - MacOS to Linux SCP

## 📋 Overview

This document provides comprehensive documentation for all API endpoints in the MacOS to Linux SCP application. The API is built using Flask and provides RESTful endpoints for file transfer operations, authentication, and system management.

### 🌐 Base URL
```
http://localhost:5000/api
```

### 📊 API Statistics
- **Total Endpoints:** 25+
- **Authentication Methods:** 2 (Password, SSH Key)
- **Response Format:** JSON
- **Protocol:** HTTP/HTTPS

---

## 🔐 Authentication Endpoints

### POST /api/login
Authenticate user with password credentials.

**Request Body:**
```json
{
    "host": "192.168.1.100",
    "port": 22,
    "username": "user",
    "password": "password",
    "save_credentials": true
}
```

**Response:**
```json
{
    "success": true,
    "message": "Connected successfully",
    "session_id": "abc123"
}
```

**Error Response:**
```json
{
    "success": false,
    "error": "Authentication failed"
}
```

### POST /api/login-key
Authenticate user with SSH key.

**Request Body:**
```json
{
    "host": "192.168.1.100",
    "port": 22,
    "username": "user",
    "ssh_key": "-----BEGIN PRIVATE KEY-----\n...",
    "save_credentials": true
}
```

### POST /api/test-connection
Test server connectivity before authentication.

**Request Body:**
```json
{
    "host": "192.168.1.100",
    "port": 22
}
```

**Response:**
```json
{
    "success": true,
    "reachable": true,
    "response_time": 0.05,
    "ssh_service": true
}
```

### POST /api/disconnect
Disconnect from remote server.

**Response:**
```json
{
    "success": true,
    "message": "Disconnected successfully"
}
```

---

## 📁 File Management Endpoints

### GET /api/list-local
List local directory contents.

**Query Parameters:**
- `path` (optional): Directory path to list

**Response:**
```json
{
    "success": true,
    "files": [
        {
            "name": "document.pdf",
            "size": 1024000,
            "modified": "2025-08-19T10:30:00",
            "is_directory": false,
            "permissions": "rw-r--r--"
        }
    ],
    "current_path": "/Users/username/Documents"
}
```

### GET /api/list-remote
List remote directory contents.

**Query Parameters:**
- `path` (optional): Directory path to list

**Response:**
```json
{
    "success": true,
    "files": [
        {
            "name": "server_file.txt",
            "size": 2048,
            "modified": "2025-08-19T09:15:00",
            "is_directory": false,
            "permissions": "rw-r--r--"
        }
    ],
    "current_path": "/home/user"
}
```

### GET /api/count-local-items
Count files and directories in local path.

**Query Parameters:**
- `paths[]`: Array of paths to count

**Response:**
```json
{
    "success": true,
    "total_items": 150,
    "files": 120,
    "directories": 30,
    "total_size": 1073741824
}
```

### GET /api/count-remote-items
Count files and directories in remote path.

**Query Parameters:**
- `paths[]`: Array of paths to count

**Response:**
```json
{
    "success": true,
    "total_items": 75,
    "files": 60,
    "directories": 15,
    "total_size": 536870912
}
```

---

## 🔄 Transfer Endpoints

### POST /api/transfer-multiple
Transfer multiple files/directories.

**Request Body:**
```json
{
    "files": [
        "/path/to/file1.txt",
        "/path/to/directory"
    ],
    "direction": "upload",
    "source_base": "/local/path",
    "dest_base": "/remote/path"
}
```

**Response:**
```json
{
    "success": true,
    "results": [
        {
            "file": "/path/to/file1.txt",
            "success": true
        }
    ]
}
```

### POST /api/upload
Upload single file to remote server.

**Request Body:**
```json
{
    "local_path": "/local/file.txt",
    "remote_path": "/remote/file.txt"
}
```

### POST /api/download
Download single file from remote server.

**Request Body:**
```json
{
    "remote_path": "/remote/file.txt",
    "local_path": "/local/file.txt"
}
```

### GET /api/transfer-progress
Get current transfer progress.

**Response:**
```json
{
    "progress": 45.5,
    "speed": 2048000,
    "speed_str": "2.0 MB/s",
    "current_file": "Uploading document.pdf (1024000/2048000 bytes)",
    "eta": 120.5,
    "transferred_size": 1024000,
    "total_size": 2048000,
    "files_completed": 5,
    "dirs_completed": 2,
    "files_failed": 0,
    "dirs_failed": 0,
    "total_files": 10,
    "total_dirs": 3
}
```

### POST /api/cancel-transfer ⭐ NEW
Cancel current transfer operation.

**Response:**
```json
{
    "success": true,
    "message": "Transfer cancelled successfully"
}
```

**Error Response:**
```json
{
    "success": false,
    "error": "No active transfer to cancel"
}
```

---

## 📂 Directory Operations

### POST /api/create-local-folder
Create local directory.

**Request Body:**
```json
{
    "path": "/local/path",
    "folder_name": "new_folder"
}
```

### POST /api/create-remote-folder
Create remote directory.

**Request Body:**
```json
{
    "path": "/remote/path",
    "folder_name": "new_folder"
}
```

### POST /api/rename-local-item
Rename local file or directory.

**Request Body:**
```json
{
    "old_path": "/local/old_name.txt",
    "new_name": "new_name.txt"
}
```

### POST /api/rename-remote-item
Rename remote file or directory.

**Request Body:**
```json
{
    "old_path": "/remote/old_name.txt",
    "new_name": "new_name.txt"
}
```

### POST /api/delete-local-files
Delete local files or directories.

**Request Body:**
```json
{
    "files": [
        "/local/file1.txt",
        "/local/directory"
    ]
}
```

### POST /api/delete-remote-files
Delete remote files or directories.

**Request Body:**
```json
{
    "files": [
        "/remote/file1.txt",
        "/remote/directory"
    ]
}
```

---

## 🔧 System Endpoints

### GET /api/os-info
Get operating system information.

**Response:**
```json
{
    "os": "Darwin",
    "platform": "macOS",
    "default_path": "/Users/username",
    "path_separator": "/",
    "navigation_buttons": [
        {"name": "Home", "path": "/Users/username"},
        {"name": "Desktop", "path": "/Users/username/Desktop"},
        {"name": "Documents", "path": "/Users/username/Documents"}
    ]
}
```

### GET /api/connection-status
Get current connection status and statistics.

**Response:**
```json
{
    "connected": true,
    "host": "192.168.1.100",
    "username": "user",
    "connection_time": "2025-08-19T10:00:00",
    "stats": {
        "bytes_transferred": 1073741824,
        "files_transferred": 50,
        "uptime": 3600
    }
}
```

### POST /api/keep-alive
Maintain session connection.

**Response:**
```json
{
    "success": true,
    "status": "alive",
    "timestamp": "2025-08-19T12:00:00",
    "connection_healthy": true
}
```

### POST /api/keep-alive-ping
Lightweight keep-alive ping.

**Response:**
```json
{
    "success": true,
    "pong": true,
    "timestamp": "2025-08-19T12:00:00"
}
```

---

## 💾 Credential Management

### GET /api/saved-credentials
Get list of saved credential names.

**Response:**
```json
{
    "credentials": [
        "production-server",
        "development-server",
        "backup-server"
    ]
}
```

### POST /api/load-credential
Load saved credential configuration.

**Request Body:**
```json
{
    "name": "production-server"
}
```

**Response:**
```json
{
    "success": true,
    "credential": {
        "host": "192.168.1.100",
        "port": 22,
        "username": "user",
        "auth_type": "password"
    }
}
```

### POST /api/delete-credential
Delete saved credential.

**Request Body:**
```json
{
    "name": "old-server"
}
```

---

## 🚨 Error Handling

### Standard Error Response Format
```json
{
    "success": false,
    "error": "Error description",
    "error_code": "AUTH_FAILED",
    "details": {
        "timestamp": "2025-08-19T12:00:00",
        "session_id": "abc123"
    }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AUTH_FAILED` | Authentication failed | 401 |
| `CONNECTION_ERROR` | Cannot connect to server | 503 |
| `FILE_NOT_FOUND` | Requested file not found | 404 |
| `PERMISSION_DENIED` | Insufficient permissions | 403 |
| `TRANSFER_FAILED` | File transfer failed | 500 |
| `INVALID_REQUEST` | Invalid request parameters | 400 |
| `SESSION_EXPIRED` | Session has expired | 401 |
| `TRANSFER_CANCELLED` | Transfer cancelled by user | 200 |

---

## 📊 Rate Limiting

### Limits
- **Authentication:** 5 attempts per minute per IP
- **File Operations:** 100 requests per minute per session
- **Progress Monitoring:** 300 requests per minute per session
- **Keep-Alive:** 60 requests per minute per session

### Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1692441600
```

---

## 🔒 Security Considerations

### Authentication
- All credentials are encrypted using Fernet encryption
- SSH keys are processed in memory only
- Sessions expire after 1 hour of inactivity

### Data Protection
- All file transfers use encrypted SSH/SCP protocol
- No sensitive data is logged
- Temporary files are securely deleted

### Input Validation
- All file paths are validated to prevent directory traversal
- File names are sanitized to prevent injection attacks
- Upload size limits are enforced

---

## 📝 Usage Examples

### JavaScript Fetch Examples

#### Upload File with Progress Monitoring
```javascript
// Start upload
const uploadResponse = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        local_path: '/local/file.txt',
        remote_path: '/remote/file.txt'
    })
});

// Monitor progress
const progressInterval = setInterval(async () => {
    const progressResponse = await fetch('/api/transfer-progress');
    const progress = await progressResponse.json();
    
    console.log(`Progress: ${progress.progress}%`);
    
    if (progress.progress >= 100) {
        clearInterval(progressInterval);
    }
}, 1000);
```

#### Cancel Transfer
```javascript
const cancelTransfer = async () => {
    try {
        const response = await fetch('/api/cancel-transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Transfer cancelled successfully');
        } else {
            console.error('Failed to cancel:', result.error);
        }
    } catch (error) {
        console.error('Cancel request failed:', error);
    }
};
```

### Python Requests Examples

#### Authenticate and List Files
```python
import requests

# Authenticate
auth_response = requests.post('http://localhost:5000/api/login', json={
    'host': '192.168.1.100',
    'port': 22,
    'username': 'user',
    'password': 'password'
})

if auth_response.json()['success']:
    # List remote files
    files_response = requests.get('http://localhost:5000/api/list-remote')
    files = files_response.json()['files']
    
    for file in files:
        print(f"{file['name']} - {file['size']} bytes")
```

#### Transfer Multiple Files
```python
transfer_response = requests.post('http://localhost:5000/api/transfer-multiple', json={
    'files': ['/local/file1.txt', '/local/file2.txt'],
    'direction': 'upload',
    'source_base': '/local',
    'dest_base': '/remote'
})

if transfer_response.json()['success']:
    print("Transfer started successfully")
```

---

## 🧪 Testing the API

### Test Script
```bash
# Test cancel transfer functionality
python3 test_cancel_transfer.py
```

### Manual Testing with cURL

#### Test Connection
```bash
curl -X POST http://localhost:5000/api/test-connection \
  -H "Content-Type: application/json" \
  -d '{"host": "192.168.1.100", "port": 22}'
```

#### Get Progress
```bash
curl -X GET http://localhost:5000/api/transfer-progress
```

#### Cancel Transfer
```bash
curl -X POST http://localhost:5000/api/cancel-transfer \
  -H "Content-Type: application/json"
```

---

## 📞 Support

### Getting Help
- **Documentation:** See `PROJECT_DOCUMENTATION.html` for comprehensive guides
- **Issues:** Report API issues via GitHub Issues
- **Testing:** Use the provided test scripts to verify functionality

### API Versioning
- **Current Version:** v2.0
- **Compatibility:** Backward compatible with v1.x clients
- **Deprecation Policy:** 6 months notice for breaking changes

---

*This API documentation is part of the MacOS to Linux SCP project. Keep it updated as new endpoints are added or existing ones are modified.*
