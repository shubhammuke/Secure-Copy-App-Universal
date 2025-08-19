# 🚀 Deployment Guide - MacOS to Linux SCP

## 📋 Overview

This comprehensive deployment guide covers everything you need to know about deploying, configuring, and maintaining the MacOS to Linux SCP application in various environments.

---

## 🎯 Deployment Options

### 1. **Development Deployment**
For local development and testing.

```bash
# Clone repository
git clone https://github.com/yourusername/macos-to-linux-servers-scp.git
cd macos-to-linux-servers-scp

# Quick start
./start.sh

# Manual start
pip3 install -r requirements.txt
python3 app_enhanced.py
```

### 2. **Production Deployment**
For production environments with proper security and monitoring.

```bash
# Production setup with virtual environment
python3 -m venv venv
source venv/bin/activate
pip3 install -r requirements.txt

# Set production environment
export FLASK_ENV=production
export SCP_DEBUG=false

# Start with specific port
python3 app_enhanced.py 5000
```

### 3. **Docker Deployment**
Containerized deployment for scalability and isolation.

```dockerfile
# Dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

CMD ["python3", "app_enhanced.py", "5000"]
```

```bash
# Build and run
docker build -t macos-linux-scp .
docker run -p 5000:5000 macos-linux-scp
```

---

## 🔧 Configuration Management

### **Environment Variables**

```bash
# Core Configuration
export FLASK_ENV=production
export SCP_PORT=5000
export SCP_DEBUG=false
export SCP_HOST=0.0.0.0

# Security Configuration
export SECRET_KEY=your-secret-key-here
export ENCRYPTION_KEY_PATH=/path/to/encryption.key

# Performance Configuration
export MAX_FILE_SIZE=10737418240  # 10GB
export KEEP_ALIVE_INTERVAL=15
export IDLE_TIMEOUT=3600

# Logging Configuration
export LOG_LEVEL=INFO
export LOG_FILE=/var/log/scp-app.log
```

### **Configuration File**

Create `config.py`:
```python
import os

class Config:
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key'
    DEBUG = os.environ.get('SCP_DEBUG', 'false').lower() == 'true'
    
    # Application Configuration
    PORT = int(os.environ.get('SCP_PORT', 5000))
    HOST = os.environ.get('SCP_HOST', '127.0.0.1')
    
    # Transfer Configuration
    MAX_FILE_SIZE = int(os.environ.get('MAX_FILE_SIZE', 10737418240))
    KEEP_ALIVE_INTERVAL = int(os.environ.get('KEEP_ALIVE_INTERVAL', 15))
    IDLE_TIMEOUT = int(os.environ.get('IDLE_TIMEOUT', 3600))
    
    # Security Configuration
    ENCRYPTION_KEY_PATH = os.environ.get('ENCRYPTION_KEY_PATH', 'encryption.key')
    
    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE', 'app.log')

class ProductionConfig(Config):
    DEBUG = False
    HOST = '0.0.0.0'

class DevelopmentConfig(Config):
    DEBUG = True
    HOST = '127.0.0.1'
```

---

## 🌐 Network Configuration

### **Firewall Rules**

#### **Ubuntu/Debian**
```bash
# Allow application ports
sudo ufw allow 5000:5002/tcp
sudo ufw allow 8000/tcp
sudo ufw allow 8080/tcp
sudo ufw allow 8888/tcp
sudo ufw allow 9000/tcp

# Allow SSH (for SCP connections)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

#### **CentOS/RHEL**
```bash
# Allow application ports
sudo firewall-cmd --permanent --add-port=5000-5002/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --permanent --add-port=8888/tcp
sudo firewall-cmd --permanent --add-port=9000/tcp

# Reload firewall
sudo firewall-cmd --reload
```

### **Reverse Proxy Setup**

#### **Nginx Configuration**
```nginx
# /etc/nginx/sites-available/scp-app
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeout settings for large file transfers
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        client_max_body_size 10G;
    }
}
```

#### **Apache Configuration**
```apache
# /etc/apache2/sites-available/scp-app.conf
<VirtualHost *:80>
    ServerName your-domain.com
    
    ProxyPreserveHost On
    ProxyRequests Off
    ProxyPass / http://127.0.0.1:5000/
    ProxyPassReverse / http://127.0.0.1:5000/
    
    # Large file support
    LimitRequestBody 10737418240
</VirtualHost>
```

---

## 🔒 Security Hardening

### **SSL/TLS Configuration**

#### **Let's Encrypt with Nginx**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### **SSL Nginx Configuration**
```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    location / {
        proxy_pass http://127.0.0.1:5000;
        # ... other proxy settings
    }
}
```

### **Application Security**

#### **Secure Credential Storage**
```python
# Generate secure encryption key
from cryptography.fernet import Fernet
key = Fernet.generate_key()

# Store securely (not in code)
with open('/etc/scp-app/encryption.key', 'wb') as f:
    f.write(key)

# Set proper permissions
os.chmod('/etc/scp-app/encryption.key', 0o600)
```

#### **Session Security**
```python
# In app configuration
app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS only
app.config['SESSION_COOKIE_HTTPONLY'] = True  # No JavaScript access
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # CSRF protection
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=1)
```

---

## 📊 Monitoring and Logging

### **Application Logging**

#### **Logging Configuration**
```python
import logging
from logging.handlers import RotatingFileHandler

# Configure logging
if not app.debug:
    file_handler = RotatingFileHandler(
        'logs/scp-app.log', 
        maxBytes=10240000, 
        backupCount=10
    )
    file_handler.setFormatter(logging.Formatter(
        '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
    ))
    file_handler.setLevel(logging.INFO)
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
```

#### **Log Rotation Setup**
```bash
# /etc/logrotate.d/scp-app
/var/log/scp-app/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload scp-app
    endscript
}
```

### **System Monitoring**

#### **Health Check Endpoint**
```python
@app.route('/health')
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '2.0.0',
        'uptime': time.time() - start_time
    })
```

#### **Monitoring Script**
```bash
#!/bin/bash
# monitor.sh

URL="http://localhost:5000/health"
TIMEOUT=10

response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "$URL")
http_code="${response: -3}"

if [ "$http_code" -eq 200 ]; then
    echo "$(date): Service is healthy"
else
    echo "$(date): Service is unhealthy (HTTP $http_code)"
    # Restart service or send alert
fi
```

---

## 🔄 Process Management

### **Systemd Service**

Create `/etc/systemd/system/scp-app.service`:
```ini
[Unit]
Description=MacOS to Linux SCP Application
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/scp-app
Environment=PATH=/opt/scp-app/venv/bin
Environment=FLASK_ENV=production
ExecStart=/opt/scp-app/venv/bin/python app_enhanced.py 5000
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/scp-app

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable scp-app
sudo systemctl start scp-app

# Check status
sudo systemctl status scp-app
```

### **Supervisor Configuration**

Create `/etc/supervisor/conf.d/scp-app.conf`:
```ini
[program:scp-app]
command=/opt/scp-app/venv/bin/python app_enhanced.py 5000
directory=/opt/scp-app
user=www-data
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/scp-app/supervisor.log
environment=FLASK_ENV=production
```

---

## 📈 Performance Optimization

### **Application Tuning**

#### **Gunicorn Configuration**
```python
# gunicorn_config.py
bind = "127.0.0.1:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 300
keepalive = 2
preload_app = True
```

```bash
# Start with Gunicorn
gunicorn -c gunicorn_config.py app_enhanced:app
```

#### **Memory Optimization**
```python
# In app configuration
import gc

# Garbage collection tuning
gc.set_threshold(700, 10, 10)

# Memory monitoring
def monitor_memory():
    import psutil
    process = psutil.Process()
    memory_mb = process.memory_info().rss / 1024 / 1024
    app.logger.info(f"Memory usage: {memory_mb:.2f} MB")
```

### **Database Optimization**

If using a database for session storage:
```python
# Redis session storage
from flask_session import Session
import redis

app.config['SESSION_TYPE'] = 'redis'
app.config['SESSION_REDIS'] = redis.from_url('redis://localhost:6379')
Session(app)
```

---

## 🐛 Troubleshooting

### **Common Issues**

#### **Port Already in Use**
```bash
# Find process using port
sudo lsof -i :5000

# Kill process
sudo kill -9 <PID>

# Or use different port
python3 app_enhanced.py 5001
```

#### **Permission Denied**
```bash
# Fix file permissions
chmod 644 *.py
chmod 755 start.sh

# Fix SSH key permissions
chmod 600 ~/.ssh/id_rsa
```

#### **SSL Certificate Issues**
```bash
# Check certificate validity
openssl x509 -in certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect your-domain.com:443
```

### **Performance Issues**

#### **High Memory Usage**
```bash
# Monitor memory
top -p $(pgrep -f app_enhanced.py)

# Check for memory leaks
python3 -m memory_profiler app_enhanced.py
```

#### **Slow File Transfers**
```bash
# Test network speed
iperf3 -c target-server

# Check SSH connection
ssh -v username@server

# Monitor transfer progress
tail -f /var/log/scp-app/app.log
```

### **Debug Mode**

Enable debug logging:
```python
# In app_enhanced.py
import logging
logging.basicConfig(level=logging.DEBUG)

# Or via environment
export SCP_DEBUG=true
```

---

## 🔄 Backup and Recovery

### **Application Backup**
```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backup/scp-app"
APP_DIR="/opt/scp-app"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup application files
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" -C "$APP_DIR" .

# Backup credentials (encrypted)
cp "$APP_DIR/saved_credentials.enc" "$BACKUP_DIR/credentials_$DATE.enc"
cp "$APP_DIR/encryption.key" "$BACKUP_DIR/encryption_key_$DATE"

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
```

### **Recovery Procedure**
```bash
#!/bin/bash
# restore.sh

BACKUP_FILE="$1"
APP_DIR="/opt/scp-app"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.tar.gz>"
    exit 1
fi

# Stop service
sudo systemctl stop scp-app

# Backup current installation
mv "$APP_DIR" "${APP_DIR}.backup.$(date +%Y%m%d_%H%M%S)"

# Restore from backup
mkdir -p "$APP_DIR"
tar -xzf "$BACKUP_FILE" -C "$APP_DIR"

# Set permissions
chown -R www-data:www-data "$APP_DIR"
chmod 600 "$APP_DIR/encryption.key"

# Start service
sudo systemctl start scp-app
```

---

## 📋 Maintenance Tasks

### **Regular Maintenance**

#### **Daily Tasks**
```bash
# Check service status
systemctl status scp-app

# Monitor logs
tail -n 100 /var/log/scp-app/app.log

# Check disk space
df -h
```

#### **Weekly Tasks**
```bash
# Update dependencies
pip3 list --outdated
pip3 install -U package-name

# Rotate logs
logrotate -f /etc/logrotate.d/scp-app

# Check SSL certificate expiry
openssl x509 -in /etc/letsencrypt/live/domain/cert.pem -noout -dates
```

#### **Monthly Tasks**
```bash
# Full backup
./backup.sh

# Security updates
sudo apt update && sudo apt upgrade

# Performance review
analyze_logs.py /var/log/scp-app/app.log
```

### **Update Procedure**
```bash
#!/bin/bash
# update.sh

# Backup current version
./backup.sh

# Pull latest changes
git pull origin main

# Update dependencies
pip3 install -r requirements.txt

# Run tests
python3 -m pytest tests/

# Restart service
sudo systemctl restart scp-app

# Verify deployment
curl -f http://localhost:5000/health
```

---

## 📞 Support and Resources

### **Documentation Links**
- **[Project Documentation](PROJECT_DOCUMENTATION.html)**: Complete feature overview
- **[API Documentation](API_DOCUMENTATION.md)**: API endpoint reference
- **[Git Documentation](GIT_DOCUMENTATION.md)**: Development workflow
- **[Changelog](CHANGELOG.md)**: Version history

### **Monitoring Tools**
- **Application Logs**: `/var/log/scp-app/`
- **System Logs**: `journalctl -u scp-app`
- **Health Check**: `http://localhost:5000/health`
- **Process Monitor**: `systemctl status scp-app`

### **Emergency Contacts**
- **Repository**: https://github.com/yourusername/macos-to-linux-servers-scp
- **Issues**: GitHub Issues for bug reports
- **Documentation**: Check comprehensive guides first

---

*This deployment guide is part of the MacOS to Linux SCP project. Keep it updated as deployment procedures evolve.*
