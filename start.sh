#!/bin/bash

# MacOS to Linux Servers SCP - Startup Script
# This script starts the application with smart port selection

echo "🚀 Starting MacOS to Linux Servers SCP"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3.6 or higher."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.6"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    print_error "Python $PYTHON_VERSION found, but Python $REQUIRED_VERSION or higher is required."
    exit 1
fi

print_success "Python $PYTHON_VERSION found"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_status "Creating virtual environment..."
    python3 -m venv venv
    if [ $? -eq 0 ]; then
        print_success "Virtual environment created"
    else
        print_error "Failed to create virtual environment"
        exit 1
    fi
fi

# Activate virtual environment
print_status "Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
print_status "Installing dependencies..."
pip3 install -r requirements.txt

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 1  # Port is in use
    else
        return 0  # Port is available
    fi
}

# Port selection logic
SELECTED_PORT=""

# Check if user provided a port as command line argument
if [ $# -eq 1 ]; then
    USER_PORT=$1
    if [[ "$USER_PORT" =~ ^[0-9]+$ ]] && [ "$USER_PORT" -ge 1024 ] && [ "$USER_PORT" -le 65535 ]; then
        if check_port $USER_PORT; then
            SELECTED_PORT=$USER_PORT
            print_success "Using user-specified port $USER_PORT"
        else
            print_warning "Port $USER_PORT is already in use"
            echo ""
        fi
    else
        print_error "Invalid port number. Please use a port between 1024-65535."
        echo "Usage: $0 [port]"
        echo "Example: $0 5001"
        exit 1
    fi
fi

# If no user port or user port is busy, offer manual selection or auto-selection
if [ -z "$SELECTED_PORT" ]; then
    echo ""
    echo "🔧 Port Selection Options:"
    echo "1. Let me choose a port manually"
    echo "2. Auto-select from available ports (5000, 5001, 5002, 8000, 8080, 8888, 9000)"
    echo ""
    read -p "Choose option (1 or 2): " choice
    
    case $choice in
        1)
            echo ""
            while [ -z "$SELECTED_PORT" ]; do
                read -p "Enter port number (1024-65535): " manual_port
                if [[ "$manual_port" =~ ^[0-9]+$ ]] && [ "$manual_port" -ge 1024 ] && [ "$manual_port" -le 65535 ]; then
                    if check_port $manual_port; then
                        SELECTED_PORT=$manual_port
                        print_success "Port $manual_port is available and selected"
                    else
                        print_warning "Port $manual_port is already in use. Please try another port."
                    fi
                else
                    print_error "Invalid port number. Please enter a number between 1024-65535."
                fi
            done
            ;;
        2)
            # Auto-select from predefined ports
            PORTS=(5000 5001 5002 8000 8080 8888 9000)
            print_status "Checking for available ports..."
            
            for port in "${PORTS[@]}"; do
                if check_port $port; then
                    SELECTED_PORT=$port
                    print_success "Auto-selected port $port"
                    break
                else
                    print_warning "Port $port is in use"
                fi
            done
            
            if [ -z "$SELECTED_PORT" ]; then
                print_error "No available ports found from the default list: ${PORTS[*]}"
                echo ""
                read -p "Enter a custom port number (1024-65535): " custom_port
                if [[ "$custom_port" =~ ^[0-9]+$ ]] && [ "$custom_port" -ge 1024 ] && [ "$custom_port" -le 65535 ]; then
                    if check_port $custom_port; then
                        SELECTED_PORT=$custom_port
                        print_success "Custom port $custom_port selected"
                    else
                        print_error "Port $custom_port is also in use. Please restart and try a different port."
                        exit 1
                    fi
                else
                    print_error "Invalid port number."
                    exit 1
                fi
            fi
            ;;
        *)
            print_error "Invalid choice. Please run the script again and choose 1 or 2."
            exit 1
            ;;
    esac
fi

# Start the application
echo ""
print_status "Starting MacOS to Linux Servers SCP on port $SELECTED_PORT..."
echo ""
echo "🔥 Enhanced Features Active:"
echo "   ✅ Cross-platform compatibility (macOS, Linux, Windows)"
echo "   ✅ Large file transfer optimization"
echo "   ✅ Intelligent session keep-alive (15s pings, 1hr timeout)"
echo "   ✅ Auto-reconnection capabilities"
echo "   ✅ Real-time transfer progress"
echo "   ✅ Smart port selection"
echo "   ✅ Transfer-aware session management"
echo ""
echo "🌐 Access the application at:"
echo "   • Local:   http://localhost:$SELECTED_PORT"
echo "   • Network: http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I | awk '{print $1}' 2>/dev/null || echo 'your-ip'):$SELECTED_PORT"
echo ""
echo "💡 Usage Examples:"
echo "   • Start with specific port: ./start.sh 5001"
echo "   • Start with auto-selection: ./start.sh"
echo ""
echo "💡 Press Ctrl+C to stop the server"
echo "======================================"
echo ""

# Start the application
python3 app_enhanced.py $SELECTED_PORT
