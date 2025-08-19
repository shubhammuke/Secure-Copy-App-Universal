#!/usr/bin/env python3
"""
SCP Web Application - Enhanced Secure File Transfer Interface
A web-based application that provides SCP functionality with Windows 7 Aero UI
Enhanced with multiple file selection, multiple views, and improved credentials storage
"""

import os
import json
import base64
import hashlib
import paramiko
import threading
import stat
import time
import platform
import sys
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file, send_from_directory, session
from werkzeug.utils import secure_filename
from cryptography.fernet import Fernet
import tempfile
import zipfile
import stat
import socket
import subprocess
import logging

def is_safe_path(path):
    """Check if path is safe for file operations (not root or system directories)"""
    if not path or path == '/':
        return False
    
    # Normalize path
    normalized_path = os.path.normpath(path)
    
    # Dangerous system directories
    dangerous_paths = [
        '/', '/bin', '/boot', '/dev', '/etc', '/lib', '/lib64', 
        '/proc', '/root', '/sbin', '/sys', '/usr', '/var'
    ]
    
    # Check if path starts with any dangerous directory
    for dangerous in dangerous_paths:
        if normalized_path == dangerous or normalized_path.startswith(dangerous + '/'):
            return False
    
    return True

def validate_remote_operation(path, operation_name):
    """Validate if remote operation is allowed on the given path"""
    if not is_safe_path(path):
        return {
            'allowed': False, 
            'error': f'❌ {operation_name} not allowed in system directory: {path}. Please navigate to /home or other user directories.'
        }
    return {'allowed': True}

def detect_os_info():
    """Detect current operating system and return appropriate paths and info"""
    system = platform.system().lower()
    
    # Check if running in WSL
    is_wsl = False
    try:
        with open('/proc/version', 'r') as f:
            if 'microsoft' in f.read().lower():
                is_wsl = True
    except:
        pass
    
    os_info = {
        'system': system,
        'is_wsl': is_wsl,
        'default_path': '/',
        'home_path': os.path.expanduser('~'),
        'navigation_buttons': []
    }
    
    if system == 'darwin':  # macOS
        primary_buttons = [
            {'name': 'Desktop', 'path': os.path.join(os.path.expanduser('~'), 'Desktop'), 'icon': '🖥️', 'category': 'primary'},
            {'name': 'Documents', 'path': os.path.join(os.path.expanduser('~'), 'Documents'), 'icon': '📄', 'category': 'primary'}
        ]
        
        quick_access_buttons = [
            {'name': 'Users', 'path': '/Users', 'icon': '👥', 'category': 'quick'},
            {'name': 'Applications', 'path': '/Applications', 'icon': '📱', 'category': 'quick'},
            {'name': 'Downloads', 'path': os.path.join(os.path.expanduser('~'), 'Downloads'), 'icon': '⬇️', 'category': 'quick'}
        ]
        
        os_info.update({
            'default_path': '/Users',
            'navigation_buttons': primary_buttons,
            'quick_access_buttons': quick_access_buttons
        })
    elif system == 'windows':  # Windows
        # For Windows, we don't add primary buttons that conflict with fixed buttons
        # Fixed buttons: Back, Up, Root (C:\), Home (C:\Users), Refresh
        primary_buttons = []  # No additional primary buttons to avoid confusion
        
        # Detect all available drives on Windows
        available_drives = []
        try:
            import string
            for drive_letter in string.ascii_uppercase:
                drive_path = f'{drive_letter}:\\'
                if os.path.exists(drive_path):
                    available_drives.append({
                        'name': f'{drive_letter}: Drive', 
                        'path': drive_path, 
                        'icon': '💾',
                        'category': 'drives'
                    })
        except Exception as e:
            # Fallback to common drives
            for drive in ['C:\\', 'D:\\', 'E:\\']:
                if os.path.exists(drive):
                    available_drives.append({
                        'name': f'{drive[0]}: Drive', 
                        'path': drive, 
                        'icon': '💾',
                        'category': 'drives'
                    })
        
        # Quick access for dropdown only
        quick_access_buttons = [
            {'name': 'Desktop', 'path': os.path.join(os.path.expanduser('~'), 'Desktop'), 'icon': '🖥️', 'category': 'quick'},
            {'name': 'Documents', 'path': os.path.join(os.path.expanduser('~'), 'Documents'), 'icon': '📄', 'category': 'quick'},
            {'name': 'Downloads', 'path': os.path.join(os.path.expanduser('~'), 'Downloads'), 'icon': '⬇️', 'category': 'quick'},
            {'name': 'Program Files', 'path': 'C:\\Program Files', 'icon': '📁', 'category': 'quick'}
        ] + available_drives
        
        os_info.update({
            'default_path': 'C:\\Users',
            'navigation_buttons': primary_buttons,  # Empty to avoid conflicts
            'quick_access_buttons': quick_access_buttons,
            'available_drives': available_drives
        })
    elif system == 'linux':
        if is_wsl:  # WSL Environment
            # Check for Windows drives
            windows_drives = []
            try:
                for item in os.listdir('/mnt'):
                    drive_path = f'/mnt/{item}'
                    if os.path.isdir(drive_path) and len(item) == 1:
                        windows_drives.append({
                            'name': f'{item.upper()}: Drive', 
                            'path': drive_path, 
                            'icon': '💾',
                            'category': 'drives'
                        })
            except:
                pass
            
            # Categorize navigation buttons
            primary_buttons = [
                {'name': 'User', 'path': os.path.expanduser('~'), 'icon': '👤', 'category': 'primary', 'title': 'User Home Directory'}
            ]
            
            quick_access_buttons = [
                {'name': 'Home', 'path': '/home', 'icon': '🏠', 'category': 'quick'},
                {'name': 'Windows Drives', 'path': '/mnt', 'icon': '🪟', 'category': 'quick'},
            ] + windows_drives
            
            os_info.update({
                'default_path': '/home',
                'navigation_buttons': primary_buttons,
                'quick_access_buttons': quick_access_buttons,
                'available_drives': windows_drives  # Add this for WSL Windows drives
            })
        else:  # Regular Linux
            primary_buttons = [
                {'name': 'Desktop', 'path': os.path.join(os.path.expanduser('~'), 'Desktop'), 'icon': '🖥️', 'category': 'primary'},
                {'name': 'Documents', 'path': os.path.join(os.path.expanduser('~'), 'Documents'), 'icon': '📄', 'category': 'primary'}
            ]
            
            quick_access_buttons = [
                {'name': 'Home', 'path': '/home', 'icon': '🏠', 'category': 'quick'},
                {'name': 'User', 'path': os.path.expanduser('~'), 'icon': '👤', 'category': 'quick'},
                {'name': 'Downloads', 'path': os.path.join(os.path.expanduser('~'), 'Downloads'), 'icon': '⬇️', 'category': 'quick'}
            ]
            
            os_info.update({
                'default_path': '/home',
                'navigation_buttons': primary_buttons,
                'quick_access_buttons': quick_access_buttons
            })
    
    # Filter out non-existent paths for both categories
    if 'navigation_buttons' in os_info:
        os_info['navigation_buttons'] = [
            btn for btn in os_info['navigation_buttons'] 
            if os.path.exists(btn['path'])
        ]
    
    if 'quick_access_buttons' in os_info:
        os_info['quick_access_buttons'] = [
            btn for btn in os_info['quick_access_buttons'] 
            if os.path.exists(btn['path'])
        ]
    
    return os_info

# Get OS info at startup
OS_INFO = detect_os_info()

app = Flask(__name__, static_folder='static', static_url_path='/static')
app.secret_key = os.urandom(24)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
UPLOAD_FOLDER = '/tmp/scp_uploads'
CREDENTIALS_FILE = 'saved_credentials.enc'
ENCRYPTION_KEY_FILE = 'encryption.key'

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

class SCPManager:
    def __init__(self):
        self.connections = {}
        self.encryption_key = self._get_or_create_encryption_key()
        
    def _get_or_create_encryption_key(self):
        """Get or create encryption key for storing credentials"""
        try:
            if os.path.exists(ENCRYPTION_KEY_FILE):
                with open(ENCRYPTION_KEY_FILE, 'rb') as f:
                    key = f.read()
                    # Validate key format
                    if len(key) == 44:  # Base64 encoded 32-byte key
                        return key
                    else:
                        logger.warning("Invalid encryption key format, generating new key")
                        return self._create_new_key()
            else:
                return self._create_new_key()
        except Exception as e:
            logger.error(f"Error reading encryption key: {e}")
            return self._create_new_key()
    
    def _create_new_key(self):
        """Create a new encryption key"""
        key = Fernet.generate_key()
        try:
            with open(ENCRYPTION_KEY_FILE, 'wb') as f:
                f.write(key)
            logger.info("New encryption key created")
        except Exception as e:
            logger.error(f"Error creating encryption key: {e}")
        return key
    
    def save_credentials(self, host, username, password=None, key_data=None, port=22):
        """Securely save login credentials"""
        try:
            fernet = Fernet(self.encryption_key)
            
            credentials = {
                'host': host,
                'port': port,
                'username': username,
                'password': password,
                'key_data': key_data,
                'saved_at': datetime.now().isoformat()
            }
            
            encrypted_data = fernet.encrypt(json.dumps(credentials).encode())
            
            # Load existing credentials
            saved_creds = self.load_saved_credentials()
            credential_key = f"{username}@{host}:{port}"
            saved_creds[credential_key] = encrypted_data.decode()
            
            with open(CREDENTIALS_FILE, 'w') as f:
                json.dump(saved_creds, f, indent=2)
            
            logger.info(f"Credentials saved for {credential_key}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving credentials: {e}")
            return False
    
    def load_saved_credentials(self):
        """Load saved credentials"""
        try:
            if os.path.exists(CREDENTIALS_FILE):
                with open(CREDENTIALS_FILE, 'r') as f:
                    return json.load(f)
            return {}
        except Exception as e:
            logger.error(f"Error loading saved credentials: {e}")
            return {}
    
    def get_saved_credential_names(self):
        """Get list of saved credential names"""
        try:
            return list(self.load_saved_credentials().keys())
        except Exception as e:
            logger.error(f"Error getting credential names: {e}")
            return []
    
    def load_credential(self, credential_name):
        """Load specific credential"""
        try:
            saved_creds = self.load_saved_credentials()
            if credential_name in saved_creds:
                fernet = Fernet(self.encryption_key)
                encrypted_data = saved_creds[credential_name].encode()
                decrypted_data = fernet.decrypt(encrypted_data)
                return json.loads(decrypted_data.decode())
            return None
        except Exception as e:
            logger.error(f"Error loading credential {credential_name}: {e}")
            return None
    
    def delete_credential(self, credential_name):
        """Delete a saved credential"""
        try:
            saved_creds = self.load_saved_credentials()
            if credential_name in saved_creds:
                del saved_creds[credential_name]
                with open(CREDENTIALS_FILE, 'w') as f:
                    json.dump(saved_creds, f, indent=2)
                logger.info(f"Credential {credential_name} deleted")
                return True
            return False
        except Exception as e:
            logger.error(f"Error deleting credential {credential_name}: {e}")
            return False
    
    def test_connection(self, host, username, password=None, key_data=None, port=22):
        """Test SSH connection to remote server"""
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            if key_data:
                # Handle SSH key authentication
                key_file = tempfile.NamedTemporaryFile(delete=False, mode='w')
                key_file.write(key_data)
                key_file.close()
                
                try:
                    # Try different key types
                    for key_class in [paramiko.RSAKey, paramiko.Ed25519Key, paramiko.ECDSAKey, paramiko.DSSKey]:
                        try:
                            private_key = key_class.from_private_key_file(key_file.name)
                            break
                        except:
                            continue
                    else:
                        raise Exception("Unsupported key format")
                    
                    ssh.connect(host, port=port, username=username, pkey=private_key, timeout=10)
                except Exception as e:
                    raise Exception(f"SSH key authentication failed: {str(e)}")
                finally:
                    os.unlink(key_file.name)
            else:
                ssh.connect(host, port=port, username=username, password=password, timeout=10)
            
            # Test basic command
            stdin, stdout, stderr = ssh.exec_command('pwd')
            home_dir = stdout.read().decode().strip()
            
            # Get system info
            stdin, stdout, stderr = ssh.exec_command('uname -a')
            system_info = stdout.read().decode().strip()
            
            ssh.close()
            return {
                'success': True, 
                'home_dir': home_dir,
                'system_info': system_info
            }
            
        except Exception as e:
            logger.error(f"Connection test failed: {e}")
            return {'success': False, 'error': str(e)}
    
    def create_connection(self, session_id, host, username, password=None, key_data=None, port=22):
        """Create and store SSH connection with enhanced keep-alive and large file support"""
        try:
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            if key_data:
                # Handle SSH key authentication with improved error handling
                key_file = tempfile.NamedTemporaryFile(delete=False, mode='w')
                key_file.write(key_data)
                key_file.close()
                
                try:
                    private_key = None
                    key_errors = []
                    
                    # Try different key types with specific error handling
                    key_types = [
                        (paramiko.RSAKey, "RSA"),
                        (paramiko.Ed25519Key, "Ed25519"),
                        (paramiko.ECDSAKey, "ECDSA"),
                        (paramiko.DSSKey, "DSS")
                    ]
                    
                    for key_class, key_type in key_types:
                        try:
                            private_key = key_class.from_private_key_file(key_file.name)
                            logger.info(f"Successfully loaded {key_type} key for {username}@{host}")
                            break
                        except paramiko.PasswordRequiredException:
                            key_errors.append(f"{key_type} key requires passphrase (not supported)")
                        except paramiko.SSHException as e:
                            key_errors.append(f"{key_type} key format error: {str(e)}")
                        except Exception as e:
                            key_errors.append(f"{key_type} key error: {str(e)}")
                    
                    if not private_key:
                        error_msg = f"Failed to load SSH key. Tried formats: {', '.join([kt[1] for kt in key_types])}. Errors: {'; '.join(key_errors)}"
                        raise Exception(error_msg)
                    
                    # Attempt SSH connection with the key
                    ssh.connect(
                        host, 
                        port=port, 
                        username=username, 
                        pkey=private_key,
                        timeout=30,
                        banner_timeout=30,
                        auth_timeout=30,
                        look_for_keys=False,  # Don't look for system keys
                        allow_agent=False     # Don't use SSH agent
                    )
                    
                    logger.info(f"SSH key authentication successful for {username}@{host}:{port}")
                    
                except paramiko.AuthenticationException as e:
                    raise Exception(f"SSH key authentication failed. Please check:\n• Key file is correct for user '{username}'\n• Key is authorized on the server\n• User account exists\nError: {str(e)}")
                except paramiko.SSHException as e:
                    raise Exception(f"SSH connection error: {str(e)}")
                except Exception as e:
                    if "Failed to load SSH key" in str(e):
                        raise e  # Re-raise key loading errors as-is
                    else:
                        raise Exception(f"SSH key authentication error: {str(e)}")
                finally:
                    # Clean up temporary key file
                    try:
                        os.unlink(key_file.name)
                    except:
                        pass
            else:
                ssh.connect(
                    host, 
                    port=port, 
                    username=username, 
                    password=password,
                    timeout=30,
                    banner_timeout=30,
                    auth_timeout=30
                )
            
            # Configure enhanced keep-alive for large file transfers
            transport = ssh.get_transport()
            if transport:
                # More aggressive keep-alive for large file transfers
                transport.set_keepalive(15)  # Send keep-alive every 15 seconds
                # Increase window size for better performance with large files
                transport.window_size = 2147483647  # Maximum window size
                transport.packetizer.REKEY_BYTES = pow(2, 40)  # 1TB before rekeying
                transport.packetizer.REKEY_PACKETS = pow(2, 40)  # Large packet count
                # Disable compression for better large file performance
                transport.use_compression(False)
                logger.info(f"Enhanced SSH keep-alive configured for large files: {username}@{host}")
            
            # Create SFTP client with optimized settings
            sftp = ssh.open_sftp()
            # Optimize SFTP for large file transfers
            sftp.get_channel().settimeout(300)  # 5 minute timeout for operations
            
            # Detect remote OS for cross-platform compatibility
            remote_os = self._detect_remote_os(ssh)
            
            # Store connection with enhanced metadata
            self.connections[session_id] = {
                'ssh': ssh,
                'sftp': sftp,
                'host': host,
                'username': username,
                'port': port,
                'remote_os': remote_os,
                'created_at': datetime.now(),
                'last_activity': datetime.now(),
                'transfer_active': False,
                'stored_credentials': {
                    'password': password,
                    'key_data': key_data
                },
                'stats': {
                    'bytes_transferred': 0,
                    'files_transferred': 0,
                    'last_transfer_time': None
                }
            }
            
            # Start enhanced keep-alive monitoring thread
            self._start_enhanced_keepalive_monitor(session_id)
            
            logger.info(f"Enhanced connection created for {username}@{host}:{port} (OS: {remote_os})")
            return True
        except Exception as e:
            logger.error(f"Connection creation failed: {e}")
            return False
    
    def _detect_remote_os(self, ssh):
        """Enhanced remote OS detection with detailed information"""
        try:
            # Try multiple detection methods for better accuracy
            detection_results = {}
            
            # Linux distribution detection
            commands = [
                ('cat /etc/os-release 2>/dev/null | grep "^PRETTY_NAME=" | cut -d"=" -f2 | tr -d \'"\'', 'linux_pretty'),
                ('cat /etc/os-release 2>/dev/null | grep "^NAME=" | cut -d"=" -f2 | tr -d \'"\'', 'linux_name'),
                ('lsb_release -d 2>/dev/null | cut -f2', 'linux_lsb'),
                ('cat /etc/redhat-release 2>/dev/null', 'redhat'),
                ('cat /etc/debian_version 2>/dev/null', 'debian'),
                ('uname -s', 'uname'),
                ('uname -r', 'kernel'),
                ('hostname', 'hostname'),
                ('sw_vers -productName 2>/dev/null', 'macos'),
                ('ver 2>/dev/null', 'windows')
            ]
            
            for command, key in commands:
                try:
                    stdin, stdout, stderr = ssh.exec_command(command, timeout=3)
                    output = stdout.read().decode().strip()
                    if output:
                        detection_results[key] = output
                except:
                    continue
            
            # Analyze results
            return self._analyze_remote_os_results(detection_results)
            
        except Exception as e:
            logger.warning(f"OS detection failed: {e}")
            return 'server'  # Better than 'unknown'
    
    def _analyze_remote_os_results(self, results):
        """Analyze detection results and return user-friendly OS name"""
        
        # Check for specific Linux distributions first
        if 'linux_pretty' in results:
            pretty_name = results['linux_pretty']
            if 'Ubuntu' in pretty_name:
                return 'ubuntu'
            elif 'CentOS' in pretty_name:
                return 'centos'
            elif 'Red Hat' in pretty_name or 'RHEL' in pretty_name:
                return 'redhat'
            elif 'Debian' in pretty_name:
                return 'debian'
            elif 'Fedora' in pretty_name:
                return 'fedora'
            elif 'SUSE' in pretty_name or 'openSUSE' in pretty_name:
                return 'suse'
            elif 'Alpine' in pretty_name:
                return 'alpine'
            elif 'Amazon Linux' in pretty_name:
                return 'amazon'
            else:
                return 'linux'
        
        # Check NAME field
        if 'linux_name' in results:
            name = results['linux_name']
            if 'Ubuntu' in name:
                return 'ubuntu'
            elif 'CentOS' in name:
                return 'centos'
            elif 'Debian' in name:
                return 'debian'
            elif 'Fedora' in name:
                return 'fedora'
        
        # Check LSB release
        if 'linux_lsb' in results:
            lsb = results['linux_lsb'].lower()
            if 'ubuntu' in lsb:
                return 'ubuntu'
            elif 'centos' in lsb:
                return 'centos'
            elif 'debian' in lsb:
                return 'debian'
        
        # Check specific files
        if 'redhat' in results:
            return 'redhat'
        if 'debian' in results:
            return 'debian'
        
        # Check macOS
        if 'macos' in results:
            return 'macos'
        
        # Check Windows
        if 'windows' in results:
            return 'windows'
        
        # Check uname
        if 'uname' in results:
            uname = results['uname'].lower()
            if 'linux' in uname:
                return 'linux'
            elif 'darwin' in uname:
                return 'macos'
            elif 'freebsd' in uname:
                return 'freebsd'
        
        # If we have hostname, show it's a server
        if 'hostname' in results:
            return 'server'
        
        return 'server'  # Better default than 'unknown'
    
    def detect_remote_os(self, session_id):
        """Public method to detect remote OS for a session"""
        conn = self.get_connection(session_id)
        if not conn:
            return 'unknown'
        
        # Return cached OS info if available
        if 'remote_os' in conn:
            return conn['remote_os']
        
        # Detect and cache
        try:
            remote_os = self._detect_remote_os(conn['ssh'])
            conn['remote_os'] = remote_os
            return remote_os
        except:
            return 'server'
    
    def _get_cross_platform_commands(self, remote_os, operation, *args):
        """Get cross-platform compatible commands"""
        commands = {
            'delete_file': {
                'macos': 'rm -f "{}"',
                'linux': 'rm -f "{}"',
                'freebsd': 'rm -f "{}"',
                'unix': 'rm -f "{}"',
                'windows': 'del /f "{}"'
            },
            'delete_dir': {
                'macos': 'rm -rf "{}"',
                'linux': 'rm -rf "{}"',
                'freebsd': 'rm -rf "{}"',
                'unix': 'rm -rf "{}"',
                'windows': 'rmdir /s /q "{}"'
            },
            'move': {
                'macos': 'mv "{}" "{}"',
                'linux': 'mv "{}" "{}"',
                'freebsd': 'mv "{}" "{}"',
                'unix': 'mv "{}" "{}"',
                'windows': 'move "{}" "{}"'
            },
            'mkdir': {
                'macos': 'mkdir -p "{}"',
                'linux': 'mkdir -p "{}"',
                'freebsd': 'mkdir -p "{}"',
                'unix': 'mkdir -p "{}"',
                'windows': 'mkdir "{}"'
            },
            'test_file': {
                'macos': 'test -f "{}" && echo "FILE" || echo "NOT_FILE"',
                'linux': 'test -f "{}" && echo "FILE" || echo "NOT_FILE"',
                'freebsd': 'test -f "{}" && echo "FILE" || echo "NOT_FILE"',
                'unix': 'test -f "{}" && echo "FILE" || echo "NOT_FILE"',
                'windows': 'if exist "{}" echo FILE'
            }
        }
        
        cmd_template = commands.get(operation, {}).get(remote_os, commands.get(operation, {}).get('unix', ''))
        if cmd_template:
            return cmd_template.format(*args)
        return None

    def _start_enhanced_keepalive_monitor(self, session_id):
        """Start enhanced background thread to monitor and maintain connection during large transfers"""
        def enhanced_keepalive_worker():
            consecutive_failures = 0
            max_failures = 3
            
            while session_id in self.connections:
                try:
                    conn = self.connections[session_id]
                    transport = conn['ssh'].get_transport()
                    
                    if transport and transport.is_active():
                        # Update last activity timestamp
                        conn['last_activity'] = datetime.now()
                        
                        # Adjust keep-alive frequency based on transfer activity
                        if conn.get('transfer_active', False):
                            # During transfers, use lighter keep-alive
                            try:
                                # Just check transport status, don't send commands during transfer
                                if transport.is_authenticated():
                                    logger.debug(f"Transfer keep-alive check passed for session {session_id}")
                                    consecutive_failures = 0
                                else:
                                    consecutive_failures += 1
                                    logger.warning(f"Transfer keep-alive authentication check failed for session {session_id}")
                            except Exception as e:
                                consecutive_failures += 1
                                logger.warning(f"Transfer keep-alive failed for session {session_id}: {e}")
                        else:
                            # When not transferring, use normal keep-alive with lightweight command
                            try:
                                conn['sftp'].normalize('.')  # Very lightweight SFTP operation
                                logger.debug(f"Keep-alive successful for session {session_id}")
                                consecutive_failures = 0
                            except Exception as e:
                                consecutive_failures += 1
                                logger.warning(f"Keep-alive failed for session {session_id}: {e}")
                    else:
                        consecutive_failures += 1
                        logger.warning(f"Transport inactive for session {session_id}")
                    
                    # If too many consecutive failures, mark for reconnection
                    if consecutive_failures >= max_failures:
                        logger.error(f"Max keep-alive failures reached for session {session_id}, marking for reconnection")
                        conn['needs_reauth'] = True
                        consecutive_failures = 0  # Reset counter
                        
                except Exception as e:
                    consecutive_failures += 1
                    logger.error(f"Keep-alive monitor error for session {session_id}: {e}")
                    if consecutive_failures >= max_failures:
                        break
                
                # Adaptive sleep based on transfer activity
                if session_id in self.connections and self.connections[session_id].get('transfer_active', False):
                    time.sleep(30)  # Less frequent during transfers
                else:
                    time.sleep(45)  # Normal frequency when idle
        
        # Start the enhanced keep-alive thread
        keepalive_thread = threading.Thread(target=enhanced_keepalive_worker, daemon=True)
        keepalive_thread.start()
        logger.info(f"Enhanced keep-alive monitor started for session {session_id}")

    def _start_keepalive_monitor(self, session_id):
        """Start background thread to monitor and maintain connection"""
        def keepalive_worker():
            while session_id in self.connections:
                try:
                    conn = self.connections[session_id]
                    transport = conn['ssh'].get_transport()
                    
                    if transport and transport.is_active():
                        # Update last activity timestamp
                        conn['last_activity'] = datetime.now()
                        
                        # Send a lightweight command to keep connection alive
                        try:
                            conn['sftp'].listdir('.')  # Simple directory listing
                            logger.debug(f"Keep-alive successful for session {session_id}")
                        except Exception as e:
                            logger.warning(f"Keep-alive failed for session {session_id}: {e}")
                            # Try to reconnect if keep-alive fails
                            self._attempt_reconnection(session_id)
                    else:
                        logger.warning(f"Transport inactive for session {session_id}, attempting reconnection")
                        self._attempt_reconnection(session_id)
                        
                except Exception as e:
                    logger.error(f"Keep-alive monitor error for session {session_id}: {e}")
                    break
                
                # Wait 60 seconds before next keep-alive check
                time.sleep(60)
        
        # Start the keep-alive thread
        keepalive_thread = threading.Thread(target=keepalive_worker, daemon=True)
        keepalive_thread.start()
        logger.info(f"Keep-alive monitor started for session {session_id}")
    
    def _attempt_reconnection(self, session_id):
        """Attempt to reconnect a dropped connection"""
        try:
            if session_id not in self.connections:
                return False
                
            conn = self.connections[session_id]
            host = conn['host']
            username = conn['username']
            port = conn['port']
            
            logger.info(f"Attempting reconnection for {username}@{host}:{port}")
            
            # Close existing connection
            try:
                conn['sftp'].close()
                conn['ssh'].close()
            except:
                pass
            
            # Create new connection (this will use stored credentials if available)
            # For now, we'll mark the connection as needing re-authentication
            conn['needs_reauth'] = True
            conn['reconnect_attempts'] = conn.get('reconnect_attempts', 0) + 1
            
            if conn['reconnect_attempts'] > 3:
                logger.error(f"Max reconnection attempts reached for session {session_id}")
                del self.connections[session_id]
                return False
                
            logger.info(f"Connection marked for re-authentication: session {session_id}")
            return True
            
        except Exception as e:
            logger.error(f"Reconnection failed for session {session_id}: {e}")
            return False
    
    def _attempt_auto_reconnect(self, session_id):
        """Attempt automatic reconnection after server restart"""
        try:
            if session_id not in self.connections:
                return {'success': False, 'error': 'Session not found', 'error_type': 'no_session'}
                
            conn = self.connections[session_id]
            host = conn['host']
            username = conn['username']
            port = conn['port']
            
            logger.info(f"Attempting auto-reconnect for {username}@{host}:{port}")
            
            # Close existing connection
            try:
                conn['sftp'].close()
                conn['ssh'].close()
            except:
                pass
            
            # Test if server is back online
            import socket
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            
            try:
                result = sock.connect_ex((host, port))
                sock.close()
                
                if result != 0:
                    return {
                        'success': False, 
                        'error': f'Server {host}:{port} is still unreachable',
                        'error_type': 'server_unreachable'
                    }
            except:
                return {
                    'success': False, 
                    'error': f'Cannot reach server {host}:{port}',
                    'error_type': 'network_error'
                }
            
            # Check if we have stored credentials for auto-reconnect
            stored_creds = conn.get('stored_credentials')
            if not stored_creds:
                # Mark connection as needing re-authentication
                conn['needs_reauth'] = True
                return {
                    'success': False, 
                    'error': 'Server is back online but credentials needed for reconnection',
                    'error_type': 'auth_required'
                }
            
            # Attempt reconnection with stored credentials
            try:
                ssh = paramiko.SSHClient()
                ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                
                if stored_creds.get('key_data'):
                    # Use SSH key authentication
                    key_file = tempfile.NamedTemporaryFile(delete=False, mode='w')
                    key_file.write(stored_creds['key_data'])
                    key_file.close()
                    
                    try:
                        private_key = None
                        # Try different key types
                        for key_class in [paramiko.RSAKey, paramiko.Ed25519Key, paramiko.ECDSAKey, paramiko.DSSKey]:
                            try:
                                private_key = key_class.from_private_key_file(key_file.name)
                                break
                            except:
                                continue
                        
                        if not private_key:
                            raise Exception("Could not load SSH key for reconnection")
                        
                        ssh.connect(
                            host, 
                            port=port, 
                            username=username, 
                            pkey=private_key, 
                            timeout=30,
                            look_for_keys=False,
                            allow_agent=False
                        )
                    finally:
                        try:
                            os.unlink(key_file.name)
                        except:
                            pass
                else:
                    # Use password authentication
                    ssh.connect(
                        host, 
                        port=port, 
                        username=username, 
                        password=stored_creds['password'], 
                        timeout=30
                    )
                
                # Configure keep-alive
                transport = ssh.get_transport()
                if transport:
                    transport.set_keepalive(30)
                
                # Create new SFTP client
                sftp = ssh.open_sftp()
                
                # Update connection
                conn['ssh'] = ssh
                conn['sftp'] = sftp
                conn['last_activity'] = datetime.now()
                conn['reconnected_at'] = datetime.now()
                conn['reconnect_count'] = conn.get('reconnect_count', 0) + 1
                
                # Remove reauth flag if it was set
                conn.pop('needs_reauth', None)
                
                logger.info(f"Auto-reconnect successful for {username}@{host}:{port}")
                return {
                    'success': True, 
                    'message': f'Successfully reconnected to {host}:{port}',
                    'reconnect_count': conn['reconnect_count']
                }
                
            except Exception as e:
                logger.error(f"Auto-reconnect failed for {username}@{host}:{port}: {e}")
                conn['needs_reauth'] = True
                return {
                    'success': False, 
                    'error': f'Reconnection failed: {str(e)}',
                    'error_type': 'reconnect_failed'
                }
                
        except Exception as e:
            logger.error(f"Auto-reconnect error for session {session_id}: {e}")
            return {
                'success': False, 
                'error': f'Auto-reconnect system error: {str(e)}',
                'error_type': 'internal_error'
            }
        """Get existing connection with health check"""
        if session_id not in self.connections:
            return None
            
        conn = self.connections[session_id]
        
        # Check if connection needs re-authentication
        if conn.get('needs_reauth', False):
            logger.warning(f"Connection {session_id} needs re-authentication")
            return None
        
        # Check if connection is still active
        try:
            transport = conn['ssh'].get_transport()
            if not transport or not transport.is_active():
                logger.warning(f"Connection {session_id} is inactive")
                self._attempt_reconnection(session_id)
                return None
        except Exception as e:
            logger.error(f"Connection health check failed for {session_id}: {e}")
            return None
            
        # Update last activity
        conn['last_activity'] = datetime.now()
        return conn
    
    def close_connection(self, session_id):
        """Close connection"""
        if session_id in self.connections:
            try:
                conn = self.connections[session_id]
                conn['sftp'].close()
                conn['ssh'].close()
                del self.connections[session_id]
                logger.info(f"Connection {session_id} closed")
            except Exception as e:
                logger.error(f"Error closing connection: {e}")
    
    def get_connection(self, session_id):
        """Get existing connection for session"""
        if session_id in self.connections:
            conn_info = self.connections[session_id]
            
            # Update last activity
            conn_info['last_activity'] = datetime.now()
            
            return conn_info
        return None
    
    def list_remote_directory(self, session_id, path='/'):
        """List remote directory contents"""
        conn = self.get_connection(session_id)
        if not conn:
            return {'error': 'No connection found'}
        
        try:
            sftp = conn['sftp']
            items = []
            
            for item in sftp.listdir_attr(path):
                item_path = os.path.join(path, item.filename).replace('\\', '/')
                is_dir = stat.S_ISDIR(item.st_mode)
                
                items.append({
                    'name': item.filename,
                    'path': item_path,
                    'is_directory': is_dir,
                    'size': item.st_size if not is_dir else 0,
                    'modified': datetime.fromtimestamp(item.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                    'permissions': oct(item.st_mode)[-3:],
                    'owner': getattr(item, 'st_uid', 'unknown'),
                    'group': getattr(item, 'st_gid', 'unknown')
                })
            
            # Sort: directories first, then files
            items.sort(key=lambda x: (not x['is_directory'], x['name'].lower()))
            
            return {'items': items, 'current_path': path}
            
        except Exception as e:
            logger.error(f"Error listing remote directory {path}: {e}")
            return {'error': str(e)}
    
    def list_local_directory(self, path=None):
        """List local directory contents with OS-specific default"""
        try:
            # Use OS-specific default path if no path is provided
            if not path or path.strip() == '':
                path = OS_INFO['default_path']
            
            # Normalize Windows paths
            if OS_INFO['system'] == 'windows':
                path = os.path.normpath(path)
                # Handle drive root paths (e.g., "C:" -> "C:\")
                if len(path) == 2 and path[1] == ':':
                    path = path + '\\'
            
            # Allow root directory access
            if path == '/':
                # Root directory is allowed
                pass
            elif not os.path.exists(path):
                # If path doesn't exist, default to OS-specific default
                path = OS_INFO['default_path']
                
            if not os.path.exists(path):
                # Final fallback to user home
                path = OS_INFO['home_path']
                
            if not os.path.exists(path):
                return {'error': 'No accessible path found'}
            
            items = []
            for item in os.listdir(path):
                item_path = os.path.join(path, item)
                is_dir = os.path.isdir(item_path)
                
                try:
                    stat_info = os.stat(item_path)
                    items.append({
                        'name': item,
                        'path': item_path,
                        'is_directory': is_dir,
                        'size': stat_info.st_size if not is_dir else 0,
                        'modified': datetime.fromtimestamp(stat_info.st_mtime).strftime('%Y-%m-%d %H:%M:%S'),
                        'permissions': oct(stat_info.st_mode)[-3:],
                        'owner': stat_info.st_uid,
                        'group': stat_info.st_gid
                    })
                except Exception as e:
                    # Skip items we can't access
                    logger.warning(f"Cannot access {item_path}: {e}")
                    continue
            
            # Sort: directories first, then files
            items.sort(key=lambda x: (not x['is_directory'], x['name'].lower()))
            
            return {'items': items, 'current_path': path}
            
        except Exception as e:
            logger.error(f"Error listing local directory {path}: {e}")
            return {'error': str(e)}

    def transfer_multiple_files(self, session_id, file_list, direction, source_base, dest_base):
        """Transfer multiple files/folders with progress tracking"""
        conn = self.get_connection(session_id)
        if not conn:
            return {'success': False, 'error': 'No connection found'}
        
        try:
            sftp = conn['sftp']
            results = []
            
            # Calculate total size and count files/directories for progress tracking
            total_size = 0
            file_sizes = {}
            total_files_count = 0
            total_dirs_count = 0
            
            logger.info(f"Starting transfer calculation for {len(file_list)} items")
            
            for file_path in file_list:
                try:
                    if direction == 'upload':
                        if os.path.isdir(file_path):
                            size, files, dirs = self._get_local_folder_details(file_path)
                            total_dirs_count += dirs + 1  # +1 for the folder itself
                            total_files_count += files
                            logger.info(f"Local folder {file_path}: {files} files, {dirs} dirs, {size} bytes")
                        else:
                            size = os.path.getsize(file_path)
                            total_files_count += 1
                            logger.info(f"Local file {file_path}: {size} bytes")
                    else:  # download
                        if self._is_remote_directory(sftp, file_path):
                            size, files, dirs = self._get_remote_folder_details(sftp, file_path)
                            total_dirs_count += dirs + 1  # +1 for the folder itself
                            total_files_count += files
                            logger.info(f"Remote folder {file_path}: {files} files, {dirs} dirs, {size} bytes")
                        else:
                            size = sftp.stat(file_path).st_size
                            total_files_count += 1
                            logger.info(f"Remote file {file_path}: {size} bytes")
                    
                    file_sizes[file_path] = size
                    total_size += size
                except Exception as e:
                    logger.warning(f"Could not get details for {file_path}: {e}")
                    file_sizes[file_path] = 0
                    total_files_count += 1  # Assume it's a file
            
            logger.info(f"Transfer totals: {total_files_count} files, {total_dirs_count} dirs, {total_size} bytes")
            
            # Store progress info in session
            progress_info = {
                'total_size': total_size,
                'transferred_size': 0,
                'current_file': 'Starting transfer...',
                'start_time': datetime.now(),
                'files_completed': 0,
                'dirs_completed': 0,
                'files_failed': 0,
                'dirs_failed': 0,
                'total_files': total_files_count,
                'total_dirs': total_dirs_count,
                'total_items': len(file_list)
            }
            
            # Store in a simple dict (in production, use Redis or database)
            if not hasattr(self, 'transfer_progress'):
                self.transfer_progress = {}
            self.transfer_progress[session_id] = progress_info
            
            logger.info(f"Progress tracking initialized for session {session_id}")
            
            for i, file_path in enumerate(file_list):
                try:
                    # Check for cancellation before processing each file
                    if session_id in self.connections and self.connections[session_id].get('transfer_cancelled', False):
                        logger.info(f"Transfer cancelled by user for session {session_id}")
                        break
                    
                    # Update current file
                    if session_id in self.transfer_progress:
                        self.transfer_progress[session_id]['current_file'] = f"Processing {os.path.basename(file_path)} ({i+1}/{len(file_list)})"
                    
                    # Get relative path
                    rel_path = os.path.relpath(file_path, source_base)
                    dest_path = os.path.join(dest_base, rel_path).replace('\\', '/')
                    
                    logger.info(f"Transferring {file_path} -> {dest_path}")
                    
                    if direction == 'upload':
                        if os.path.isdir(file_path):
                            self._upload_folder_recursive_with_progress(sftp, file_path, dest_path, session_id)
                        else:
                            # Ensure destination directory exists
                            dest_dir = os.path.dirname(dest_path)
                            self._ensure_remote_dir(sftp, dest_dir)
                            self._upload_file_with_progress(sftp, file_path, dest_path, session_id)
                    else:  # download
                        if self._is_remote_directory(sftp, file_path):
                            self._download_folder_recursive_with_progress(sftp, file_path, dest_path, session_id)
                        else:
                            # Ensure local directory exists
                            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                            self._download_file_with_progress(sftp, file_path, dest_path, session_id)
                    
                    results.append({'file': file_path, 'success': True})
                    logger.info(f"Successfully transferred {file_path}")
                    
                except Exception as e:
                    logger.error(f"Error transferring {file_path}: {e}")
                    results.append({'file': file_path, 'success': False, 'error': str(e)})
            
            # Final progress update
            if session_id in self.transfer_progress:
                self.transfer_progress[session_id]['current_file'] = 'Transfer completed!'
                logger.info(f"Transfer completed. Files: {self.transfer_progress[session_id]['files_completed']}/{total_files_count}, Dirs: {self.transfer_progress[session_id]['dirs_completed']}/{total_dirs_count}")
            
            # Schedule cleanup after 5 seconds to allow final status to be read
            def cleanup_progress():
                import time
                time.sleep(5)
                if hasattr(self, 'transfer_progress') and session_id in self.transfer_progress:
                    del self.transfer_progress[session_id]
                    logger.info(f"Cleaned up progress info for session {session_id}")
            
            import threading
            cleanup_thread = threading.Thread(target=cleanup_progress)
            cleanup_thread.daemon = True
            cleanup_thread.start()
            
            return {'success': True, 'results': results}
            
        except Exception as e:
            logger.error(f"Error in multiple file transfer: {e}")
            
            # Check if it was a cancellation
            if "cancelled by user" in str(e):
                logger.info(f"Transfer was cancelled by user for session {session_id}")
                # Clean up progress info on cancellation
                if hasattr(self, 'transfer_progress') and session_id in self.transfer_progress:
                    del self.transfer_progress[session_id]
                return {'success': False, 'error': 'Transfer cancelled by user', 'cancelled': True}
            
            # Clean up progress info on error
            if hasattr(self, 'transfer_progress') and session_id in self.transfer_progress:
                del self.transfer_progress[session_id]
            return {'success': False, 'error': str(e)}

    def _get_local_folder_details(self, folder_path):
        """Calculate total size, file count, and directory count of local folder"""
        total_size = 0
        file_count = 0
        dir_count = 0
        try:
            for dirpath, dirnames, filenames in os.walk(folder_path):
                dir_count += len(dirnames)
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    try:
                        total_size += os.path.getsize(filepath)
                        file_count += 1
                    except:
                        pass
        except:
            pass
        return total_size, file_count, dir_count
    
    def _get_remote_folder_details(self, sftp, folder_path):
        """Calculate total size, file count, and directory count of remote folder"""
        total_size = 0
        file_count = 0
        dir_count = 0
        try:
            def count_recursive(remote_path):
                nonlocal total_size, file_count, dir_count
                try:
                    for item in sftp.listdir_attr(remote_path):
                        item_path = os.path.join(remote_path, item.filename).replace('\\', '/')
                        if stat.S_ISDIR(item.st_mode):
                            dir_count += 1
                            count_recursive(item_path)
                        else:
                            file_count += 1
                            total_size += item.st_size
                except Exception as e:
                    logger.warning(f"Could not access {remote_path}: {e}")
            
            count_recursive(folder_path)
        except:
            pass
        return total_size, file_count, dir_count
        """Calculate total size of local folder"""
        total_size = 0
        try:
            for dirpath, dirnames, filenames in os.walk(folder_path):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    try:
                        total_size += os.path.getsize(filepath)
                    except:
                        pass
        except:
            pass
        return total_size
    
    def _get_remote_folder_size(self, sftp, folder_path):
        """Calculate total size of remote folder"""
        total_size = 0
        try:
            for item in sftp.listdir_attr(folder_path):
                item_path = os.path.join(folder_path, item.filename).replace('\\', '/')
                if stat.S_ISDIR(item.st_mode):
                    total_size += self._get_remote_folder_size(sftp, item_path)
                else:
                    total_size += item.st_size
        except:
            pass
        return total_size
    
    def _upload_file_with_progress(self, sftp, local_path, remote_path, session_id):
        """Upload single file with fixed completion tracking"""
        file_size = os.path.getsize(local_path)
        
        # Mark transfer as active for keep-alive optimization
        if session_id in self.connections:
            self.connections[session_id]['transfer_active'] = True
        
        # Store the initial transferred size for this file
        initial_transferred = 0
        if session_id in self.transfer_progress:
            initial_transferred = self.transfer_progress[session_id]['transferred_size']
        
        # Track completion state
        transfer_completed = False
        
        def progress_callback(transferred, total):
            nonlocal transfer_completed
            
            # Check for cancellation
            if session_id in self.connections and self.connections[session_id].get('transfer_cancelled', False):
                logger.info(f"Transfer cancelled by user for session {session_id}")
                raise Exception("Transfer cancelled by user")
            
            if session_id in self.transfer_progress:
                # Calculate the actual progress for this specific file
                # Set the total transferred size to initial + current file progress
                self.transfer_progress[session_id]['transferred_size'] = initial_transferred + transferred
                
                # Update current file info
                self.transfer_progress[session_id]['current_file'] = f"Uploading {os.path.basename(local_path)} ({transferred}/{total} bytes)"
                
                # Update stats
                if session_id in self.connections:
                    self.connections[session_id]['stats']['bytes_transferred'] = initial_transferred + transferred
                
                # Check for completion in callback (more reliable)
                if transferred >= total and not transfer_completed:
                    transfer_completed = True
                    # Immediately update file completion count
                    self.transfer_progress[session_id]['files_completed'] += 1
                    self.transfer_progress[session_id]['current_file'] = f"✅ {os.path.basename(local_path)} completed"
                    logger.info(f"✅ File completed in callback: {self.transfer_progress[session_id]['files_completed']}/{self.transfer_progress[session_id]['total_files']} - {os.path.basename(local_path)}")
                
                # Log progress for large files
                if total > 100 * 1024 * 1024:  # Files larger than 100MB
                    percent = (transferred / total) * 100
                    if percent % 10 < 1:  # Log every 10%
                        logger.info(f"Large file upload progress: {os.path.basename(local_path)} - {percent:.1f}% ({transferred}/{total} bytes)")
                
                if transferred == total:
                    logger.info(f"File upload completed: {os.path.basename(local_path)} ({transferred}/{total} bytes)")
        
        # Upload the file with enhanced error handling
        try:
            # For large files, use optimized transfer
            if file_size > 50 * 1024 * 1024:  # Files larger than 50MB
                logger.info(f"Starting large file upload: {os.path.basename(local_path)} ({file_size} bytes)")
                # Increase buffer size for large files
                sftp.get_channel().settimeout(600)  # 10 minute timeout for large files
            
            # Update current file info
            if session_id in self.transfer_progress:
                self.transfer_progress[session_id]['current_file'] = f"Starting upload: {os.path.basename(local_path)}"
            
            sftp.put(local_path, remote_path, callback=progress_callback)
            
            # Ensure completion is recorded (fallback if callback didn't trigger)
            if session_id in self.transfer_progress and not transfer_completed:
                self.transfer_progress[session_id]['files_completed'] += 1
                self.transfer_progress[session_id]['current_file'] = f"✅ {os.path.basename(local_path)} completed"
                logger.info(f"✅ File completed (fallback): {self.transfer_progress[session_id]['files_completed']}/{self.transfer_progress[session_id]['total_files']} - {os.path.basename(local_path)}")
                
            # Update connection stats
            if session_id in self.connections:
                self.connections[session_id]['stats']['files_transferred'] += 1
                self.connections[session_id]['stats']['last_transfer_time'] = datetime.now()
                
        except Exception as e:
            # Update failed file count
            if session_id in self.transfer_progress:
                self.transfer_progress[session_id]['files_failed'] += 1
                self.transfer_progress[session_id]['current_file'] = f"❌ {os.path.basename(local_path)} failed: {str(e)}"
                logger.error(f"❌ File failed: {self.transfer_progress[session_id]['files_failed']} total failures - {os.path.basename(local_path)}: {e}")
            raise e
        finally:
            # Mark transfer as inactive
            if session_id in self.connections:
                self.connections[session_id]['transfer_active'] = False
    
    def _download_file_with_progress(self, sftp, remote_path, local_path, session_id):
        """Download single file with enhanced progress tracking and large file support"""
        try:
            file_size = sftp.stat(remote_path).st_size
        except:
            file_size = 0
        
        # Mark transfer as active for keep-alive optimization
        if session_id in self.connections:
            self.connections[session_id]['transfer_active'] = True
        
        def progress_callback(transferred, total):
            if session_id in self.transfer_progress:
                # Calculate the difference from last callback
                last_transferred = getattr(progress_callback, 'last_transferred', 0)
                bytes_diff = transferred - last_transferred
                
                # Update transferred size
                self.transfer_progress[session_id]['transferred_size'] += bytes_diff
                progress_callback.last_transferred = transferred
                
                # Update stats
                if session_id in self.connections:
                    self.connections[session_id]['stats']['bytes_transferred'] += bytes_diff
                
                # Log progress for large files
                if total > 100 * 1024 * 1024:  # Files larger than 100MB
                    percent = (transferred / total) * 100
                    if percent % 10 < 1:  # Log every 10%
                        logger.info(f"Large file download progress: {os.path.basename(remote_path)} - {percent:.1f}% ({transferred}/{total} bytes)")
                
                if transferred == total:
                    logger.info(f"File download completed: {os.path.basename(remote_path)} ({transferred}/{total} bytes)")
        
        # Reset callback state
        progress_callback.last_transferred = 0
    def _download_file_with_progress(self, sftp, remote_path, local_path, session_id):
        """Download single file with fixed completion tracking"""
        try:
            file_size = sftp.stat(remote_path).st_size
        except:
            file_size = 0
        
        # Mark transfer as active for keep-alive optimization
        if session_id in self.connections:
            self.connections[session_id]['transfer_active'] = True
        
        # Store the initial transferred size for this file
        initial_transferred = 0
        if session_id in self.transfer_progress:
            initial_transferred = self.transfer_progress[session_id]['transferred_size']
        
        # Track completion state
        transfer_completed = False
        
        def progress_callback(transferred, total):
            nonlocal transfer_completed
            
            # Check for cancellation
            if session_id in self.connections and self.connections[session_id].get('transfer_cancelled', False):
                logger.info(f"Transfer cancelled by user for session {session_id}")
                raise Exception("Transfer cancelled by user")
            
            if session_id in self.transfer_progress:
                # Calculate the actual progress for this specific file
                # Set the total transferred size to initial + current file progress
                self.transfer_progress[session_id]['transferred_size'] = initial_transferred + transferred
                
                # Update current file info
                self.transfer_progress[session_id]['current_file'] = f"Downloading {os.path.basename(remote_path)} ({transferred}/{total} bytes)"
                
                # Update stats
                if session_id in self.connections:
                    self.connections[session_id]['stats']['bytes_transferred'] = initial_transferred + transferred
                
                # Check for completion in callback (more reliable)
                if transferred >= total and not transfer_completed:
                    transfer_completed = True
                    # Immediately update file completion count
                    self.transfer_progress[session_id]['files_completed'] += 1
                    self.transfer_progress[session_id]['current_file'] = f"✅ {os.path.basename(remote_path)} completed"
                    logger.info(f"✅ File completed in callback: {self.transfer_progress[session_id]['files_completed']}/{self.transfer_progress[session_id]['total_files']} - {os.path.basename(remote_path)}")
                
                # Log progress for large files
                if total > 100 * 1024 * 1024:  # Files larger than 100MB
                    percent = (transferred / total) * 100
                    if percent % 10 < 1:  # Log every 10%
                        logger.info(f"Large file download progress: {os.path.basename(remote_path)} - {percent:.1f}% ({transferred}/{total} bytes)")
                
                if transferred == total:
                    logger.info(f"File download completed: {os.path.basename(remote_path)} ({transferred}/{total} bytes)")
        
        # Download the file with enhanced error handling
        try:
            # For large files, use optimized transfer
            if file_size > 50 * 1024 * 1024:  # Files larger than 50MB
                logger.info(f"Starting large file download: {os.path.basename(remote_path)} ({file_size} bytes)")
                # Increase buffer size for large files
                sftp.get_channel().settimeout(600)  # 10 minute timeout for large files
            
            # Update current file info
            if session_id in self.transfer_progress:
                self.transfer_progress[session_id]['current_file'] = f"Starting download: {os.path.basename(remote_path)}"
            
            sftp.get(remote_path, local_path, callback=progress_callback)
            
            # Ensure completion is recorded (fallback if callback didn't trigger)
            if session_id in self.transfer_progress and not transfer_completed:
                self.transfer_progress[session_id]['files_completed'] += 1
                self.transfer_progress[session_id]['current_file'] = f"✅ {os.path.basename(remote_path)} completed"
                logger.info(f"✅ File completed (fallback): {self.transfer_progress[session_id]['files_completed']}/{self.transfer_progress[session_id]['total_files']} - {os.path.basename(remote_path)}")
                
            # Update connection stats
            if session_id in self.connections:
                self.connections[session_id]['stats']['files_transferred'] += 1
                self.connections[session_id]['stats']['last_transfer_time'] = datetime.now()
                
        except Exception as e:
            # Update failed file count
            if session_id in self.transfer_progress:
                self.transfer_progress[session_id]['files_failed'] += 1
                self.transfer_progress[session_id]['current_file'] = f"❌ {os.path.basename(remote_path)} failed: {str(e)}"
                logger.error(f"❌ File failed: {self.transfer_progress[session_id]['files_failed']} total failures - {os.path.basename(remote_path)}: {e}")
            raise e
        finally:
            # Mark transfer as inactive
            if session_id in self.connections:
                self.connections[session_id]['transfer_active'] = False
    
    def _upload_folder_recursive_with_progress(self, sftp, local_path, remote_path, session_id):
        """Recursively upload folder with progress tracking"""
        try:
            # Create remote directory
            try:
                sftp.mkdir(remote_path)
                logger.info(f"Created remote directory: {remote_path}")
            except Exception as e:
                # Directory might already exist
                try:
                    stat_info = sftp.stat(remote_path)
                    if not stat.S_ISDIR(stat_info.st_mode):
                        raise Exception(f"Remote path {remote_path} exists but is not a directory")
                except:
                    logger.warning(f"Could not create or verify remote directory {remote_path}: {e}")
            
            # Upload all items in the directory FIRST
            for item in os.listdir(local_path):
                local_item_path = os.path.join(local_path, item)
                remote_item_path = os.path.join(remote_path, item).replace('\\', '/')
                
                try:
                    if os.path.isdir(local_item_path):
                        logger.info(f"Uploading folder: {local_item_path} -> {remote_item_path}")
                        # Update current file being processed
                        if session_id in self.transfer_progress:
                            self.transfer_progress[session_id]['current_file'] = f"📁 {item}"
                        self._upload_folder_recursive_with_progress(sftp, local_item_path, remote_item_path, session_id)
                    else:
                        logger.info(f"Uploading file: {local_item_path} -> {remote_item_path}")
                        # Update current file being processed
                        if session_id in self.transfer_progress:
                            self.transfer_progress[session_id]['current_file'] = f"📄 {item}"
                        self._upload_file_with_progress(sftp, local_item_path, remote_item_path, session_id)
                except Exception as e:
                    logger.error(f"Failed to upload {local_item_path}: {e}")
                    raise e
            
            # ONLY NOW update directory count (after all contents are transferred)
            if session_id in self.transfer_progress:
                self.transfer_progress[session_id]['dirs_completed'] += 1
                self.transfer_progress[session_id]['current_file'] = f"✅ 📁 {os.path.basename(local_path)} completed"
                logger.info(f"Directory completed: {self.transfer_progress[session_id]['dirs_completed']}/{self.transfer_progress[session_id]['total_dirs']}")
                
                # Small delay to ensure progress is visible
                import time
                time.sleep(0.1)
                    
        except Exception as e:
            logger.error(f"Error in recursive folder upload {local_path} -> {remote_path}: {e}")
            # Update failed directory count
            if session_id in self.transfer_progress:
                self.transfer_progress[session_id]['dirs_failed'] += 1
                self.transfer_progress[session_id]['current_file'] = f"❌ 📁 {os.path.basename(local_path)} failed"
            raise e
    
    def _download_folder_recursive_with_progress(self, sftp, remote_path, local_path, session_id):
        """Recursively download folder with progress tracking"""
        try:
            # Create local directory
            os.makedirs(local_path, exist_ok=True)
            logger.info(f"Created local directory: {local_path}")
            
            # Download all items in the directory FIRST
            for item in sftp.listdir_attr(remote_path):
                remote_item_path = os.path.join(remote_path, item.filename).replace('\\', '/')
                local_item_path = os.path.join(local_path, item.filename)
                
                try:
                    if stat.S_ISDIR(item.st_mode):
                        logger.info(f"Downloading folder: {remote_item_path} -> {local_item_path}")
                        # Update current file being processed
                        if session_id in self.transfer_progress:
                            self.transfer_progress[session_id]['current_file'] = f"📁 {item.filename}"
                        self._download_folder_recursive_with_progress(sftp, remote_item_path, local_item_path, session_id)
                    else:
                        logger.info(f"Downloading file: {remote_item_path} -> {local_item_path}")
                        # Update current file being processed
                        if session_id in self.transfer_progress:
                            self.transfer_progress[session_id]['current_file'] = f"📄 {item.filename}"
                        self._download_file_with_progress(sftp, remote_item_path, local_item_path, session_id)
                except Exception as e:
                    logger.error(f"Failed to download {remote_item_path}: {e}")
                    raise e
            
            # ONLY NOW update directory count (after all contents are transferred)
            if session_id in self.transfer_progress:
                self.transfer_progress[session_id]['dirs_completed'] += 1
                self.transfer_progress[session_id]['current_file'] = f"✅ 📁 {os.path.basename(remote_path)} completed"
                logger.info(f"Directory completed: {self.transfer_progress[session_id]['dirs_completed']}/{self.transfer_progress[session_id]['total_dirs']}")
                
                # Small delay to ensure progress is visible
                import time
                time.sleep(0.1)
                    
        except Exception as e:
            logger.error(f"Error in recursive folder download {remote_path} -> {local_path}: {e}")
            # Update failed directory count
            if session_id in self.transfer_progress:
                self.transfer_progress[session_id]['dirs_failed'] += 1
                self.transfer_progress[session_id]['current_file'] = f"❌ 📁 {os.path.basename(remote_path)} failed"
            raise e

    def _ensure_remote_dir(self, sftp, path):
        """Ensure remote directory exists"""
        try:
            sftp.stat(path)
        except FileNotFoundError:
            # Directory doesn't exist, create it
            parent = os.path.dirname(path)
            if parent and parent != '/':
                self._ensure_remote_dir(sftp, parent)
            sftp.mkdir(path)

    def _is_remote_directory(self, sftp, path):
        """Check if remote path is a directory"""
        try:
            return stat.S_ISDIR(sftp.stat(path).st_mode)
        except:
            return False

    def _download_folder_recursive(self, sftp, remote_path, local_path):
        """Recursively download folder"""
        try:
            # Create local directory
            os.makedirs(local_path, exist_ok=True)
            logger.info(f"Created local directory: {local_path}")
            
            # Download all items in the directory
            for item in sftp.listdir_attr(remote_path):
                remote_item_path = os.path.join(remote_path, item.filename).replace('\\', '/')
                local_item_path = os.path.join(local_path, item.filename)
                
                try:
                    if stat.S_ISDIR(item.st_mode):
                        logger.info(f"Downloading folder: {remote_item_path} -> {local_item_path}")
                        self._download_folder_recursive(sftp, remote_item_path, local_item_path)
                    else:
                        logger.info(f"Downloading file: {remote_item_path} -> {local_item_path}")
                        sftp.get(remote_item_path, local_item_path)
                except Exception as e:
                    logger.error(f"Failed to download {remote_item_path}: {e}")
                    raise e
                    
        except Exception as e:
            logger.error(f"Error in recursive folder download {remote_path} -> {local_path}: {e}")
            raise e

    def _upload_folder_recursive(self, sftp, local_path, remote_path):
        """Recursively upload folder"""
        try:
            # Create remote directory
            try:
                sftp.mkdir(remote_path)
                logger.info(f"Created remote directory: {remote_path}")
            except Exception as e:
                # Directory might already exist, check if it's actually a directory
                try:
                    stat_info = sftp.stat(remote_path)
                    if not stat.S_ISDIR(stat_info.st_mode):
                        raise Exception(f"Remote path {remote_path} exists but is not a directory")
                except:
                    # If we can't stat it, try to create it anyway
                    logger.warning(f"Could not create or verify remote directory {remote_path}: {e}")
            
            # Upload all items in the directory
            for item in os.listdir(local_path):
                local_item_path = os.path.join(local_path, item)
                remote_item_path = os.path.join(remote_path, item).replace('\\', '/')
                
                try:
                    if os.path.isdir(local_item_path):
                        logger.info(f"Uploading folder: {local_item_path} -> {remote_item_path}")
                        self._upload_folder_recursive(sftp, local_item_path, remote_item_path)
                    else:
                        logger.info(f"Uploading file: {local_item_path} -> {remote_item_path}")
                        sftp.put(local_item_path, remote_item_path)
                except Exception as e:
                    logger.error(f"Failed to upload {local_item_path}: {e}")
                    raise e
                    
        except Exception as e:
            logger.error(f"Error in recursive folder upload {local_path} -> {remote_path}: {e}")
            raise e

# Global SCP manager instance
scp_manager = SCPManager()

@app.route('/')
def index():
    """Main application page"""
    return render_template('index_enhanced_v2.html')

@app.route('/api/saved-credentials')
def get_saved_credentials():
    """Get list of saved credentials"""
    return jsonify(scp_manager.get_saved_credential_names())

@app.route('/api/os-info')
def get_os_info():
    """Get OS information and navigation buttons"""
    return jsonify({
        'success': True,
        'os_info': OS_INFO
    })

@app.route('/api/load-credential', methods=['POST'])
def load_credential():
    """Load saved credential"""
    data = request.json
    credential_name = data.get('credential_name')
    
    credential = scp_manager.load_credential(credential_name)
    if credential:
        return jsonify({
            'success': True,
            'host': credential['host'],
            'port': credential.get('port', 22),
            'username': credential['username'],
            'has_password': bool(credential.get('password')),
            'has_key': bool(credential.get('key_data')),
            'credential': {
                'password': credential.get('password'),
                'key_data': credential.get('key_data')
            }
        })
    else:
        return jsonify({'success': False, 'error': 'Credential not found'})

@app.route('/api/delete-credential', methods=['POST'])
def delete_credential():
    """Delete saved credential"""
    data = request.json
    credential_name = data.get('credential_name')
    
    success = scp_manager.delete_credential(credential_name)
    return jsonify({'success': success})

@app.route('/api/test-connection', methods=['POST'])
def test_connection():
    """Test server availability before login attempt"""
    try:
        data = request.json
        host = data.get('host')
        port = int(data.get('port', 22))
        
        if not host:
            return jsonify({'success': False, 'error': 'Host is required'})
        
        # Test basic network connectivity first
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)  # 5 second timeout
        
        try:
            result = sock.connect_ex((host, port))
            sock.close()
            
            if result != 0:
                return jsonify({
                    'success': False, 
                    'error': f'Server {host}:{port} is not reachable. Please check if the server is running and accessible.',
                    'error_type': 'server_unreachable'
                })
            
            # If basic connectivity works, try SSH handshake
            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            try:
                # Just test the SSH handshake, don't authenticate
                transport = paramiko.Transport((host, port))
                transport.start_client(timeout=10)
                
                if transport.is_active():
                    transport.close()
                    return jsonify({
                        'success': True, 
                        'message': f'Server {host}:{port} is available and SSH service is running',
                        'server_info': {
                            'host': host,
                            'port': port,
                            'ssh_available': True
                        }
                    })
                else:
                    return jsonify({
                        'success': False, 
                        'error': f'SSH service on {host}:{port} is not responding properly',
                        'error_type': 'ssh_unavailable'
                    })
                    
            except paramiko.AuthenticationException:
                # This is actually good - server is available, just need credentials
                return jsonify({
                    'success': True, 
                    'message': f'Server {host}:{port} is available. Ready for authentication.',
                    'server_info': {
                        'host': host,
                        'port': port,
                        'ssh_available': True
                    }
                })
            except Exception as e:
                return jsonify({
                    'success': False, 
                    'error': f'SSH connection failed: {str(e)}',
                    'error_type': 'ssh_error'
                })
                
        except socket.timeout:
            return jsonify({
                'success': False, 
                'error': f'Connection timeout to {host}:{port}. Server may be down or unreachable.',
                'error_type': 'timeout'
            })
        except socket.gaierror:
            return jsonify({
                'success': False, 
                'error': f'Cannot resolve hostname {host}. Please check the server address.',
                'error_type': 'dns_error'
            })
        except Exception as e:
            return jsonify({
                'success': False, 
                'error': f'Network error: {str(e)}',
                'error_type': 'network_error'
            })
            
    except Exception as e:
        logger.error(f"Connection test error: {e}")
        return jsonify({
            'success': False, 
            'error': f'Connection test failed: {str(e)}',
            'error_type': 'internal_error'
        })

@app.route('/api/login', methods=['POST'])
def login():
    """Login to remote server"""
    data = request.json
    
    session_id = hashlib.md5(f"{data.get('host')}{data.get('username')}{datetime.now()}".encode()).hexdigest()
    
    success = scp_manager.create_connection(
        session_id=session_id,
        host=data.get('host'),
        username=data.get('username'),
        password=data.get('password'),
        key_data=data.get('key_data'),
        port=int(data.get('port', 22))
    )
    
    if success:
        session['session_id'] = session_id
        
        # Detect remote OS
        remote_os = 'unknown'
        try:
            remote_os = scp_manager.detect_remote_os(session_id)
        except Exception as e:
            logger.warning(f"Could not detect remote OS: {e}")
        
        # Save credentials if requested
        if data.get('save_credentials'):
            scp_manager.save_credentials(
                host=data.get('host'),
                username=data.get('username'),
                password=data.get('password'),
                key_data=data.get('key_data'),
                port=int(data.get('port', 22))
            )
        
        return jsonify({
            'success': True, 
            'session_id': session_id,
            'remote_os': remote_os
        })
    else:
        return jsonify({'success': False, 'error': 'Failed to connect'})

@app.route('/api/disconnect', methods=['POST'])
def disconnect():
    """Disconnect from remote server"""
    session_id = session.get('session_id')
    if session_id:
        scp_manager.close_connection(session_id)
        session.pop('session_id', None)
    return jsonify({'success': True})

@app.route('/api/list-remote')
def list_remote():
    """List remote directory"""
    session_id = session.get('session_id')
    path = request.args.get('path', '/')
    
    result = scp_manager.list_remote_directory(session_id, path)
    return jsonify(result)

@app.route('/api/list-local')
def list_local():
    """List local directory with OS-specific default"""
    path = request.args.get('path', OS_INFO['default_path'])
    
    result = scp_manager.list_local_directory(path)
    return jsonify(result)

@app.route('/api/count-local-items')
def count_local_items():
    """Count files and directories in local path with OS-specific default"""
    path = request.args.get('path', OS_INFO['default_path'])
    
    try:
        # If path is root or doesn't exist, default to OS-specific default
        if path == '/' or not os.path.exists(path):
            path = OS_INFO['default_path']
            
        if os.path.isfile(path):
            return jsonify({'success': True, 'files': 1, 'directories': 0})
        elif os.path.isdir(path):
            file_count = 0
            dir_count = 0
            
            for root, dirs, files in os.walk(path):
                file_count += len(files)
                dir_count += len(dirs)
            
            return jsonify({'success': True, 'files': file_count, 'directories': dir_count})
        else:
            return jsonify({'success': False, 'error': 'Path does not exist'})
            
    except Exception as e:
        logger.error(f"Error counting local items in {path}: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/count-remote-items')
def count_remote_items():
    """Count files and directories in remote path"""
    path = request.args.get('path', '/')
    session_id = session.get('session_id')
    
    conn = scp_manager.get_connection(session_id)
    if not conn:
        return jsonify({'success': False, 'error': 'No connection found'})
    
    try:
        sftp = conn['sftp']
        
        # Check if it's a file or directory
        try:
            stat_info = sftp.stat(path)
            if not stat.S_ISDIR(stat_info.st_mode):
                return jsonify({'success': True, 'files': 1, 'directories': 0})
        except:
            return jsonify({'success': False, 'error': 'Path does not exist'})
        
        # Count files and directories recursively
        file_count = 0
        dir_count = 0
        
        def count_recursive(remote_path):
            nonlocal file_count, dir_count
            try:
                for item in sftp.listdir_attr(remote_path):
                    item_path = os.path.join(remote_path, item.filename).replace('\\', '/')
                    if stat.S_ISDIR(item.st_mode):
                        dir_count += 1
                        count_recursive(item_path)
                    else:
                        file_count += 1
            except Exception as e:
                logger.warning(f"Could not access {remote_path}: {e}")
        
        count_recursive(path)
        return jsonify({'success': True, 'files': file_count, 'directories': dir_count})
        
    except Exception as e:
        logger.error(f"Error counting remote items in {path}: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/transfer-progress')
def get_transfer_progress():
    """Get current transfer progress with enhanced debugging"""
    session_id = session.get('session_id')
    
    if not session_id or not hasattr(scp_manager, 'transfer_progress') or session_id not in scp_manager.transfer_progress:
        return jsonify({
            'progress': 0, 
            'speed': 0, 
            'current_file': 'No active transfer', 
            'eta': 0,
            'debug_info': {
                'session_id': session_id,
                'has_progress_attr': hasattr(scp_manager, 'transfer_progress'),
                'active_sessions': list(scp_manager.transfer_progress.keys()) if hasattr(scp_manager, 'transfer_progress') else []
            }
        })
    
    try:
        progress_info = scp_manager.transfer_progress[session_id]
        
        # Calculate progress percentage
        if progress_info['total_size'] > 0:
            progress_percent = min(100, (progress_info['transferred_size'] / progress_info['total_size']) * 100)
        else:
            # Fallback to item-based progress
            completed_items = progress_info['files_completed'] + progress_info['dirs_completed']
            if progress_info['total_items'] > 0:
                progress_percent = (completed_items / progress_info['total_items']) * 100
            else:
                progress_percent = 0
        
        # Calculate transfer speed
        elapsed_time = (datetime.now() - progress_info['start_time']).total_seconds()
        if elapsed_time > 0:
            speed_bps = progress_info['transferred_size'] / elapsed_time
        else:
            speed_bps = 0
        
        # Calculate ETA
        if speed_bps > 0 and progress_info['total_size'] > progress_info['transferred_size']:
            remaining_bytes = progress_info['total_size'] - progress_info['transferred_size']
            eta_seconds = remaining_bytes / speed_bps
        else:
            eta_seconds = 0
        
        # Format speed for display
        if speed_bps > 1024 * 1024:  # MB/s
            speed_str = f"{speed_bps / (1024 * 1024):.1f} MB/s"
        elif speed_bps > 1024:  # KB/s
            speed_str = f"{speed_bps / 1024:.1f} KB/s"
        else:  # B/s
            speed_str = f"{speed_bps:.0f} B/s"
        
        return jsonify({
            'progress': round(progress_percent, 1),
            'speed': speed_bps,
            'speed_str': speed_str,
            'current_file': progress_info.get('current_file', 'Processing...'),
            'eta': eta_seconds,
            'transferred_size': progress_info['transferred_size'],
            'total_size': progress_info['total_size'],
            'files_completed': progress_info['files_completed'],
            'dirs_completed': progress_info['dirs_completed'],
            'files_failed': progress_info.get('files_failed', 0),
            'dirs_failed': progress_info.get('dirs_failed', 0),
            'total_files': progress_info['total_files'],
            'total_dirs': progress_info['total_dirs'],
            'total_items': progress_info['total_items'],
            'debug_info': {
                'session_active': session_id in scp_manager.connections,
                'transfer_active': scp_manager.connections.get(session_id, {}).get('transfer_active', False) if session_id in scp_manager.connections else False,
                'elapsed_time': elapsed_time,
                'last_update': datetime.now().isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting transfer progress for session {session_id}: {e}")
        return jsonify({
            'progress': 0, 
            'speed': 0, 
            'current_file': f'Error: {str(e)}', 
            'eta': 0,
            'error': str(e),
            'debug_info': {
                'session_id': session_id,
                'exception_type': type(e).__name__
            }
        })

@app.route('/api/cancel-transfer', methods=['POST'])
def cancel_transfer():
    """Cancel current transfer operation"""
    try:
        session_id = session.get('session_id')
        if not session_id:
            return jsonify({'success': False, 'error': 'No active session'})
        
        # Clear progress from session
        if hasattr(scp_manager, 'transfer_progress') and session_id in scp_manager.transfer_progress:
            del scp_manager.transfer_progress[session_id]
            logger.info(f"Cleared transfer progress for session {session_id}")
        
        # Mark transfer as cancelled in connection
        if session_id in scp_manager.connections:
            scp_manager.connections[session_id]['transfer_active'] = False
            scp_manager.connections[session_id]['transfer_cancelled'] = True
            logger.info(f"Marked transfer as cancelled for session {session_id}")
        
        return jsonify({
            'success': True,
            'message': 'Transfer cancelled successfully'
        })
    except Exception as e:
        logger.error(f"Error cancelling transfer: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/transfer-multiple', methods=['POST'])
def transfer_multiple():
    """Transfer multiple files"""
    data = request.json
    session_id = session.get('session_id')
    
    result = scp_manager.transfer_multiple_files(
        session_id=session_id,
        file_list=data.get('files', []),
        direction=data.get('direction'),
        source_base=data.get('source_base'),
        dest_base=data.get('dest_base')
    )
    
    return jsonify(result)

@app.route('/api/download', methods=['POST'])
def download_file():
    """Download single file from remote to local with progress tracking"""
    data = request.json
    session_id = session.get('session_id')
    
    conn = scp_manager.get_connection(session_id)
    if not conn:
        return jsonify({'success': False, 'error': 'No connection found'})
    
    try:
        remote_path = data.get('remote_path')
        local_path = data.get('local_path')
        
        if not remote_path or not local_path:
            return jsonify({'success': False, 'error': 'Both remote_path and local_path are required'})
        
        # Ensure local directory exists
        local_dir = os.path.dirname(local_path)
        if local_dir:
            os.makedirs(local_dir, exist_ok=True)
        
        # Check if remote file exists
        sftp = conn['sftp']
        try:
            file_stat = sftp.stat(remote_path)
            file_size = file_stat.st_size
        except FileNotFoundError:
            return jsonify({'success': False, 'error': f'Remote file not found: {remote_path}'})
        except Exception as e:
            return jsonify({'success': False, 'error': f'Cannot access remote file: {str(e)}'})
        
        # Initialize progress tracking for single file download
        if not hasattr(scp_manager, 'transfer_progress'):
            scp_manager.transfer_progress = {}
        
        scp_manager.transfer_progress[session_id] = {
            'total_size': file_size,
            'transferred_size': 0,
            'current_file': f'Downloading {os.path.basename(remote_path)}',
            'start_time': datetime.now(),
            'files_completed': 0,
            'dirs_completed': 0,
            'files_failed': 0,
            'dirs_failed': 0,
            'total_files': 1,
            'total_dirs': 0,
            'total_items': 1
        }
        
        # Use the enhanced download method with progress tracking
        scp_manager._download_file_with_progress(sftp, remote_path, local_path, session_id)
        
        # Clean up progress info after a short delay
        def cleanup_progress():
            import time
            time.sleep(2)
            if hasattr(scp_manager, 'transfer_progress') and session_id in scp_manager.transfer_progress:
                del scp_manager.transfer_progress[session_id]
        
        import threading
        cleanup_thread = threading.Thread(target=cleanup_progress, daemon=True)
        cleanup_thread.start()
        
        return jsonify({'success': True, 'message': f'Downloaded {os.path.basename(remote_path)} successfully'})
        
    except Exception as e:
        logger.error(f"Download error: {e}")
        # Clean up progress info on error
        if hasattr(scp_manager, 'transfer_progress') and session_id in scp_manager.transfer_progress:
            del scp_manager.transfer_progress[session_id]
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Upload single file from local to remote with progress tracking"""
    data = request.json
    session_id = session.get('session_id')
    
    conn = scp_manager.get_connection(session_id)
    if not conn:
        return jsonify({'success': False, 'error': 'No connection found'})
    
    try:
        local_path = data.get('local_path')
        remote_path = data.get('remote_path')
        
        if not local_path or not remote_path:
            return jsonify({'success': False, 'error': 'Both local_path and remote_path are required'})
        
        # Check if local file exists
        if not os.path.exists(local_path):
            return jsonify({'success': False, 'error': f'Local file not found: {local_path}'})
        
        file_size = os.path.getsize(local_path)
        
        # Ensure remote directory exists
        sftp = conn['sftp']
        remote_dir = os.path.dirname(remote_path)
        if remote_dir and remote_dir != '/':
            scp_manager._ensure_remote_dir(sftp, remote_dir)
        
        # Initialize progress tracking for single file upload
        if not hasattr(scp_manager, 'transfer_progress'):
            scp_manager.transfer_progress = {}
        
        scp_manager.transfer_progress[session_id] = {
            'total_size': file_size,
            'transferred_size': 0,
            'current_file': f'Uploading {os.path.basename(local_path)}',
            'start_time': datetime.now(),
            'files_completed': 0,
            'dirs_completed': 0,
            'files_failed': 0,
            'dirs_failed': 0,
            'total_files': 1,
            'total_dirs': 0,
            'total_items': 1
        }
        
        # Use the enhanced upload method with progress tracking
        scp_manager._upload_file_with_progress(sftp, local_path, remote_path, session_id)
        
        # Clean up progress info after a short delay
        def cleanup_progress():
            import time
            time.sleep(2)
            if hasattr(scp_manager, 'transfer_progress') and session_id in scp_manager.transfer_progress:
                del scp_manager.transfer_progress[session_id]
        
        import threading
        cleanup_thread = threading.Thread(target=cleanup_progress, daemon=True)
        cleanup_thread.start()
        
        return jsonify({'success': True, 'message': f'Uploaded {os.path.basename(local_path)} successfully'})
        
    except Exception as e:
        logger.error(f"Upload error: {e}")
        # Clean up progress info on error
        if hasattr(scp_manager, 'transfer_progress') and session_id in scp_manager.transfer_progress:
            del scp_manager.transfer_progress[session_id]
        return jsonify({'success': False, 'error': str(e)})
        
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/create-local-folder', methods=['POST'])
def create_local_folder():
    try:
        data = request.get_json()
        folder_path = data.get('path')
        
        if not folder_path:
            return jsonify({'success': False, 'error': 'Path is required'})
        
        # Check if parent directory is writable
        parent_dir = os.path.dirname(folder_path)
        if not os.access(parent_dir, os.W_OK):
            return jsonify({'success': False, 'error': f'Permission denied: Cannot create folder in {parent_dir}'})
        
        # Check if folder already exists
        if os.path.exists(folder_path):
            return jsonify({'success': False, 'error': 'Folder already exists'})
        
        os.makedirs(folder_path, exist_ok=False)
        return jsonify({'success': True})
    except PermissionError:
        return jsonify({'success': False, 'error': 'Permission denied: You do not have write access to this location'})
    except FileExistsError:
        return jsonify({'success': False, 'error': 'Folder already exists'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/create-remote-folder', methods=['POST'])
def create_remote_folder():
    try:
        session_id = session.get('session_id')
        if not session_id or session_id not in scp_manager.connections:
            return jsonify({'success': False, 'error': 'Not connected'})
        
        data = request.get_json()
        folder_path = data.get('path')
        
        if not folder_path:
            return jsonify({'success': False, 'error': 'Path is required'})
        
        # Validate path safety
        validation = validate_remote_operation(folder_path, 'Create folder')
        if not validation['allowed']:
            return jsonify({'success': False, 'error': validation['error']})
        
        conn = scp_manager.connections[session_id]
        ssh = conn['ssh']
        remote_os = conn.get('remote_os', 'unix')
        
        # Use cross-platform mkdir command
        cmd = scp_manager._get_cross_platform_commands(remote_os, 'mkdir', folder_path)
        
        if not cmd:
            return jsonify({'success': False, 'error': f'Create folder operation not supported on {remote_os}'})
        
        stdin, stdout, stderr = ssh.exec_command(f'{cmd} && echo "SUCCESS" || echo "FAILED"')
        
        result = stdout.read().decode().strip()
        error_output = stderr.read().decode().strip()
        
        if result == "SUCCESS":
            logger.info(f"Successfully created folder {folder_path} on {remote_os}")
            return jsonify({'success': True})
        else:
            if not error_output:
                error_output = "Create folder operation failed"
            logger.error(f"Failed to create folder {folder_path}: {error_output}")
            return jsonify({'success': False, 'error': f'Failed to create folder: {error_output}'})
    except Exception as e:
        logger.error(f"Create remote folder error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/rename-local-item', methods=['POST'])
def rename_local_item():
    try:
        data = request.get_json()
        old_path = data.get('old_path')
        new_path = data.get('new_path')
        
        if not old_path or not new_path:
            return jsonify({'success': False, 'error': 'Both old_path and new_path are required'})
        
        # Check if source exists
        if not os.path.exists(old_path):
            return jsonify({'success': False, 'error': 'Source file/folder does not exist'})
        
        # Check if destination already exists
        if os.path.exists(new_path):
            return jsonify({'success': False, 'error': 'Destination already exists'})
        
        # Check write permission on parent directory
        parent_dir = os.path.dirname(new_path)
        if not os.access(parent_dir, os.W_OK):
            return jsonify({'success': False, 'error': f'Permission denied: Cannot write to {parent_dir}'})
        
        # Check write permission on source (for renaming)
        source_parent = os.path.dirname(old_path)
        if not os.access(source_parent, os.W_OK):
            return jsonify({'success': False, 'error': f'Permission denied: Cannot modify {source_parent}'})
        
        os.rename(old_path, new_path)
        return jsonify({'success': True})
    except PermissionError as e:
        return jsonify({'success': False, 'error': f'Permission denied: {str(e)}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/rename-remote-item', methods=['POST'])
def rename_remote_item():
    try:
        session_id = session.get('session_id')
        if not session_id or session_id not in scp_manager.connections:
            return jsonify({'success': False, 'error': 'Not connected'})
        
        data = request.get_json()
        old_path = data.get('old_path')
        new_path = data.get('new_path')
        
        if not old_path or not new_path:
            return jsonify({'success': False, 'error': 'Both old_path and new_path are required'})
        
        # Validate both paths
        old_validation = validate_remote_operation(old_path, 'Rename')
        if not old_validation['allowed']:
            return jsonify({'success': False, 'error': old_validation['error']})
        
        new_validation = validate_remote_operation(new_path, 'Rename')
        if not new_validation['allowed']:
            return jsonify({'success': False, 'error': new_validation['error']})
        
        conn = scp_manager.connections[session_id]
        ssh = conn['ssh']
        remote_os = conn.get('remote_os', 'unix')
        
        # Use cross-platform move command
        cmd = scp_manager._get_cross_platform_commands(remote_os, 'move', old_path, new_path)
        
        if not cmd:
            return jsonify({'success': False, 'error': f'Rename operation not supported on {remote_os}'})
        
        stdin, stdout, stderr = ssh.exec_command(f'{cmd} && echo "SUCCESS" || echo "FAILED"')
        
        result = stdout.read().decode().strip()
        error_output = stderr.read().decode().strip()
        
        if result == "SUCCESS":
            logger.info(f"Successfully renamed {old_path} to {new_path} on {remote_os}")
            return jsonify({'success': True})
        else:
            if not error_output:
                error_output = "Rename operation failed"
            logger.error(f"Failed to rename {old_path} to {new_path}: {error_output}")
            return jsonify({'success': False, 'error': f'Failed to rename: {error_output}'})
    except Exception as e:
        logger.error(f"Rename remote item error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/delete-local-files', methods=['POST'])
def delete_local_files():
    try:
        data = request.get_json()
        files = data.get('files', [])
        
        if not files:
            return jsonify({'success': False, 'error': 'No files specified'})
        
        failed_files = []
        
        for file_path in files:
            try:
                # Check if file exists
                if not os.path.exists(file_path):
                    failed_files.append(f"{file_path}: File does not exist")
                    continue
                
                # Check write permission on parent directory
                parent_dir = os.path.dirname(file_path)
                if not os.access(parent_dir, os.W_OK):
                    failed_files.append(f"{file_path}: Permission denied on parent directory")
                    continue
                
                # Delete file or directory
                if os.path.isdir(file_path):
                    import shutil
                    shutil.rmtree(file_path)
                else:
                    os.remove(file_path)
                    
            except PermissionError as e:
                failed_files.append(f"{file_path}: Permission denied - {str(e)}")
            except Exception as e:
                failed_files.append(f"{file_path}: {str(e)}")
        
        if failed_files:
            return jsonify({'success': False, 'error': '; '.join(failed_files)})
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/delete-remote-files', methods=['POST'])
def delete_remote_files():
    try:
        session_id = session.get('session_id')
        if not session_id or session_id not in scp_manager.connections:
            return jsonify({'success': False, 'error': 'Not connected'})
        
        data = request.get_json()
        files = data.get('files', [])
        
        if not files:
            return jsonify({'success': False, 'error': 'No files specified'})
        
        # Validate all paths before performing any operations
        for file_path in files:
            validation = validate_remote_operation(file_path, 'Delete')
            if not validation['allowed']:
                return jsonify({'success': False, 'error': validation['error']})
        
        conn = scp_manager.connections[session_id]
        ssh = conn['ssh']
        sftp = conn['sftp']
        remote_os = conn.get('remote_os', 'unix')
        failed_files = []
        
        for file_path in files:
            try:
                # Check if it's a file or directory using SFTP
                try:
                    file_stat = sftp.stat(file_path)
                    is_directory = stat.S_ISDIR(file_stat.st_mode)
                except:
                    # If stat fails, assume it's a file
                    is_directory = False
                
                # Use cross-platform commands
                if is_directory:
                    cmd = scp_manager._get_cross_platform_commands(remote_os, 'delete_dir', file_path)
                else:
                    cmd = scp_manager._get_cross_platform_commands(remote_os, 'delete_file', file_path)
                
                if not cmd:
                    failed_files.append(f"{file_path}: Unsupported OS for delete operation")
                    continue
                
                # Execute the command
                stdin, stdout, stderr = ssh.exec_command(f'{cmd} && echo "SUCCESS" || echo "FAILED"')
                result = stdout.read().decode().strip()
                
                if result != "SUCCESS":
                    error_output = stderr.read().decode().strip()
                    if not error_output:
                        error_output = "Delete operation failed"
                    failed_files.append(f"{file_path}: {error_output}")
                else:
                    logger.info(f"Successfully deleted {file_path} on {remote_os}")
                    
            except Exception as e:
                failed_files.append(f"{file_path}: {str(e)}")
                logger.error(f"Error deleting {file_path}: {e}")
        
        if failed_files:
            return jsonify({'success': False, 'error': f'Failed to delete: {"; ".join(failed_files)}'})
        
        return jsonify({'success': True})
    except Exception as e:
        logger.error(f"Delete remote files error: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/keep-alive', methods=['POST'])
def keep_alive():
    """Keep session alive and check connection health with transfer-aware logic"""
    try:
        session_id = session.get('session_id')
        if not session_id:
            return jsonify({'success': False, 'error': 'No active session', 'error_type': 'no_session'}), 401
        
        # Check if connection exists
        conn = scp_manager.get_connection(session_id)
        if not conn:
            return jsonify({'success': False, 'error': 'Connection not found', 'error_type': 'no_connection'}), 401
        
        # Test connection health with transfer-aware logic
        try:
            sftp = conn['sftp']
            ssh = conn['ssh']
            
            # Check if transport is still active
            transport = ssh.get_transport()
            if not transport or not transport.is_active():
                raise Exception("SSH transport is inactive - server may have been restarted")
            
            # If transfer is active, use minimal keep-alive check
            if conn.get('transfer_active', False):
                # During transfers, just check transport status without SFTP operations
                if transport.is_authenticated():
                    logger.debug(f"Keep-alive during transfer successful for session {session_id}")
                else:
                    raise Exception("SSH authentication lost during transfer")
            else:
                # When not transferring, perform lightweight SFTP operation
                sftp.normalize('.')  # Very lightweight operation
                logger.debug(f"Keep-alive successful for session {session_id}")
            
            # Update session activity
            session.permanent = True
            conn['last_activity'] = datetime.now()
            
            return jsonify({
                'success': True, 
                'status': 'Connection alive',
                'timestamp': datetime.now().isoformat(),
                'session_id': session_id,
                'transfer_active': conn.get('transfer_active', False),
                'uptime': str(datetime.now() - conn.get('created_at', datetime.now())).split('.')[0]
            })
            
        except Exception as e:
            logger.warning(f"Keep-alive failed for session {session_id}: {e}")
            
            # During transfers, be more lenient with keep-alive failures
            if conn.get('transfer_active', False):
                # If transfer is active, don't fail keep-alive immediately
                logger.info(f"Keep-alive failed during transfer, but transfer is active - allowing to continue")
                return jsonify({
                    'success': True, 
                    'status': 'Transfer active - keep-alive skipped',
                    'timestamp': datetime.now().isoformat(),
                    'transfer_active': True,
                    'warning': 'Keep-alive check failed but transfer is in progress'
                })
            
            # Determine error type for non-transfer scenarios
            error_msg = str(e).lower()
            if 'connection reset' in error_msg or 'broken pipe' in error_msg:
                error_type = 'server_shutdown'
                user_msg = 'Server appears to have been shut down or restarted. Attempting to reconnect...'
            elif 'timeout' in error_msg:
                error_type = 'timeout'
                user_msg = 'Connection timeout. Server may be overloaded or network issues.'
            elif 'transport is inactive' in error_msg:
                error_type = 'server_restart'
                user_msg = 'Server connection lost. Attempting to reconnect...'
            else:
                error_type = 'connection_error'
                user_msg = f'Connection error: {str(e)}'
            
            # Attempt auto-reconnect for certain error types
            if error_type in ['server_shutdown', 'server_restart']:
                reconnect_result = scp_manager._attempt_auto_reconnect(session_id)
                
                if reconnect_result['success']:
                    return jsonify({
                        'success': True,
                        'status': 'Reconnected automatically',
                        'message': 'Connection was restored automatically after server restart',
                        'reconnected': True,
                        'timestamp': datetime.now().isoformat()
                    })
                else:
                    return jsonify({
                        'success': False,
                        'error': f'{user_msg} Reconnection failed: {reconnect_result["error"]}',
                        'error_type': error_type,
                        'reconnect_failed': True
                    }), 500
            else:
                return jsonify({
                    'success': False,
                    'error': user_msg,
                    'error_type': error_type
                }), 500
            
    except Exception as e:
        logger.error(f"Keep-alive error: {e}")
        return jsonify({
            'success': False, 
            'error': f'Keep-alive system error: {str(e)}',
            'error_type': 'internal_error'
        }), 500

@app.route('/api/keep-alive-ping', methods=['POST'])
def keep_alive_ping():
    """Lightweight keep-alive ping for smart session management"""
    try:
        session_id = session.get('session_id')
        if not session_id:
            return jsonify({
                'success': False, 
                'error': 'No active session',
                'error_type': 'no_session'
            }), 401
        
        data = request.get_json() or {}
        idle_time = data.get('idle_time', 0)
        
        # Check if session exists
        if session_id not in scp_manager.connections:
            return jsonify({
                'success': False,
                'error': 'Session not found',
                'error_type': 'no_connection'
            }), 404
        
        conn = scp_manager.connections[session_id]
        ssh = conn['ssh']
        
        # Very lightweight check - just verify transport is active
        transport = ssh.get_transport()
        if not transport or not transport.is_active():
            return jsonify({
                'success': False,
                'error': 'Transport inactive',
                'error_type': 'no_connection'
            }), 503
        
        # Check if idle for more than 1 hour (3600000 ms)
        if idle_time > 3600000:  # 1 hour in milliseconds
            return jsonify({
                'success': False,
                'error': 'Session idle timeout',
                'error_type': 'idle_timeout'
            }), 408
        
        # Update last activity
        conn['last_activity'] = datetime.now()
        
        # Return success with minimal data
        return jsonify({
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'idle_time': idle_time,
            'lightweight': True
        })
        
    except Exception as e:
        logger.warning(f"Keep-alive ping error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'error_type': 'network_error'
        }), 500

@app.route('/api/connection-status')
def connection_status():
    """Get current connection status and statistics"""
    try:
        session_id = session.get('session_id')
        if not session_id:
            return jsonify({'connected': False, 'error': 'No active session'})
        
        conn = scp_manager.get_connection(session_id)
        if not conn:
            return jsonify({'connected': False, 'error': 'No active connection'})
        
        # Calculate connection uptime
        created_at = conn.get('created_at', datetime.now())
        last_activity = conn.get('last_activity', datetime.now())
        uptime_seconds = (datetime.now() - created_at).total_seconds()
        idle_seconds = (datetime.now() - last_activity).total_seconds()
        
        return jsonify({
            'connected': True,
            'host': conn['host'],
            'username': conn['username'],
            'port': conn['port'],
            'uptime_seconds': uptime_seconds,
            'idle_seconds': idle_seconds,
            'uptime_formatted': str(datetime.now() - created_at).split('.')[0],
            'last_activity': last_activity.isoformat()
        })
        
    except Exception as e:
        logger.error(f"Connection status error: {e}")
        return jsonify({'connected': False, 'error': str(e)})

@app.route('/protection-guide')
def protection_guide():
    """Serve code protection guide"""
    return send_from_directory('.', 'CODE_PROTECTION_GUIDE.html')

@app.route('/docs')
def documentation_index():
    """Serve documentation index page"""
    return send_from_directory('Doc', 'DOCUMENTATION_INDEX.html')

@app.route('/docs/user-guide')
def user_guide():
    """Serve user guide documentation"""
    return send_from_directory('Doc', 'user_guide.html')

@app.route('/docs/technical-report')
def technical_report():
    """Serve technical report documentation"""
    return send_from_directory('Doc', 'TECHNICAL_REPORT.html')

@app.route('/docs/project-report')
def project_report():
    """Serve project report documentation"""
    return send_from_directory('Doc', 'PROJECT_REPORT.html')

@app.route('/development-journey')
def development_journey():
    """Serve visual development journey documentation"""
    return send_from_directory('Doc', 'DEVELOPMENT_JOURNEY_VISUAL.html')

@app.route('/api-docs')
def api_documentation():
    """Serve API documentation"""
    return send_from_directory('.', 'API_DOCUMENTATION.md', mimetype='text/plain')

@app.route('/changelog')
def changelog():
    """Serve changelog"""
    return send_from_directory('.', 'CHANGELOG.md', mimetype='text/plain')

@app.route('/contributing')
def contributing():
    """Serve contributing guidelines"""
    return send_from_directory('.', 'CONTRIBUTING.md', mimetype='text/plain')

@app.route('/deployment')
def deployment_guide():
    """Serve deployment guide"""
    return send_from_directory('.', 'DEPLOYMENT_GUIDE.md', mimetype='text/plain')

@app.route('/docs/windows-wsl')
def windows_wsl_guide():
    """Serve Windows to WSL setup guide"""
    return send_from_directory('Doc', 'WINDOWS_WSL_GUIDE.html')

@app.route('/docs/changelog')
def visual_changelog():
    """Serve visual changelog"""
    return send_from_directory('Doc', 'CHANGELOG_VISUAL.html')

@app.route('/TECHNICAL_ARCHITECTURE.md')
def technical_architecture():
    """Serve technical architecture markdown file"""
    return send_from_directory('.', 'TECHNICAL_ARCHITECTURE.md', mimetype='text/plain')

@app.route('/user_guide.html')
def user_guide_html():
    """Serve user guide HTML file"""
    return send_from_directory('.', 'user_guide.html')

@app.route('/README.md')
def readme():
    """Serve README markdown file"""
    return send_from_directory('.', 'README.md', mimetype='text/plain')

@app.route('/test-root-protection.js')
def test_root_protection_js():
    """Serve root protection test script"""
    return send_from_directory('.', 'test_root_protection.js', mimetype='application/javascript')

@app.route('/test-credentials.js')
def test_credentials_js():
    """Serve credential test script"""
    return send_from_directory('.', 'test_credentials.js', mimetype='application/javascript')

@app.route('/favicon.ico')
def favicon():
    """Serve favicon to prevent 404 errors"""
    # Return a simple 1x1 transparent PNG
    import base64
    from flask import Response
    
    # 1x1 transparent PNG in base64
    transparent_png = base64.b64decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8j6gAAAABJRU5ErkJggg=='
    )
    
    return Response(transparent_png, mimetype='image/png')

@app.route('/ssh-debug')
def ssh_debug():
    """Serve SSH key debug page"""
    return send_from_directory('.', 'debug_ssh_key.html')

@app.route('/ssh-test')
def ssh_test():
    """Serve SSH key test page"""
    return send_from_directory('.', 'ssh_key_test.html')

if __name__ == '__main__':
    import sys
    import socket
    
    def is_port_available(port):
        """Check if a port is available for use"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('localhost', port))
                return True
        except OSError:
            return False
    
    def get_available_port(preferred_port=5000):
        """Get an available port, starting with preferred port"""
        if is_port_available(preferred_port):
            return preferred_port
        
        # Try common alternative ports
        alternative_ports = [5001, 5002, 5003, 8000, 8080, 8888, 9000]
        for port in alternative_ports:
            if is_port_available(port):
                return port
        
        # Find any available port in range 5000-9999
        for port in range(5000, 10000):
            if is_port_available(port):
                return port
        
        return None
    
    def interactive_port_selection():
        """Interactive port selection for exe/standalone mode"""
        preferred_ports = [5000, 5001, 5002, 8000, 8080, 8888, 9000]
        available_ports = []
        
        print("\n" + "="*70)
        print("🌐 PORT SELECTION")
        print("="*70)
        print("🔍 Checking available ports...")
        
        for port in preferred_ports:
            if is_port_available(port):
                available_ports.append(port)
                print(f"   ✅ Port {port} - Available")
            else:
                print(f"   ❌ Port {port} - In use")
        
        if not available_ports:
            print("\n⚠️  All preferred ports are busy!")
            print("🔍 Finding any available port...")
            for port in range(5000, 10000):
                if is_port_available(port):
                    available_ports.append(port)
                    break
            
            if not available_ports:
                print("❌ No available ports found!")
                return None
            
            print(f"✅ Found available port: {available_ports[0]}")
        
        print(f"\n📋 Available ports: {', '.join(map(str, available_ports))}")
        print("\nChoose an option:")
        print("1. 🚀 Auto-select first available port (Recommended)")
        print("2. 📋 Choose from available ports")
        print("3. ⚙️  Enter custom port")
        print("4. ❌ Exit")
        
        while True:
            try:
                choice = input(f"\n👉 Enter your choice (1-4): ").strip()
                
                if choice == '1' or choice == '':
                    selected_port = available_ports[0]
                    print(f"✅ Auto-selected port: {selected_port}")
                    return selected_port
                
                elif choice == '2':
                    print(f"\n📋 Available ports:")
                    for i, port in enumerate(available_ports, 1):
                        print(f"   {i}. Port {port}")
                    
                    while True:
                        try:
                            port_choice = input(f"\n👉 Select port (1-{len(available_ports)}): ").strip()
                            port_index = int(port_choice) - 1
                            
                            if 0 <= port_index < len(available_ports):
                                selected_port = available_ports[port_index]
                                print(f"✅ Selected port: {selected_port}")
                                return selected_port
                            else:
                                print(f"❌ Invalid selection. Please enter 1-{len(available_ports)}")
                        except ValueError:
                            print("❌ Invalid input. Please enter a number.")
                        except KeyboardInterrupt:
                            print("\n🛑 Cancelled")
                            return None
                
                elif choice == '3':
                    while True:
                        try:
                            custom_port = input("👉 Enter custom port (1024-65535): ").strip()
                            custom_port = int(custom_port)
                            
                            if 1024 <= custom_port <= 65535:
                                if is_port_available(custom_port):
                                    print(f"✅ Custom port {custom_port} is available")
                                    return custom_port
                                else:
                                    print(f"❌ Port {custom_port} is already in use")
                                    retry = input("🔄 Try another port? (y/n): ").strip().lower()
                                    if retry != 'y':
                                        break
                            else:
                                print("❌ Port must be between 1024 and 65535")
                        except ValueError:
                            print("❌ Invalid input. Please enter a number.")
                        except KeyboardInterrupt:
                            print("\n🛑 Cancelled")
                            return None
                
                elif choice == '4':
                    print("👋 Goodbye!")
                    return None
                
                else:
                    print("❌ Invalid choice. Please enter 1, 2, 3, or 4.")
            
            except KeyboardInterrupt:
                print("\n\n🛑 Cancelled by user")
                return None
    
    # Default port
    default_port = 5000
    selected_port = default_port
    
    # Check if port is provided as command line argument
    if len(sys.argv) > 1:
        try:
            selected_port = int(sys.argv[1])
            if selected_port < 1024 or selected_port > 65535:
                print(f"❌ Error: Port {selected_port} is out of valid range (1024-65535)")
                sys.exit(1)
        except ValueError:
            print(f"❌ Error: Invalid port number '{sys.argv[1]}'. Please provide a valid integer.")
            sys.exit(1)
    else:
        # No port specified - use interactive selection
        print("🚀 SCP Web Transfer - Enhanced Version")
        print("="*50)
        
        # Check if we're running as exe (no console input available)
        try:
            # Test if we can get input (fails in some exe environments)
            import sys
            if hasattr(sys.stdin, 'isatty') and sys.stdin.isatty():
                # Interactive mode available
                selected_port = interactive_port_selection()
                if selected_port is None:
                    print("🛑 No port selected. Exiting...")
                    sys.exit(0)
            else:
                # Non-interactive mode (exe) - auto-select
                print("🔍 Auto-selecting available port...")
                selected_port = get_available_port(default_port)
                if selected_port is None:
                    print("❌ No available ports found")
                    sys.exit(1)
                print(f"✅ Auto-selected port: {selected_port}")
        except:
            # Fallback to auto-selection
            print("🔍 Auto-selecting available port...")
            selected_port = get_available_port(default_port)
            if selected_port is None:
                print("❌ No available ports found")
                sys.exit(1)
            print(f"✅ Auto-selected port: {selected_port}")
    
    # Validate selected port is available
    if not is_port_available(selected_port):
        if len(sys.argv) <= 1:  # Only auto-fix if no port was specified
            print(f"⚠️  Port {selected_port} became unavailable")
            alternative_port = get_available_port(selected_port + 1)
            if alternative_port:
                print(f"🔄 Using alternative port: {alternative_port}")
                selected_port = alternative_port
            else:
                print("❌ No available ports found")
                sys.exit(1)
        else:
            print(f"❌ Error: Port {selected_port} is already in use")
            print("💡 Try a different port or check what's using this port:")
            print(f"   lsof -i :{selected_port}")
            sys.exit(1)
    
    # Get network IP for display
    try:
        import subprocess
        if sys.platform == "darwin":  # macOS
            result = subprocess.run(['ifconfig'], capture_output=True, text=True)
            lines = result.stdout.split('\n')
            network_ip = None
            for line in lines:
                if 'inet ' in line and '127.0.0.1' not in line and 'inet 169.254' not in line:
                    network_ip = line.split()[1]
                    break
            if not network_ip:
                network_ip = "your-ip"
        else:
            result = subprocess.run(['hostname', '-I'], capture_output=True, text=True)
            network_ip = result.stdout.strip().split()[0] if result.stdout.strip() else "your-ip"
    except:
        network_ip = "your-ip"
    
    # Display startup information
    print("\n" + "="*70)
    print("🚀 SCP Web Transfer - Enhanced Version Starting")
    print("="*70)
    print(f"🌐 Server starting on port: {selected_port}")
    print(f"📍 Access URLs:")
    print(f"   • Local:   http://localhost:{selected_port}")
    print(f"   • Network: http://{network_ip}:{selected_port}")
    print("="*70)
    
    if selected_port != default_port:
        print(f"ℹ️  Note: Using port {selected_port} instead of default {default_port}")
        if default_port == 5000:
            print("   (Port 5000 is commonly used by AirDrop on macOS)")
        print("="*70)
    
    print("\n🔥 Enhanced Features Active:")
    print("   ✅ Cross-platform compatibility (macOS, Linux, Windows)")
    print("   ✅ Large file transfer optimization")
    print("   ✅ Intelligent session keep-alive")
    print("   ✅ Auto-reconnection capabilities")
    print("   ✅ Real-time transfer progress")
    print("\n💡 Press Ctrl+C to stop the server")
    print("="*70 + "\n")
    
    try:
        # Start the Flask application
        app.run(
            host='0.0.0.0',
            port=selected_port,
            debug=False,
            threaded=True,
            use_reloader=False
        )
    except KeyboardInterrupt:
        print("\n\n🛑 Server stopped by user")
        print("👋 Thank you for using SCP Web Transfer!")
    except Exception as e:
        print(f"\n❌ Server error: {e}")
        print("💡 Try using a different port with: python3 app_enhanced.py <port_number>")
        sys.exit(1)
