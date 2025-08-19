// Enhanced SCP Web App - Version 2 with Drag & Drop
// This file contains enhanced methods with drag and drop functionality

// Enhanced SCP Web App Class with Drag & Drop
class EnhancedSCPWebAppV2 {
    constructor() {
        this.currentLocalPath = '/home'; // Will be updated after OS detection
        this.currentRemotePath = '/home';
        this.selectedLocalFiles = new Set();
        this.selectedRemoteFiles = new Set();
        this.localHistory = ['/home']; // Will be updated after OS detection
        this.remoteHistory = ['/'];
        this.localHistoryIndex = 0;
        this.remoteHistoryIndex = 0;
        this.keyFileData = null;
        this.currentView = { local: 'grid', remote: 'grid' };
        
        // Initialize file arrays
        this.localFiles = [];
        this.remoteFiles = [];
        this.osInfo = null;
        this.lastClickedFile = { local: null, remote: null };
        this.transferInProgress = false;
        this.draggedFiles = [];
        this.dragPreview = null;
        this.keepAliveInterval = null; // Keep-alive mechanism
        this.lastFileCount = 0;
        this.lastDirCount = 0;
        this.osInfo = null; // Will store OS information
        
        this.initializeOSDetection(); // Initialize OS detection first
        this.initializeEventListeners();
        this.loadSavedCredentials();
        this.setupDragAndDrop();
        this.setupFilePanelDragDrop();
        this.setupActivityTracking(); // Track user activity for keep-alive
        this.startKeepAlive(); // Start keep-alive after initialization
    }

    async initializeOSDetection() {
        try {
            const response = await fetch('/api/os-info');
            const data = await response.json();
            
            if (data.success) {
                this.osInfo = data.os_info;
                
                // Update paths based on OS
                this.currentLocalPath = this.osInfo.default_path;
                this.localHistory = [this.osInfo.default_path];
                
                console.log('🖥️ OS Detection:', this.osInfo.system, this.osInfo.is_wsl ? '(WSL)' : '');
                console.log('📁 Default path:', this.osInfo.default_path);
                console.log('🏠 Home path:', this.osInfo.home_path);
                console.log('🔘 Navigation buttons:', this.osInfo.navigation_buttons.length);
                
                // Update OS detection display
                this.updateOSDetectionDisplay('local', this.osInfo);
                
                // Update navigation buttons
                this.updateNavigationButtons();
            } else {
                console.warn('Failed to get OS info, using defaults');
                this.osInfo = {
                    system: 'unknown',
                    is_wsl: false,
                    default_path: '/home',
                    home_path: '/home',
                    navigation_buttons: []
                };
                this.updateOSDetectionDisplay('local', this.osInfo);
            }
        } catch (error) {
            console.error('Error detecting OS:', error);
            // Fallback to safe defaults
            this.osInfo = {
                system: 'unknown',
                is_wsl: false,
                default_path: '/home',
                home_path: '/home',
                navigation_buttons: []
            };
            this.updateOSDetectionDisplay('local', this.osInfo);
        }
    }

    updateOSDetectionDisplay(type, osInfo) {
        const detectionElement = document.getElementById(`${type}OSDetection`);
        if (!detectionElement) return;

        const iconElement = detectionElement.querySelector('.os-icon');
        const nameElement = detectionElement.querySelector('.os-name');

        if (type === 'local') {
            // Local OS detection
            const osIcons = {
                'windows': '🪟',
                'darwin': '🍎',
                'linux': '🐧',
                'freebsd': '👹',
                'unknown': '❓'
            };

            const osNames = {
                'windows': 'Windows',
                'darwin': 'macOS',
                'linux': osInfo.is_wsl ? 'WSL' : 'Linux',
                'freebsd': 'FreeBSD',
                'unknown': 'Unknown'
            };

            iconElement.textContent = osIcons[osInfo.system] || '❓';
            nameElement.textContent = osNames[osInfo.system] || 'Unknown';
        } else {
            // Remote OS detection (will be updated when connected)
            iconElement.textContent = '❓';
            nameElement.textContent = 'Not Connected';
        }
    }

    updateRemoteOSDetection(remoteOS) {
        const osIcons = {
            'ubuntu': '🐧',
            'debian': '🌀',
            'centos': '🔴',
            'redhat': '🎩',
            'fedora': '🎩',
            'suse': '🦎',
            'alpine': '🏔️',
            'amazon': '📦',
            'linux': '🐧',
            'windows': '🪟',
            'macos': '🍎',
            'freebsd': '👹',
            'server': '🖥️',
            'unknown': '❓'
        };

        const osNames = {
            'ubuntu': 'Ubuntu Server',
            'debian': 'Debian Server',
            'centos': 'CentOS Server',
            'redhat': 'Red Hat Server',
            'fedora': 'Fedora Server',
            'suse': 'SUSE Server',
            'alpine': 'Alpine Server',
            'amazon': 'Amazon Linux',
            'linux': 'Linux Server',
            'windows': 'Windows Server',
            'macos': 'macOS Server',
            'freebsd': 'FreeBSD Server',
            'server': 'Remote Server',
            'unknown': 'Unknown Server'
        };

        const detectionElement = document.getElementById('remoteOSDetection');
        if (detectionElement) {
            const iconElement = detectionElement.querySelector('.os-icon');
            const nameElement = detectionElement.querySelector('.os-name');
            
            iconElement.textContent = osIcons[remoteOS] || '🖥️';
            nameElement.textContent = osNames[remoteOS] || 'Remote Server';
        }
    }

    updateNavigationButtons() {
        const localNavButtons = document.querySelector('.local-nav-buttons');
        if (!localNavButtons) {
            return;
        }

        // Add primary navigation buttons (if any)
        if (this.osInfo.navigation_buttons && this.osInfo.navigation_buttons.length > 0) {
            this.osInfo.navigation_buttons.forEach(buttonInfo => {
                const button = document.createElement('button');
                button.className = 'nav-btn';
                button.innerHTML = `${buttonInfo.icon} ${buttonInfo.name}`;
                button.title = buttonInfo.title || `Navigate to ${buttonInfo.path}`;
                button.addEventListener('click', () => {
                    console.log(`🔘 ${buttonInfo.name} button clicked - navigating to ${buttonInfo.path}`);
                    this.navigateLocal(buttonInfo.path);
                });
                
                // Insert before breadcrumb container
                const breadcrumbContainer = localNavButtons.querySelector('.breadcrumb-container');
                localNavButtons.insertBefore(button, breadcrumbContainer);
            });
        }

        // Initialize address bars
        this.updateBreadcrumb('local', this.currentLocalPath);
        this.updateBreadcrumb('remote', this.currentRemotePath);
    }

    setupBreadcrumbDropdown(type) {
        const dropdownId = `${type}BreadcrumbDropdown`;
        const menuId = `${type}BreadcrumbMenu`;
        
        const dropdown = document.getElementById(dropdownId);
        const dropdownBtn = dropdown?.querySelector('.breadcrumb-dropdown-btn');
        const dropdownMenu = document.getElementById(menuId);
        
        if (!dropdown || !dropdownBtn || !dropdownMenu) {
            return;
        }

        // Setup dropdown toggle
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Update dropdown content
            this.updateBreadcrumbDropdownContent(type);
            
            // Toggle dropdown
            dropdown.classList.toggle('active');
            
            // Close other dropdowns
            document.querySelectorAll('.nav-dropdown.active, .breadcrumb-dropdown.active').forEach(d => {
                if (d !== dropdown) d.classList.remove('active');
            });
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('active');
            }
        });
    }

    updateBreadcrumbDropdownContent(type) {
        const menuId = `${type}BreadcrumbMenu`;
        const dropdownMenu = document.getElementById(menuId);
        
        if (!dropdownMenu) return;

        // Clear existing content
        dropdownMenu.innerHTML = '';

        const currentPath = type === 'local' ? this.currentLocalPath : this.currentRemotePath;
        const parentPaths = this.generateParentPaths(currentPath, type);

        parentPaths.forEach(pathInfo => {
            const item = document.createElement('div');
            item.className = 'breadcrumb-dropdown-item';
            
            // Add appropriate icon
            let pathIcon = '📁';
            if (pathInfo.name.includes('Drive') || pathInfo.path.match(/^[A-Z]:\\/)) {
                pathIcon = '💾';
            } else if (pathInfo.name.includes('Users') || pathInfo.name.includes('Home')) {
                pathIcon = '👥';
            } else if (pathInfo.name.includes('Root')) {
                pathIcon = '🏠';
            } else if (pathInfo.name.includes('Program')) {
                pathIcon = '⚙️';
            } else if (pathInfo.name.includes('Windows')) {
                pathIcon = '🪟';
            }
            
            item.innerHTML = `<span>${pathIcon}</span><span>${pathInfo.name}</span>`;
            item.title = pathInfo.path;
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`📁 Parent directory selected: ${pathInfo.path}`);
                if (type === 'local') {
                    this.navigateLocal(pathInfo.path);
                } else {
                    this.navigateRemote(pathInfo.path);
                }
                document.getElementById(`${type}BreadcrumbDropdown`).classList.remove('active');
            });
            
            dropdownMenu.appendChild(item);
        });
    }

    setupWindowsDriveDropdown() {
        const driveDropdown = document.getElementById('windowsDriveDropdown');
        const driveDropdownBtn = driveDropdown?.querySelector('.nav-dropdown-btn');
        const driveDropdownMenu = document.getElementById('windowsDriveMenu');
        
        if (!driveDropdown || !driveDropdownBtn || !driveDropdownMenu) {
            return;
        }

        // Show/hide based on OS (Windows or WSL)
        if (this.osInfo.system === 'windows' || (this.osInfo.system === 'linux' && this.osInfo.is_wsl)) {
            driveDropdown.style.display = 'inline-block';
            
            // Clear existing items
            driveDropdownMenu.innerHTML = '';
            
            // Add available drives
            if (this.osInfo.available_drives && this.osInfo.available_drives.length > 0) {
                this.osInfo.available_drives.forEach(drive => {
                    const item = document.createElement('div');
                    item.className = 'nav-dropdown-item';
                    item.innerHTML = `${drive.icon} ${drive.name}`;
                    item.title = `Navigate to ${drive.path}`;
                    item.addEventListener('click', () => {
                        console.log(`💾 Drive ${drive.name} selected - navigating to ${drive.path}`);
                        this.navigateLocal(drive.path);
                        this.closeDropdown(driveDropdown);
                    });
                    driveDropdownMenu.appendChild(item);
                });
            } else {
                // Fallback drives based on OS
                let fallbackDrives = [];
                
                if (this.osInfo.system === 'windows') {
                    fallbackDrives = [
                        { name: 'C: Drive', path: 'C:\\', icon: '💾' },
                        { name: 'D: Drive', path: 'D:\\', icon: '💾' },
                        { name: 'E: Drive', path: 'E:\\', icon: '💾' }
                    ];
                } else if (this.osInfo.is_wsl) {
                    fallbackDrives = [
                        { name: 'C: Drive (WSL)', path: '/mnt/c', icon: '💾' },
                        { name: 'D: Drive (WSL)', path: '/mnt/d', icon: '💾' },
                        { name: 'E: Drive (WSL)', path: '/mnt/e', icon: '💾' }
                    ];
                }
                
                fallbackDrives.forEach(drive => {
                    const item = document.createElement('div');
                    item.className = 'nav-dropdown-item';
                    item.innerHTML = `${drive.icon} ${drive.name}`;
                    item.title = `Navigate to ${drive.path}`;
                    item.addEventListener('click', () => {
                        console.log(`💾 Drive ${drive.name} selected - navigating to ${drive.path}`);
                        this.navigateLocal(drive.path);
                        this.closeDropdown(driveDropdown);
                    });
                    driveDropdownMenu.appendChild(item);
                });
            }
            
            // Setup dropdown toggle
            driveDropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleDropdown(driveDropdown);
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!driveDropdown.contains(e.target)) {
                    this.closeDropdown(driveDropdown);
                }
            });
            
        } else {
            driveDropdown.style.display = 'none';
        }
    }

    setupQuickAccessDropdown() {
        const dropdown = document.getElementById('quickAccessDropdown');
        const dropdownBtn = dropdown?.querySelector('.nav-dropdown-btn');
        const dropdownMenu = document.getElementById('quickAccessMenu');
        
        if (!dropdown || !dropdownBtn || !dropdownMenu) {
            return;
        }

        // Clear existing items
        dropdownMenu.innerHTML = '';

        // Add quick access items
        if (this.osInfo.quick_access_buttons && this.osInfo.quick_access_buttons.length > 0) {
            this.osInfo.quick_access_buttons.forEach(buttonInfo => {
                const item = document.createElement('div');
                item.className = 'nav-dropdown-item';
                item.innerHTML = `
                    <span class="icon">${buttonInfo.icon}</span>
                    <span class="name">${buttonInfo.name}</span>
                    <span class="path">${this.getShortPath(buttonInfo.path)}</span>
                `;
                item.title = `Navigate to ${buttonInfo.path}`;
                item.addEventListener('click', () => {
                    console.log(`⚡ Quick access: ${buttonInfo.name} - navigating to ${buttonInfo.path}`);
                    this.navigateLocal(buttonInfo.path);
                    this.closeDropdown(dropdown);
                });
                dropdownMenu.appendChild(item);
            });
        } else {
            // Show empty state
            const emptyItem = document.createElement('div');
            emptyItem.className = 'nav-dropdown-item';
            emptyItem.style.opacity = '0.5';
            emptyItem.innerHTML = `
                <span class="icon">📂</span>
                <span class="name">No quick access items</span>
            `;
            dropdownMenu.appendChild(emptyItem);
        }

        // Setup dropdown toggle
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(dropdown);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                this.closeDropdown(dropdown);
            }
        });
    }

    getShortPath(path) {
        if (path.length <= 15) return path;
        return '...' + path.slice(-12);
    }

    toggleDropdown(dropdown) {
        const isActive = dropdown.classList.contains('active');
        
        // Close all other dropdowns first
        document.querySelectorAll('.nav-dropdown.active').forEach(d => {
            if (d !== dropdown) d.classList.remove('active');
        });
        
        // Toggle current dropdown
        dropdown.classList.toggle('active', !isActive);
    }

    closeDropdown(dropdown) {
        dropdown.classList.remove('active');
    }

    updateBreadcrumb(type, currentPath) {
        const segmentsId = type === 'local' ? 'localAddressSegments' : 'remoteAddressSegments';
        const segmentsContainer = document.getElementById(segmentsId);
        
        if (!segmentsContainer) return;
        
        // Clear existing segments
        segmentsContainer.innerHTML = '';
        
        // Create path segments in Windows Explorer style
        this.createAddressSegments(segmentsContainer, currentPath, type);
        
        // Setup dropdown functionality
        this.setupAddressDropdown(type);
    }

    createAddressSegments(container, currentPath, type) {
        let pathSegments = [];
        let separator = '/';
        
        // Handle different OS path formats
        if (this.osInfo && this.osInfo.system === 'windows' && type === 'local') {
            separator = '\\';
            if (currentPath.match(/^[A-Z]:\\?$/)) {
                pathSegments = [{ name: currentPath.replace(/\\?$/, ''), path: currentPath, isRoot: true }];
            } else {
                const parts = currentPath.split('\\').filter(p => p !== '');
                pathSegments = parts.map((part, index) => {
                    const segmentPath = parts.slice(0, index + 1).join('\\') + (index === 0 ? '\\' : '');
                    return {
                        name: part + (index === 0 ? ':' : ''),
                        path: segmentPath,
                        isRoot: index === 0
                    };
                });
            }
        } else if (this.osInfo && this.osInfo.is_wsl && type === 'local' && currentPath.startsWith('/mnt/')) {
            // WSL Windows drive paths
            const parts = currentPath.split('/').filter(p => p !== '');
            pathSegments = parts.map((part, index) => {
                const segmentPath = '/' + parts.slice(0, index + 1).join('/');
                let displayName = part;
                let isRoot = false;
                
                if (index === 0 && part === 'mnt') {
                    displayName = 'Windows Drives';
                } else if (index === 1 && parts[0] === 'mnt') {
                    displayName = part.toUpperCase() + ': Drive';
                    isRoot = true;
                }
                
                return { name: displayName, path: segmentPath, isRoot };
            });
        } else {
            // Unix-like paths
            const parts = currentPath.split('/').filter(p => p !== '');
            if (currentPath.startsWith('/')) {
                pathSegments.push({ name: 'Root', path: '/', isRoot: true });
            }
            
            parts.forEach((part, index) => {
                const segmentPath = '/' + parts.slice(0, index + 1).join('/');
                pathSegments.push({ name: part, path: segmentPath, isRoot: false });
            });
        }

        // Create segment elements
        pathSegments.forEach((segment, index) => {
            // Create segment element
            const segmentElement = document.createElement('div');
            segmentElement.className = 'address-segment';
            segmentElement.title = `Navigate to ${segment.path}`;
            
            // Add icon
            const iconElement = document.createElement('span');
            iconElement.className = 'address-segment-icon';
            
            if (segment.isRoot || segment.name.includes('Drive')) {
                iconElement.textContent = '💾';
            } else if (segment.name === 'Users' || segment.name === 'home') {
                iconElement.textContent = '👥';
            } else if (segment.name === 'Documents' || segment.name === 'Desktop') {
                iconElement.textContent = '📄';
            } else if (segment.name === 'Downloads') {
                iconElement.textContent = '⬇️';
            } else {
                iconElement.textContent = '📁';
            }
            
            // Add text
            const textElement = document.createElement('span');
            textElement.textContent = segment.name;
            
            segmentElement.appendChild(iconElement);
            segmentElement.appendChild(textElement);
            
            // Add click handler
            segmentElement.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`📍 Address segment clicked: ${segment.name} -> ${segment.path}`);
                if (type === 'local') {
                    this.navigateLocal(segment.path);
                } else {
                    this.navigateRemote(segment.path);
                }
            });
            
            container.appendChild(segmentElement);
            
            // Add separator (except for last segment)
            if (index < pathSegments.length - 1) {
                const separatorElement = document.createElement('span');
                separatorElement.className = 'address-separator';
                separatorElement.textContent = separator === '\\' ? '\\' : '/';
                container.appendChild(separatorElement);
            }
        });
    }

    setupAddressDropdown(type) {
        const dropdownBtnId = `${type}AddressDropdown`;
        const dropdownMenuId = `${type}AddressMenu`;
        
        const dropdownBtn = document.getElementById(dropdownBtnId);
        const dropdownMenu = document.getElementById(dropdownMenuId);
        
        if (!dropdownBtn || !dropdownMenu) return;
        
        // Remove existing event listeners
        dropdownBtn.replaceWith(dropdownBtn.cloneNode(true));
        const newDropdownBtn = document.getElementById(dropdownBtnId);
        
        newDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Toggle dropdown
            const isVisible = dropdownMenu.classList.contains('show');
            
            // Close all other dropdowns
            document.querySelectorAll('.address-dropdown-menu.show').forEach(menu => {
                menu.classList.remove('show');
            });
            
            if (!isVisible) {
                this.populateAddressDropdown(type);
                
                // Calculate position for fixed positioning
                const rect = newDropdownBtn.getBoundingClientRect();
                const containerRect = newDropdownBtn.closest('.breadcrumb-container').getBoundingClientRect();
                
                // Move dropdown to body to ensure it appears above everything
                if (dropdownMenu.parentNode !== document.body) {
                    document.body.appendChild(dropdownMenu);
                }
                
                // Position dropdown below the address bar
                dropdownMenu.style.position = 'fixed';
                dropdownMenu.style.top = (containerRect.bottom + 2) + 'px';
                dropdownMenu.style.left = containerRect.left + 'px';
                dropdownMenu.style.width = (containerRect.width) + 'px';
                dropdownMenu.style.minWidth = '280px';
                dropdownMenu.style.zIndex = '99999';
                
                dropdownMenu.classList.add('show');
                
                // Adjust position if dropdown goes off screen
                setTimeout(() => {
                    const menuRect = dropdownMenu.getBoundingClientRect();
                    const windowWidth = window.innerWidth;
                    const windowHeight = window.innerHeight;
                    
                    // Adjust horizontal position if off screen
                    if (menuRect.right > windowWidth) {
                        dropdownMenu.style.left = (windowWidth - menuRect.width - 10) + 'px';
                    }
                    
                    // Adjust vertical position if off screen
                    if (menuRect.bottom > windowHeight) {
                        dropdownMenu.style.top = (containerRect.top - menuRect.height - 2) + 'px';
                    }
                }, 10);
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownMenu.contains(e.target) && !newDropdownBtn.contains(e.target)) {
                dropdownMenu.classList.remove('show');
            }
        });
        
        // Close dropdown on window resize or scroll
        window.addEventListener('resize', () => {
            dropdownMenu.classList.remove('show');
        });
        
        window.addEventListener('scroll', () => {
            dropdownMenu.classList.remove('show');
        });
    }

    populateAddressDropdown(type) {
        const dropdownMenuId = `${type}AddressMenu`;
        const dropdownMenu = document.getElementById(dropdownMenuId);
        
        if (!dropdownMenu) return;
        
        // Clear existing content
        dropdownMenu.innerHTML = '';
        
        const currentPath = type === 'local' ? this.currentLocalPath : this.currentRemotePath;
        
        // Quick Access section
        const quickSection = document.createElement('div');
        quickSection.className = 'address-dropdown-section';
        
        const quickHeader = document.createElement('div');
        quickHeader.className = 'address-dropdown-header';
        quickHeader.textContent = 'Quick Access';
        quickSection.appendChild(quickHeader);
        
        // Add quick access items
        const quickItems = this.getQuickAccessItems(type);
        quickItems.forEach(item => {
            const itemElement = this.createDropdownItem(item, type);
            quickSection.appendChild(itemElement);
        });
        
        dropdownMenu.appendChild(quickSection);
        
        // Drives section (for Windows/WSL)
        if ((this.osInfo.system === 'windows' || this.osInfo.is_wsl) && type === 'local') {
            const drivesSection = document.createElement('div');
            drivesSection.className = 'address-dropdown-section';
            
            const drivesHeader = document.createElement('div');
            drivesHeader.className = 'address-dropdown-header';
            drivesHeader.textContent = this.osInfo.is_wsl ? 'Windows Drives' : 'Drives';
            drivesSection.appendChild(drivesHeader);
            
            const drives = this.osInfo.available_drives || this.getFallbackDrives(type);
            drives.forEach(drive => {
                const itemElement = this.createDropdownItem(drive, type);
                drivesSection.appendChild(itemElement);
            });
            
            dropdownMenu.appendChild(drivesSection);
        }
    }

    createDropdownItem(item, type) {
        const itemElement = document.createElement('div');
        itemElement.className = 'address-dropdown-item';
        itemElement.title = item.path;
        
        const iconElement = document.createElement('span');
        iconElement.className = 'address-dropdown-item-icon';
        iconElement.textContent = item.icon || '📁';
        
        const textElement = document.createElement('span');
        textElement.className = 'address-dropdown-item-text';
        textElement.textContent = item.name;
        
        const pathElement = document.createElement('span');
        pathElement.className = 'address-dropdown-item-path';
        pathElement.textContent = this.shortenPath(item.path);
        
        itemElement.appendChild(iconElement);
        itemElement.appendChild(textElement);
        itemElement.appendChild(pathElement);
        
        itemElement.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log(`📂 Dropdown item selected: ${item.name} -> ${item.path}`);
            if (type === 'local') {
                this.navigateLocal(item.path);
            } else {
                this.navigateRemote(item.path);
            }
            document.getElementById(`${type}AddressMenu`).classList.remove('show');
        });
        
        return itemElement;
    }

    getQuickAccessItems(type) {
        if (type === 'local') {
            if (this.osInfo && this.osInfo.system === 'windows') {
                // Windows-specific quick access
                const items = [
                    { name: 'Desktop', path: this.getDesktopPath(), icon: '🖥️' },
                    { name: 'Documents', path: this.getDocumentsPath(), icon: '📄' },
                    { name: 'Downloads', path: this.getDownloadsPath(), icon: '⬇️' },
                    { name: 'Program Files', path: 'C:\\Program Files', icon: '📁' }
                ];
                return items.filter(item => item.path);
            } else {
                // Unix-like systems
                const items = [
                    { name: 'Home', path: this.osInfo ? this.osInfo.home_path : '/home', icon: '🏠' },
                    { name: 'Desktop', path: this.getDesktopPath(), icon: '🖥️' },
                    { name: 'Documents', path: this.getDocumentsPath(), icon: '📄' },
                    { name: 'Downloads', path: this.getDownloadsPath(), icon: '⬇️' }
                ];
                return items.filter(item => item.path);
            }
        } else {
            // Remote items
            return [
                { name: 'Home', path: '/home', icon: '🏠' },
                { name: 'Root', path: '/', icon: '💾' },
                { name: 'Temp', path: '/tmp', icon: '📁' }
            ];
        }
    }

    getFallbackDrives(type) {
        if (this.osInfo.is_wsl) {
            return [
                { name: 'C: Drive', path: '/mnt/c', icon: '💾' },
                { name: 'D: Drive', path: '/mnt/d', icon: '💾' },
                { name: 'E: Drive', path: '/mnt/e', icon: '💾' }
            ];
        } else {
            return [
                { name: 'C: Drive', path: 'C:\\', icon: '💾' },
                { name: 'D: Drive', path: 'D:\\', icon: '💾' },
                { name: 'E: Drive', path: 'E:\\', icon: '💾' }
            ];
        }
    }

    getDesktopPath() {
        if (this.osInfo && this.osInfo.system === 'windows') {
            return this.osInfo.home_path + '\\Desktop';
        } else {
            return this.osInfo ? this.osInfo.home_path + '/Desktop' : null;
        }
    }

    getDocumentsPath() {
        if (this.osInfo && this.osInfo.system === 'windows') {
            return this.osInfo.home_path + '\\Documents';
        } else {
            return this.osInfo ? this.osInfo.home_path + '/Documents' : null;
        }
    }

    getDownloadsPath() {
        if (this.osInfo && this.osInfo.system === 'windows') {
            return this.osInfo.home_path + '\\Downloads';
        } else {
            return this.osInfo ? this.osInfo.home_path + '/Downloads' : null;
        }
    }

    // Professional Inline Edit System
    showInlineEdit(options) {
        const {
            title = 'Edit Item',
            subtitle = 'Enter a new name',
            icon = '📝',
            placeholder = 'Enter name...',
            currentValue = '',
            onConfirm = null,
            onCancel = null,
            validator = null
        } = options;

        // Get elements
        const overlay = document.getElementById('inlineEditOverlay');
        const iconEl = document.getElementById('inlineEditIcon');
        const titleEl = document.getElementById('inlineEditTitle');
        const subtitleEl = document.getElementById('inlineEditSubtitle');
        const input = document.getElementById('inlineEditInput');
        const error = document.getElementById('inlineEditError');
        const loading = document.getElementById('inlineEditLoading');
        const cancelBtn = document.getElementById('inlineEditCancel');
        const confirmBtn = document.getElementById('inlineEditConfirm');

        // Set content
        iconEl.textContent = icon;
        titleEl.textContent = title;
        subtitleEl.textContent = subtitle;
        input.placeholder = placeholder;
        input.value = currentValue;

        // Reset states
        input.classList.remove('error');
        error.classList.remove('show');
        loading.classList.remove('show');
        confirmBtn.disabled = false;
        cancelBtn.disabled = false;

        // Show overlay
        overlay.classList.add('show');

        // Validation function
        const validateInput = () => {
            const value = input.value.trim();
            
            if (!value) {
                this.showInlineEditError('Name cannot be empty');
                return false;
            }

            if (validator) {
                const validationResult = validator(value);
                if (validationResult !== true) {
                    this.showInlineEditError(validationResult);
                    return false;
                }
            }

            this.hideInlineEditError();
            return true;
        };

        // Event handlers
        const handleConfirm = async () => {
            // Get fresh reference to input
            const currentInput = document.getElementById('inlineEditInput');
            const value = currentInput.value.trim();
            
            console.log('🔍 Confirm clicked - raw value:', currentInput.value);
            console.log('🔍 Confirm clicked - trimmed value:', value);
            
            if (!value) {
                this.showInlineEditError('Name cannot be empty');
                return;
            }

            if (validator) {
                const validationResult = validator(value);
                console.log('🔍 Validation result:', validationResult);
                if (validationResult !== true) {
                    this.showInlineEditError(validationResult);
                    return;
                }
            }

            this.hideInlineEditError();
            
            // Show loading
            loading.classList.add('show');
            newConfirmBtn.disabled = true;
            newCancelBtn.disabled = true;

            try {
                if (onConfirm) {
                    await onConfirm(value);
                }
                this.hideInlineEdit();
            } catch (error) {
                this.showInlineEditError(error.message || 'Operation failed');
                loading.classList.remove('show');
                newConfirmBtn.disabled = false;
                newCancelBtn.disabled = false;
            }
        };

        const handleCancel = () => {
            if (onCancel) onCancel();
            this.hideInlineEdit();
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };

        // Remove existing listeners
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        
        // For input, preserve the value when cloning
        const inputClone = input.cloneNode(true);
        inputClone.value = currentValue; // Preserve the value
        input.replaceWith(inputClone);

        // Get new references
        const newConfirmBtn = document.getElementById('inlineEditConfirm');
        const newCancelBtn = document.getElementById('inlineEditCancel');
        const newInput = document.getElementById('inlineEditInput');

        // Set value again to be sure
        newInput.value = currentValue;
        newInput.placeholder = placeholder;
        
        console.log('🔍 Dialog setup - currentValue:', currentValue);
        console.log('🔍 Dialog setup - input value:', newInput.value);
        console.log('🔍 Dialog setup - placeholder:', newInput.placeholder);
        
        console.log('🔍 Dialog setup - currentValue:', currentValue);
        console.log('🔍 Dialog setup - input value:', newInput.value);
        console.log('🔍 Dialog setup - placeholder:', newInput.placeholder);

        // Add event listeners
        newConfirmBtn.addEventListener('click', handleConfirm);
        newCancelBtn.addEventListener('click', handleCancel);
        newInput.addEventListener('keydown', handleKeyPress);
        newInput.addEventListener('input', () => {
            if (newInput.classList.contains('error')) {
                this.hideInlineEditError();
            }
        });

        // Focus input and select text after everything is set up
        setTimeout(() => {
            newInput.focus();
            if (currentValue) {
                newInput.select();
            }
        }, 150);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                handleCancel();
            }
        });
    }

    hideInlineEdit() {
        const overlay = document.getElementById('inlineEditOverlay');
        overlay.classList.remove('show');
    }

    showInlineEditError(message) {
        const input = document.getElementById('inlineEditInput');
        const error = document.getElementById('inlineEditError');
        
        input.classList.add('error');
        error.textContent = message;
        error.classList.add('show');
    }

    isDirectory(path, panel) {
        // Check if path is a directory based on file list data
        const fileList = panel === 'local' ? this.localFiles : this.remoteFiles;
        if (!fileList || !Array.isArray(fileList)) {
            // Fallback: assume directories end with / or are common directory names
            return path.endsWith('/') || path.includes('folder') || path.includes('dir');
        }
        const file = fileList.find(f => f.path === path);
        return file ? file.isDirectory : false;
    }

    shortenPath(path) {
        if (path.length <= 30) return path;
        return '...' + path.slice(-27);
    }

    // Professional Delete Confirmation System
    showDeleteConfirmation(options) {
        const {
            title = 'Delete Items',
            subtitle = 'This action cannot be undone',
            icon = '🗑️',
            message = 'Are you sure you want to delete the selected items?',
            items = [],
            onConfirm = null,
            onCancel = null
        } = options;

        // Get elements
        const overlay = document.getElementById('deleteConfirmOverlay');
        const iconEl = document.getElementById('deleteConfirmIcon');
        const titleEl = document.getElementById('deleteConfirmTitle');
        const subtitleEl = document.getElementById('deleteConfirmSubtitle');
        const messageEl = document.getElementById('deleteConfirmMessage');
        const listEl = document.getElementById('deleteConfirmList');
        const loading = document.getElementById('deleteConfirmLoading');
        const cancelBtn = document.getElementById('deleteConfirmCancel');
        const confirmBtn = document.getElementById('deleteConfirmConfirm');

        // Set content
        iconEl.textContent = icon;
        titleEl.textContent = title;
        subtitleEl.textContent = subtitle;
        messageEl.textContent = message;

        // Populate file list
        listEl.innerHTML = '';
        items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.style.cssText = 'display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 12px; color: #636e72;';
            
            const isFolder = item.isDirectory || item.type === 'folder';
            const itemIcon = isFolder ? '📁' : '📄';
            
            itemEl.innerHTML = `
                <span style="font-size: 14px;">${itemIcon}</span>
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name || item.path.split('/').pop()}</span>
                <span style="font-size: 10px; opacity: 0.7;">${isFolder ? 'folder' : 'file'}</span>
            `;
            listEl.appendChild(itemEl);
        });

        // Reset states
        loading.classList.remove('show');
        confirmBtn.disabled = false;
        cancelBtn.disabled = false;

        // Show overlay
        overlay.classList.add('show');

        // Event handlers
        const handleConfirm = async () => {
            // Show loading
            loading.classList.add('show');
            confirmBtn.disabled = true;
            cancelBtn.disabled = true;

            try {
                if (onConfirm) {
                    await onConfirm();
                }
                this.hideDeleteConfirmation();
            } catch (error) {
                console.error('Delete confirmation error:', error);
                loading.classList.remove('show');
                confirmBtn.disabled = false;
                cancelBtn.disabled = false;
                // Show error in notification instead of dialog
                this.showNotification(`❌ Delete failed: ${error.message}`, 'error');
            }
        };

        const handleCancel = () => {
            if (onCancel) onCancel();
            this.hideDeleteConfirmation();
        };

        const handleKeyPress = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            }
        };

        // Remove existing listeners
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));

        // Get new references
        const newConfirmBtn = document.getElementById('deleteConfirmConfirm');
        const newCancelBtn = document.getElementById('deleteConfirmCancel');

        // Add event listeners
        newConfirmBtn.addEventListener('click', handleConfirm);
        newCancelBtn.addEventListener('click', handleCancel);
        document.addEventListener('keydown', handleKeyPress);

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                handleCancel();
            }
        });

        // Remove keydown listener when dialog closes
        const originalHide = this.hideDeleteConfirmation.bind(this);
        this.hideDeleteConfirmation = () => {
            document.removeEventListener('keydown', handleKeyPress);
            originalHide();
        };
    }

    hideDeleteConfirmation() {
        const overlay = document.getElementById('deleteConfirmOverlay');
        overlay.classList.remove('show');
    }

    hideInlineEditError() {
        const input = document.getElementById('inlineEditInput');
        const error = document.getElementById('inlineEditError');
        
        input.classList.remove('error');
        error.classList.remove('show');
    }
    
    addBreadcrumbDropdown(breadcrumb, type, currentPath) {
        // Create dropdown button
        const dropdownContainer = document.createElement('div');
        dropdownContainer.className = 'breadcrumb-dropdown';
        
        const dropdownBtn = document.createElement('button');
        dropdownBtn.className = 'breadcrumb-dropdown-btn';
        dropdownBtn.innerHTML = '▼';
        dropdownBtn.title = 'Navigate to parent directories';
        
        const dropdownMenu = document.createElement('div');
        dropdownMenu.className = 'breadcrumb-dropdown-menu';
        
        // Generate parent paths
        const parentPaths = this.generateParentPaths(currentPath, type);
        
        parentPaths.forEach(pathInfo => {
            const item = document.createElement('div');
            item.className = 'breadcrumb-dropdown-item';
            
            // Add appropriate icon based on path type
            let pathIcon = '📁';
            if (pathInfo.name.includes('Drive') || pathInfo.path.match(/^[A-Z]:\\/)) {
                pathIcon = '💾';
            } else if (pathInfo.name.includes('Users') || pathInfo.name.includes('Home')) {
                pathIcon = '👥';
            } else if (pathInfo.name.includes('Root')) {
                pathIcon = '🏠';
            } else if (pathInfo.name.includes('Program')) {
                pathIcon = '⚙️';
            } else if (pathInfo.name.includes('Windows')) {
                pathIcon = '🪟';
            }
            
            item.innerHTML = `<span style="margin-right: 8px;">${pathIcon}</span><span>${pathInfo.name}</span>`;
            item.title = pathInfo.path;
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log(`📁 Parent directory selected: ${pathInfo.path}`);
                if (type === 'local') {
                    this.navigateLocal(pathInfo.path);
                } else {
                    this.navigateRemote(pathInfo.path);
                }
                dropdownContainer.classList.remove('active');
            });
            
            dropdownMenu.appendChild(item);
        });
        
        // Setup dropdown toggle
        dropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // Calculate position for fixed positioning
            const rect = dropdownBtn.getBoundingClientRect();
            const menu = dropdownMenu;
            
            // Position dropdown below button
            menu.style.position = 'fixed';
            menu.style.top = (rect.bottom + 2) + 'px';
            menu.style.left = (rect.left) + 'px';
            menu.style.right = 'auto';
            
            // Toggle dropdown
            dropdownContainer.classList.toggle('active');
            
            // Close other dropdowns
            document.querySelectorAll('.nav-dropdown.active, .breadcrumb-dropdown.active').forEach(d => {
                if (d !== dropdownContainer) d.classList.remove('active');
            });
            
            // Adjust position if dropdown goes off screen
            if (dropdownContainer.classList.contains('active')) {
                setTimeout(() => {
                    const menuRect = menu.getBoundingClientRect();
                    const windowWidth = window.innerWidth;
                    const windowHeight = window.innerHeight;
                    
                    // Adjust horizontal position if off screen
                    if (menuRect.right > windowWidth) {
                        menu.style.left = (windowWidth - menuRect.width - 10) + 'px';
                    }
                    
                    // Adjust vertical position if off screen
                    if (menuRect.bottom > windowHeight) {
                        menu.style.top = (rect.top - menuRect.height - 2) + 'px';
                    }
                }, 10);
            }
        });
        
        // Close on outside click and window resize
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownContainer.classList.remove('active');
            }
        });
        
        window.addEventListener('resize', () => {
            dropdownContainer.classList.remove('active');
        });
        
        dropdownContainer.appendChild(dropdownBtn);
        dropdownContainer.appendChild(dropdownMenu);
        breadcrumb.appendChild(dropdownContainer);
    }
    
    generateParentPaths(currentPath, type) {
        const parentPaths = [];
        
        if (this.osInfo && this.osInfo.system === 'windows' && type === 'local') {
            // Windows path handling
            const parts = currentPath.split('\\').filter(p => p !== '');
            
            // Add drive roots
            if (this.osInfo.available_drives) {
                this.osInfo.available_drives.forEach(drive => {
                    if (drive.path !== currentPath) {
                        parentPaths.push({
                            name: drive.name,
                            path: drive.path
                        });
                    }
                });
            }
            
            // Add common Windows directories
            const commonDirs = [
                { name: 'Users', path: 'C:\\Users' },
                { name: 'Program Files', path: 'C:\\Program Files' },
                { name: 'Windows', path: 'C:\\Windows' }
            ];
            
            commonDirs.forEach(dir => {
                if (dir.path !== currentPath && !parentPaths.some(p => p.path === dir.path)) {
                    parentPaths.push(dir);
                }
            });
            
        } else {
            // Unix-like path handling
            const commonDirs = [
                { name: 'Root (/)', path: '/' },
                { name: 'Home', path: '/home' },
                { name: 'User Home', path: this.osInfo ? this.osInfo.home_path : '/home' },
                { name: 'Temp', path: '/tmp' },
                { name: 'Var', path: '/var' }
            ];
            
            commonDirs.forEach(dir => {
                if (dir.path !== currentPath) {
                    parentPaths.push(dir);
                }
            });
        }
        
        return parentPaths.slice(0, 8); // Limit to 8 items
    }

    initializeEventListeners() {
        // Authentication tabs
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                console.log('Auth tab clicked:', e.target.dataset.auth);
                
                document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                
                const authType = e.target.dataset.auth;
                console.log('Switching to auth type:', authType);
                
                const passwordAuth = document.getElementById('passwordAuth');
                const keyAuth = document.getElementById('keyAuth');
                
                if (passwordAuth && keyAuth) {
                    passwordAuth.style.display = authType === 'password' ? 'block' : 'none';
                    keyAuth.style.display = authType === 'key' ? 'block' : 'none';
                    console.log('Auth sections toggled successfully');
                } else {
                    console.error('Auth sections not found:', { passwordAuth, keyAuth });
                }
            });
        });

        // File upload for SSH key
        const keyUploadArea = document.getElementById('keyUploadArea');
        const keyFileInput = document.getElementById('keyFile');
        
        if (keyUploadArea && keyFileInput) {
            keyUploadArea.addEventListener('click', () => {
                console.log('Key upload area clicked');
                keyFileInput.click();
            });
            
            keyFileInput.addEventListener('change', (e) => {
                console.log('Key file selected:', e.target.files[0]?.name);
                this.handleKeyFileUpload(e);
            });
        } else {
            console.error('Key upload elements not found:', { keyUploadArea, keyFileInput });
        }

        // Login buttons
        document.getElementById('testConnectionBtn').addEventListener('click', () => this.testConnection());
        document.getElementById('loginBtn').addEventListener('click', () => this.login());
        document.getElementById('disconnectBtn').addEventListener('click', () => this.disconnect());

        // Show saved credentials button
        const showSavedCredentialsBtn = document.getElementById('showSavedCredentialsBtn');
        if (showSavedCredentialsBtn) {
            showSavedCredentialsBtn.addEventListener('click', () => {
                this.loadSavedCredentials();
                document.getElementById('savedCredentialsSection').style.display = 'block';
            });
        }

        // Center control buttons
        const selectAllLocalBtn = document.getElementById('selectAllLocalBtn');
        const selectAllRemoteBtn = document.getElementById('selectAllRemoteBtn');
        const clearLocalBtn = document.getElementById('clearLocalBtn');
        const clearRemoteBtn = document.getElementById('clearRemoteBtn');
        const invertLocalBtn = document.getElementById('invertLocalBtn');
        const invertRemoteBtn = document.getElementById('invertRemoteBtn');
        const deleteLocalBtn = document.getElementById('deleteLocalBtn');
        const deleteRemoteBtn = document.getElementById('deleteRemoteBtn');
        const newFolderLocalBtn = document.getElementById('newFolderLocalBtn');
        const newFolderRemoteBtn = document.getElementById('newFolderRemoteBtn');
        const renameLocalBtn = document.getElementById('renameLocalBtn');
        const renameRemoteBtn = document.getElementById('renameRemoteBtn');
        
        if (selectAllLocalBtn) {
            selectAllLocalBtn.addEventListener('click', () => this.selectAllLocal());
        }
        
        if (selectAllRemoteBtn) {
            selectAllRemoteBtn.addEventListener('click', () => this.selectAllRemote());
        }
        
        if (clearLocalBtn) {
            clearLocalBtn.addEventListener('click', () => this.clearSelectionLocal());
        }
        
        if (clearRemoteBtn) {
            clearRemoteBtn.addEventListener('click', () => this.clearSelectionRemote());
        }
        
        if (invertLocalBtn) {
            invertLocalBtn.addEventListener('click', () => this.invertSelectionLocal());
        }
        
        if (invertRemoteBtn) {
            invertRemoteBtn.addEventListener('click', () => this.invertSelectionRemote());
        }
        
        if (deleteLocalBtn) {
            deleteLocalBtn.addEventListener('click', () => this.deleteSelectedLocal());
        }
        
        if (deleteRemoteBtn) {
            deleteRemoteBtn.addEventListener('click', () => this.deleteSelectedRemote());
        }
        
        if (newFolderLocalBtn) {
            newFolderLocalBtn.addEventListener('click', () => this.createNewFolder('local'));
        }
        
        if (newFolderRemoteBtn) {
            newFolderRemoteBtn.addEventListener('click', () => this.createNewFolder('remote'));
        }
        
        if (renameLocalBtn) {
            renameLocalBtn.addEventListener('click', () => this.renameSelected('local'));
        }
        
        if (renameRemoteBtn) {
            renameRemoteBtn.addEventListener('click', () => this.renameSelected('remote'));
        }

        // View controls
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const panel = e.target.dataset.panel;
                const view = e.target.dataset.view;
                this.changeView(panel, view);
            });
        });

        // Transfer buttons
        const downloadBtn = document.getElementById('downloadBtn');
        const uploadBtn = document.getElementById('uploadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadSelected());
        }
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => this.uploadSelected());
        }

        // Modal buttons
        const cancelTransferBtn = document.getElementById('cancelTransferBtn');
        const confirmCancelBtn = document.getElementById('confirmCancelBtn');
        const confirmOkBtn = document.getElementById('confirmOkBtn');
        
        if (cancelTransferBtn) {
            cancelTransferBtn.addEventListener('click', () => this.cancelTransfer());
        }
        if (confirmCancelBtn) {
            confirmCancelBtn.addEventListener('click', () => this.hideConfirmModal());
        }
        if (confirmOkBtn) {
            confirmOkBtn.addEventListener('click', () => this.confirmAction());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    setupDragAndDrop() {
        const keyUploadArea = document.getElementById('keyUploadArea');
        
        if (!keyUploadArea) {
            console.error('keyUploadArea element not found - SSH key drag & drop will not work');
            return;
        }
        
        console.log('Setting up SSH key drag & drop functionality');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            keyUploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            keyUploadArea.addEventListener(eventName, () => {
                keyUploadArea.classList.add('dragover');
                console.log('SSH key drag over detected');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            keyUploadArea.addEventListener(eventName, () => {
                keyUploadArea.classList.remove('dragover');
            });
        });

        keyUploadArea.addEventListener('drop', (e) => {
            console.log('SSH key file dropped');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                console.log('Processing dropped SSH key file:', files[0].name);
                this.handleKeyFileUpload({ target: { files: files } });
            }
        });
        
        console.log('SSH key drag & drop setup completed');
    }

    setupFilePanelDragDrop() {
        // Setup drag and drop for file panels
        const localPanel = document.getElementById('localFileList');
        const remotePanel = document.getElementById('remoteFileList');
        const localDropZone = document.getElementById('localDropZone');
        const remoteDropZone = document.getElementById('remoteDropZone');

        // Local panel drag and drop (for uploading to remote)
        this.setupPanelDragDrop(localPanel, localDropZone, 'local');
        
        // Remote panel drag and drop (for downloading to local)
        this.setupPanelDragDrop(remotePanel, remoteDropZone, 'remote');
    }

    setupPanelDragDrop(panel, dropZone, panelType) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            panel.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        // Handle drag enter/over
        ['dragenter', 'dragover'].forEach(eventName => {
            panel.addEventListener(eventName, (e) => {
                if (this.isDragFromOtherPanel(e, panelType)) {
                    panel.classList.add('drag-over');
                    dropZone.classList.add('active');
                }
            });
        });

        // Handle drag leave
        panel.addEventListener('dragleave', (e) => {
            if (!panel.contains(e.relatedTarget)) {
                panel.classList.remove('drag-over');
                dropZone.classList.remove('active');
            }
        });

        // Handle drop
        panel.addEventListener('drop', (e) => {
            panel.classList.remove('drag-over');
            dropZone.classList.remove('active');
            
            if (this.isDragFromOtherPanel(e, panelType)) {
                this.handleFileDrop(e, panelType);
            }
        });
    }

    isDragFromOtherPanel(e, currentPanel) {
        // Check if drag is coming from the other panel
        const dragData = e.dataTransfer.getData('text/plain');
        if (!dragData) return false;
        
        try {
            const data = JSON.parse(dragData);
            return data.sourcePanel !== currentPanel;
        } catch {
            return false;
        }
    }

    handleFileDrop(e, targetPanel) {
        try {
            const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
            const sourceFiles = dragData.files;
            
            if (sourceFiles && sourceFiles.length > 0) {
                // Perform transfer based on target panel
                if (targetPanel === 'local') {
                    // Download from remote to local
                    this.performDragDropTransfer(sourceFiles, 'download');
                } else {
                    // Upload from local to remote
                    this.performDragDropTransfer(sourceFiles, 'upload');
                }
            }
        } catch (error) {
            console.error('Error handling file drop:', error);
        }
    }

    async performDragDropTransfer(files, direction) {
        // Show initial modal
        this.showProgressModal(
            direction === 'upload' ? '⬆️' : '⬇️', 
            `Preparing to ${direction === 'upload' ? 'upload' : 'download'} ${files.length} item(s)...`
        );
        this.transferInProgress = true;
        this.setTransferActive(true); // Notify keep-alive system
        
        try {
            // Count files and directories
            const itemCounts = await this.countFilesAndDirectories(files, direction);
            const totalItems = itemCounts.files + itemCounts.directories;
            
            // Update modal with detailed count
            this.updateProgressModalMessage(
                `${direction === 'upload' ? 'Uploading' : 'Downloading'} ${totalItems} item(s) (${itemCounts.files} files, ${itemCounts.directories} folders)...`
            );
            
            // Start the actual transfer
            const transferPromise = fetch('/api/transfer-multiple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: files,
                    direction: direction,
                    source_base: direction === 'upload' ? this.currentLocalPath : this.currentRemotePath,
                    dest_base: direction === 'upload' ? this.currentRemotePath : this.currentLocalPath
                })
            });
            
            // Start progress monitoring immediately after starting transfer
            this.startProgressMonitoring();
            
            // Wait for transfer to complete
            const response = await transferPromise;
            const result = await response.json();
            
            if (result.success) {
                // Check for partial failures
                const failedFiles = result.results ? result.results.filter(r => !r.success) : [];
                
                if (failedFiles.length > 0) {
                    const successCount = files.length - failedFiles.length;
                    this.showCompletionModal(
                        '⚠️ Transfer Completed with Issues',
                        `Partial success: ${successCount}/${files.length} items transferred successfully.\n${failedFiles.length} items failed.`,
                        'warning'
                    );
                } else {
                    this.showCompletionModal(
                        '✅ Transfer Completed Successfully',
                        `Successfully ${direction === 'upload' ? 'uploaded' : 'downloaded'} ${totalItems} item(s)\n(${itemCounts.files} files, ${itemCounts.directories} folders)`,
                        'success'
                    );
                }
                
                // Refresh both panels after a delay
                setTimeout(() => {
                    this.refreshLocal();
                    this.refreshRemote();
                    this.clearAllSelections();
                }, 1000);
            } else {
                throw new Error(result.error || 'Transfer failed');
            }
        } catch (error) {
            console.error('Transfer error:', error);
            this.showCompletionModal(
                '❌ Transfer Failed',
                `${direction === 'upload' ? 'Upload' : 'Download'} failed: ${error.message}`,
                'error'
            );
        } finally {
            this.transferInProgress = false;
            this.setTransferActive(false); // Notify keep-alive system
            this.stopProgressMonitoring();
        }
    }

    showCompletionModal(title, message, type) {
        // Hide progress modal
        this.hideProgressModal();
        
        // Play notification sound
        this.playNotificationSound(type);
        
        // Show completion modal
        const modal = document.getElementById('completionModal') || this.createCompletionModal();
        const titleEl = document.getElementById('completionTitle');
        const messageEl = document.getElementById('completionMessage');
        const timerEl = document.getElementById('autoCloseTimer');
        
        if (titleEl) titleEl.textContent = title;
        if (messageEl) messageEl.textContent = message;
        
        // Set modal color based on type
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.borderLeft = type === 'success' ? '4px solid #4CAF50' : 
                                          type === 'warning' ? '4px solid #FF9800' : '4px solid #F44336';
            
            // Add animation
            modalContent.style.animation = 'modalSlideIn 0.3s ease-out';
        }
        
        modal.style.display = 'flex';
        
        // Auto-close timer
        let countdown = 10;
        if (timerEl) {
            timerEl.innerHTML = `<span style="opacity: 0.7;">Auto-close in</span> <span style="font-weight: bold; color: #4CAF50;">${countdown}</span> <span style="opacity: 0.7;">seconds</span>`;
        }
        
        this.autoCloseInterval = setInterval(() => {
            countdown--;
            if (timerEl) {
                const color = countdown <= 3 ? '#F44336' : countdown <= 5 ? '#FF9800' : '#4CAF50';
                timerEl.innerHTML = `<span style="opacity: 0.7;">Auto-close in</span> <span style="font-weight: bold; color: ${color};">${countdown}</span> <span style="opacity: 0.7;">seconds</span>`;
            }
            
            if (countdown <= 0) {
                this.hideCompletionModal();
            }
        }, 1000);
    }
    
    playNotificationSound(type) {
        try {
            // Create audio context for notification sounds
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Different sounds for different types
            if (type === 'success') {
                // Success: Two ascending tones
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
            } else if (type === 'warning') {
                // Warning: Single tone
                oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
            } else {
                // Error: Descending tone
                oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
                oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1);
            }
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
        } catch (error) {
            // Ignore audio errors (some browsers might block audio)
            console.log('Audio notification not available');
        }
    }
    
    createCompletionModal() {
        const modal = document.createElement('div');
        modal.id = 'completionModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content glass-container" style="max-width: 500px; position: relative;">
                <div style="position: absolute; top: 10px; right: 15px; font-size: 24px; cursor: pointer; opacity: 0.7; hover: opacity: 1;" onclick="app.hideCompletionModal()">×</div>
                <h3 id="completionTitle" style="color: white; margin-bottom: 20px; font-weight: 300; padding-right: 30px;"></h3>
                <p id="completionMessage" style="color: rgba(255, 255, 255, 0.9); margin-bottom: 20px; white-space: pre-line; line-height: 1.5;"></p>
                <div id="autoCloseTimer" style="color: rgba(255, 255, 255, 0.8); font-size: 14px; margin-bottom: 20px; text-align: center; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 5px;"></div>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button class="btn btn-secondary" onclick="app.hideCompletionModal()" style="min-width: 120px;">Close Now</button>
                </div>
            </div>
            <style>
                @keyframes modalSlideIn {
                    from { transform: translateY(-50px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
        `;
        document.body.appendChild(modal);
        return modal;
    }
    
    startKeepAlive() {
        // Smart Keep-Alive System with Transfer Awareness
        console.log('🔄 Starting smart keep-alive system...');
        
        // Initialize keep-alive state
        this.keepAliveState = {
            lastActivity: Date.now(),
            lastPing: Date.now(),
            consecutiveFailures: 0,
            isTransferActive: false,
            idleTimeout: 60 * 60 * 1000, // 1 hour in milliseconds
            pingInterval: 15 * 1000, // 15 seconds
            maxFailures: 4 // Allow 4 consecutive failures before showing reconnect
        };
        
        // Lightweight ping every 15 seconds
        this.keepAliveInterval = setInterval(async () => {
            await this.performSmartKeepAlive();
        }, this.keepAliveState.pingInterval);
        
        console.log('✅ Smart keep-alive started: 15s ping, 1hr idle timeout');
    }
    
    async performSmartKeepAlive() {
        const now = Date.now();
        const timeSinceLastActivity = now - this.keepAliveState.lastActivity;
        const timeSinceLastPing = now - this.keepAliveState.lastPing;
        
        // Skip ping if transfer is active (don't interfere with file operations)
        if (this.transferInProgress || this.keepAliveState.isTransferActive) {
            console.log('🔄 Transfer active - skipping keep-alive ping');
            this.updateActivity(); // Reset activity timer during transfers
            return;
        }
        
        // Check if we've been idle for more than 1 hour
        if (timeSinceLastActivity > this.keepAliveState.idleTimeout) {
            console.log('⏰ Session idle for more than 1 hour - initiating disconnect');
            this.handleIdleTimeout();
            return;
        }
        
        // Perform lightweight ping
        try {
            const response = await fetch('/api/keep-alive-ping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    timestamp: now,
                    lightweight: true,
                    idle_time: timeSinceLastActivity
                })
            });
            
            this.keepAliveState.lastPing = now;
            
            if (response.ok) {
                const data = await response.json();
                
                if (data.success) {
                    // Reset failure counter on success
                    this.keepAliveState.consecutiveFailures = 0;
                    this.hideReconnectButton();
                    
                    // Subtle success indicator (no notifications for regular pings)
                    this.showKeepAliveIndicator('success');
                    
                    console.log(`🔄 Keep-alive ping successful (idle: ${Math.round(timeSinceLastActivity/1000)}s)`);
                } else {
                    this.handleKeepAliveFailure(data);
                }
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
            
        } catch (error) {
            console.warn('⚠️ Keep-alive ping failed:', error.message);
            this.handleKeepAliveFailure({ error: error.message, error_type: 'network_error' });
        }
    }
    
    handleKeepAliveFailure(data) {
        this.keepAliveState.consecutiveFailures++;
        
        // Only show reconnect button after multiple consecutive failures
        if (this.keepAliveState.consecutiveFailures >= this.keepAliveState.maxFailures) {
            console.log(`❌ ${this.keepAliveState.consecutiveFailures} consecutive keep-alive failures`);
            
            // Handle different error types
            switch (data.error_type) {
                case 'server_shutdown':
                    this.showNotification('⚠️ Server appears to be down. Monitoring for restart...', 'warning');
                    this.showReconnectButton('Server down - Click to reconnect when available');
                    break;
                    
                case 'server_restart':
                    if (data.reconnect_failed) {
                        this.showNotification('❌ Server restarted but auto-reconnect failed.', 'error');
                        this.showReconnectButton('Auto-reconnect failed - Click to reconnect manually');
                    } else {
                        this.showNotification('🔄 Server restarted. Attempting to reconnect...', 'info');
                    }
                    break;
                    
                case 'no_session':
                case 'no_connection':
                    this.showNotification('❌ Session expired after prolonged inactivity.', 'error');
                    this.showReconnectButton('Session expired - Click to reconnect');
                    break;
                    
                case 'auth_required':
                    this.showNotification('🔐 Server requires re-authentication.', 'warning');
                    this.showReconnectButton('Authentication required - Click to login');
                    break;
                    
                case 'network_error':
                    this.showNotification('🌐 Network connection issues detected.', 'warning');
                    this.showReconnectButton('Network issue - Click to reconnect');
                    break;
                    
                default:
                    this.showReconnectButton('Connection issue - Click to reconnect');
            }
            
            this.showKeepAliveIndicator('error');
        } else {
            // Just show warning indicator for minor failures
            this.showKeepAliveIndicator('warning');
            console.log(`⚠️ Keep-alive failure ${this.keepAliveState.consecutiveFailures}/${this.keepAliveState.maxFailures}`);
        }
    }
    
    handleIdleTimeout() {
        console.log('⏰ Handling idle timeout - disconnecting session');
        this.showNotification('⏰ Session disconnected due to 1 hour of inactivity.', 'info');
        this.showReconnectButton('Session timed out - Click to reconnect');
        this.isConnected = false;
        this.stopKeepAlive();
    }
    
    // Call this method whenever user interacts with the app
    updateActivity() {
        this.keepAliveState.lastActivity = Date.now();
        
        // Reset failure counter on user activity
        if (this.keepAliveState.consecutiveFailures > 0) {
            console.log('👆 User activity detected - resetting failure counter');
            this.keepAliveState.consecutiveFailures = 0;
        }
    }
    
    // Call this when transfer starts
    setTransferActive(active) {
        this.keepAliveState.isTransferActive = active;
        if (active) {
            console.log('📁 Transfer started - keep-alive will not interfere');
            this.updateActivity(); // Reset activity timer
        } else {
            console.log('✅ Transfer completed - resuming normal keep-alive');
        }
    }
    
    setupActivityTracking() {
        // Track various user activities to reset idle timer
        const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
        
        // Throttle activity updates to avoid excessive calls
        let lastActivityUpdate = 0;
        const throttleDelay = 30000; // Update activity at most once every 30 seconds
        
        const handleActivity = () => {
            const now = Date.now();
            if (now - lastActivityUpdate > throttleDelay) {
                this.updateActivity();
                lastActivityUpdate = now;
            }
        };
        
        // Add event listeners for user activity
        activityEvents.forEach(event => {
            document.addEventListener(event, handleActivity, { passive: true });
        });
        
        console.log('👆 Activity tracking setup complete');
    }
    
    showReconnectButton(message = 'Connection lost - Click to reconnect') {
        // Create/show the dynamic reconnect button
        let reconnectBtn = document.getElementById('reconnectButton');
        if (!reconnectBtn) {
            // Create reconnect button
            reconnectBtn = document.createElement('button');
            reconnectBtn.id = 'reconnectButton';
            reconnectBtn.className = 'reconnect-btn';
            reconnectBtn.innerHTML = '🔄 Reconnect';
            reconnectBtn.title = message;
            
            // Add click handler
            reconnectBtn.addEventListener('click', () => {
                this.attemptReconnect();
            });
            
            // Add to appropriate location based on current screen
            let targetArea = null;
            
            // Try to add to main app header (next to disconnect button)
            const connectionInfo = document.querySelector('.connection-info');
            if (connectionInfo && document.getElementById('mainApp').style.display !== 'none') {
                targetArea = connectionInfo;
                reconnectBtn.classList.add('btn-small');
                reconnectBtn.style.marginLeft = '10px';
            } else {
                // Fallback to connection status area or login section
                targetArea = document.querySelector('.connection-status') || document.querySelector('.login-section');
            }
            
            if (targetArea) {
                targetArea.appendChild(reconnectBtn);
            }
        }
        
        reconnectBtn.style.display = 'inline-block';
        reconnectBtn.title = message;
        this.setLoginStatus(`⚠️ ${message}`, 'warning');
    }
    
    hideReconnectButton() {
        // Hide the dynamic reconnect button
        const reconnectBtn = document.getElementById('reconnectButton');
        if (reconnectBtn) {
            reconnectBtn.style.display = 'none';
        }
    }
    
    async attemptReconnect() {
        const reconnectBtn = document.getElementById('reconnectButton');
        if (reconnectBtn) {
            reconnectBtn.innerHTML = '🔄 Reconnecting...';
            reconnectBtn.disabled = true;
        }
        
        this.setLoginStatus('🔄 Attempting to reconnect...', 'info');
        
        try {
            // Try to restore the connection using stored credentials
            const response = await fetch('/api/connection-status');
            if (response.ok) {
                const result = await response.json();
                if (result.connected) {
                    this.setLoginStatus('✅ Connection restored successfully!', 'success');
                    this.hideReconnectButton();
                    this.isConnected = true;
                    
                    // Refresh both panels
                    await this.loadLocalDirectory(this.currentLocalPath);
                    if (this.currentRemotePath) {
                        await this.loadRemoteDirectory(this.currentRemotePath);
                    }
                } else {
                    // Connection is lost, need to re-login
                    this.setLoginStatus('❌ Connection lost. Please login again.', 'error');
                    this.isConnected = false;
                    this.showLoginForm();
                }
            } else {
                throw new Error('Server not responding');
            }
        } catch (error) {
            this.setLoginStatus('❌ Reconnection failed. Please check server and login again.', 'error');
            this.isConnected = false;
            this.showLoginForm();
        }
        
        if (reconnectBtn) {
            reconnectBtn.innerHTML = '🔄 Reconnect';
            reconnectBtn.disabled = false;
        }
    }
    
    showLoginForm() {
        // Show the login section and hide file panels
        const loginSection = document.querySelector('.login-section');
        const fileSection = document.querySelector('.file-section');
        
        if (loginSection) loginSection.style.display = 'block';
        if (fileSection) fileSection.style.display = 'none';
        
        this.hideReconnectButton();
    }
    
    handleSessionExpired() {
        // Stop keep-alive
        this.stopKeepAlive();
        
        // Show login screen after a delay
        setTimeout(() => {
            document.getElementById('mainApp').style.display = 'none';
            document.getElementById('loginScreen').style.display = 'block';
            this.setLoginStatus('Session expired. Please login again.', 'warning');
        }, 3000);
    }
    
    async testConnection() {
        const host = document.getElementById('host').value.trim();
        const port = document.getElementById('port').value.trim() || '22';
        
        if (!host) {
            this.setLoginStatus('Please enter server address first', 'warning');
            return;
        }
        
        const testBtn = document.getElementById('testConnectionBtn');
        const testBtnText = testBtn.querySelector('span');
        const testLoading = document.getElementById('testLoading');
        
        testBtn.disabled = true;
        testBtnText.style.display = 'none';
        testLoading.style.display = 'inline-block';
        this.setLoginStatus('🔍 Testing server connection...', 'info');
        
        try {
            const response = await fetch('/api/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host, port: parseInt(port) })
            });
            
            const result = await response.json();
            
            if (result.success) {
                this.setLoginStatus(`✅ Server ${host}:${port} is available and ready for connection!`, 'success');
            } else {
                let errorMsg = '';
                switch (result.error_type) {
                    case 'server_unreachable':
                        errorMsg = `❌ Server ${host}:${port} is not reachable.\n\nPlease check:\n• Server is running\n• Network connectivity\n• Firewall settings`;
                        break;
                    case 'timeout':
                        errorMsg = `⏱️ Connection timeout to ${host}:${port}.\n\nServer may be:\n• Overloaded\n• Behind firewall\n• Having network issues`;
                        break;
                    case 'dns_error':
                        errorMsg = `🌐 Cannot resolve hostname "${host}".\n\nPlease check:\n• Server address spelling\n• DNS settings`;
                        break;
                    case 'ssh_unavailable':
                        errorMsg = `🔒 SSH service not available on ${host}:${port}.\n\nPlease check:\n• SSH service is running\n• Correct port number`;
                        break;
                    default:
                        errorMsg = `❌ Connection test failed: ${result.error}`;
                }
                this.setLoginStatus(errorMsg, 'error');
            }
        } catch (error) {
            this.setLoginStatus(`❌ Connection test error: ${error.message}`, 'error');
        } finally {
            testBtn.disabled = false;
            testBtnText.style.display = 'inline';
            testLoading.style.display = 'none';
        }
    }
    
    showKeepAliveIndicator(type = 'success') {
        // Show a colored dot indicator based on connection status
        const indicator = document.createElement('div');
        
        let color, title;
        switch (type) {
            case 'success':
                color = '#4CAF50';
                title = 'Connection healthy';
                break;
            case 'warning':
                color = '#FF9800';
                title = 'Connection issues detected';
                break;
            case 'error':
                color = '#F44336';
                title = 'Connection problems';
                break;
            default:
                color = '#4CAF50';
                title = 'Connection status';
        }
        
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 12px;
            height: 12px;
            background: ${color};
            border-radius: 50%;
            z-index: 10000;
            opacity: 0.8;
            animation: pulse 0.5s ease-in-out;
            cursor: pointer;
            title: ${title};
        `;
        
        indicator.title = title;
        
        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.2); opacity: 1; }
                100% { transform: scale(1); opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(indicator);
        
        // Remove indicator after 3 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 3000);
    }
    
    stopKeepAlive() {
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
            console.log('⏹️ Keep-alive mechanism stopped');
        }
    }
    
    showKeepAliveIndicator() {
        // Show a subtle green dot indicator for 2 seconds
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            width: 12px;
            height: 12px;
            background: #4CAF50;
            border-radius: 50%;
            z-index: 10000;
            opacity: 0.8;
            animation: pulse 0.5s ease-in-out;
        `;
        
        // Add pulse animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.2); opacity: 1; }
                100% { transform: scale(1); opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(indicator);
        
        // Remove indicator after 2 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
            if (style.parentNode) {
                style.parentNode.removeChild(style);
            }
        }, 2000);
    }
    
    hideCompletionModal() {
        const modal = document.getElementById('completionModal');
        if (modal) modal.style.display = 'none';
        
        if (this.autoCloseInterval) {
            clearInterval(this.autoCloseInterval);
            this.autoCloseInterval = null;
        }
    }

    updateProgressModalMessage(message) {
        const detailsEl = document.getElementById('progressDetails');
        if (detailsEl) {
            detailsEl.innerHTML = `
                <div style="margin-bottom: 8px; font-weight: 500; color: rgba(255, 255, 255, 0.9);">
                    ${message}
                </div>
                <div style="font-size: 12px; opacity: 0.7;">
                    Starting transfer...
                </div>
            `;
        }
    }

    async countFilesAndDirectories(paths, direction) {
        let fileCount = 0;
        let dirCount = 0;
        
        for (const path of paths) {
            try {
                if (direction === 'upload') {
                    // Count local files/directories
                    const counts = await this.countLocalPath(path);
                    fileCount += counts.files;
                    dirCount += counts.directories;
                } else {
                    // Count remote files/directories
                    const counts = await this.countRemotePath(path);
                    fileCount += counts.files;
                    dirCount += counts.directories;
                }
            } catch (error) {
                console.warn(`Could not count items in ${path}:`, error);
                // Assume it's a single file if we can't determine
                fileCount += 1;
            }
        }
        
        return { files: fileCount, directories: dirCount };
    }

    async countLocalPath(path) {
        try {
            const response = await fetch(`/api/count-local-items?path=${encodeURIComponent(path)}`);
            const result = await response.json();
            return result.success ? { files: result.files, directories: result.directories } : { files: 1, directories: 0 };
        } catch (error) {
            // Fallback: assume it's a single file
            return { files: 1, directories: 0 };
        }
    }

    async countRemotePath(path) {
        try {
            const response = await fetch(`/api/count-remote-items?path=${encodeURIComponent(path)}`);
            const result = await response.json();
            return result.success ? { files: result.files, directories: result.directories } : { files: 1, directories: 0 };
        } catch (error) {
            // Fallback: assume it's a single file
            return { files: 1, directories: 0 };
        }
    }

    startProgressMonitoring() {
        // Clear any existing interval
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
        }
        
        console.log('Starting aggressive progress monitoring for slow internet...');
        
        // Initialize stuck detection
        this.lastProgressUpdate = Date.now();
        this.lastProgressValue = 0;
        this.stuckCheckCount = 0;
        
        // More aggressive monitoring for slow internet
        this.progressInterval = setInterval(async () => {
            try {
                // Add timeout for slow connections
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
                
                const response = await fetch('/api/transfer-progress', {
                    signal: controller.signal,
                    cache: 'no-cache',
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                });
                
                clearTimeout(timeoutId);
                const progressData = await response.json();
                
                console.log('Progress data received:', progressData);
                this.updateProgressDisplay(progressData);
                
                // Check for stuck transfer
                const currentProgress = progressData.progress || 0;
                const now = Date.now();
                
                if (currentProgress === this.lastProgressValue) {
                    this.stuckCheckCount++;
                    
                    // If progress hasn't changed for 2 minutes (24 checks at 5-second intervals)
                    if (this.stuckCheckCount >= 24) {
                        console.warn('🚨 Transfer appears to be stuck - no progress for 2 minutes');
                        
                        // Show stuck transfer dialog
                        if (confirm('Transfer appears to be stuck. Would you like to cancel it?')) {
                            await this.cancelTransfer();
                            return;
                        } else {
                            // Reset counter if user chooses to continue
                            this.stuckCheckCount = 0;
                        }
                    }
                } else {
                    // Progress changed, reset stuck counter
                    this.stuckCheckCount = 0;
                    this.lastProgressValue = currentProgress;
                    this.lastProgressUpdate = now;
                }
                
                // Force DOM update for slow browsers
                if (progressData.files_completed !== this.lastFileCount || 
                    progressData.dirs_completed !== this.lastDirCount) {
                    this.lastFileCount = progressData.files_completed;
                    this.lastDirCount = progressData.dirs_completed;
                    console.log(`🔄 Progress changed: Files ${progressData.files_completed}/${progressData.total_files}, Dirs ${progressData.dirs_completed}/${progressData.total_dirs}`);
                }
                
            } catch (error) {
                if (error.name === 'AbortError') {
                    console.warn('Progress request timed out (slow internet)');
                } else {
                    console.error('Error fetching progress:', error);
                }
            }
        }, 200); // Check every 200ms for more responsive updates
    }
    
    stopProgressMonitoring() {
        console.log('Stopping progress monitoring...');
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        // Reset stuck detection variables
        this.lastProgressUpdate = 0;
        this.lastProgressValue = 0;
        this.stuckCheckCount = 0;
        
        this.lastFileCount = 0;
        this.lastDirCount = 0;
    }
    
    updateProgressDisplay(progressData) {
        console.log('Updating progress display with:', progressData); // Debug log
        
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const progressDetails = document.getElementById('progressDetails');
        
        // Debug: Check if elements exist
        console.log('Elements found:', {
            progressFill: !!progressFill,
            progressText: !!progressText,
            progressDetails: !!progressDetails
        });
        
        if (progressFill) {
            const progressValue = progressData.progress || 0;
            progressFill.style.width = `${progressValue}%`;
            console.log(`Progress bar updated to: ${progressValue}%`);
        }
        
        if (progressText) {
            const progressValue = progressData.progress || 0;
            progressText.textContent = `${progressValue}%`;
            console.log(`Progress text updated to: ${progressValue}%`);
        }
        
        if (progressDetails) {
            const speed = this.formatSpeed(progressData.speed || 0);
            const eta = this.formatTime(progressData.eta || 0);
            const currentFile = progressData.current_file || 'Processing...';
            
            // Real-time file and directory counts
            const filesProgress = `${progressData.files_completed || 0}/${progressData.total_files || 0}`;
            const dirsProgress = `${progressData.dirs_completed || 0}/${progressData.total_dirs || 0}`;
            const sizeProgress = this.formatSize(progressData.transferred_size || 0) + ' / ' + this.formatSize(progressData.total_size || 0);
            
            // Failed counts
            const filesFailed = progressData.files_failed || 0;
            const dirsFailed = progressData.dirs_failed || 0;
            const hasFailures = filesFailed > 0 || dirsFailed > 0;
            
            console.log(`Files: ${filesProgress}, Dirs: ${dirsProgress}, Speed: ${speed}${hasFailures ? `, Failed: ${filesFailed + dirsFailed}` : ''}`);
            
            progressDetails.innerHTML = `
                <div class="progress-file" style="margin-bottom: 10px; font-weight: 500; color: rgba(255, 255, 255, 0.95);">
                    📁 ${currentFile}
                </div>
                <div class="progress-stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span>🚀 ${speed}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px;">
                        <span>⏱️ ${eta}</span>
                    </div>
                </div>
                <div class="progress-counts" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; font-size: 13px;">
                    <div style="display: flex; align-items: center; gap: 5px; color: rgba(255, 255, 255, 0.9);">
                        <span>📄 Files: ${filesProgress}${filesFailed > 0 ? ` (❌${filesFailed})` : ''}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 5px; color: rgba(255, 255, 255, 0.9);">
                        <span>📁 Folders: ${dirsProgress}${dirsFailed > 0 ? ` (❌${dirsFailed})` : ''}</span>
                    </div>
                </div>
                <div style="font-size: 12px; opacity: 0.8; text-align: center; color: rgba(255, 255, 255, 0.7);">
                    💾 ${sizeProgress}
                </div>
            `;
        }
    }
    
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    
    formatSpeed(bytesPerSecond) {
        if (bytesPerSecond === 0) return '0 B/s';
        
        const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
        let size = bytesPerSecond;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }
    
    formatTime(seconds) {
        if (seconds === 0 || !isFinite(seconds)) return '--';
        
        if (seconds < 60) {
            return `${Math.round(seconds)}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = Math.round(seconds % 60);
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    }

    handleKeyFileUpload(e) {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (max 10KB for SSH keys)
            if (file.size > 10240) {
                this.setLoginStatus('❌ SSH key file too large (max 10KB)', 'error');
                return;
            }
            
            // Validate file extension
            const validExtensions = ['.pem', '.key', '.ppk', '.pub', '.rsa', '.ed25519', '.ecdsa'];
            const fileName = file.name.toLowerCase();
            const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext)) || fileName.includes('id_');
            
            if (!hasValidExtension) {
                console.warn('SSH key file may have unusual extension:', fileName);
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const keyContent = e.target.result;
                
                // Basic SSH key format validation
                if (this.validateSSHKey(keyContent)) {
                    this.keyFileData = keyContent;
                    document.getElementById('keyFileNameText').textContent = file.name;
                    document.getElementById('keyFileName').style.display = 'block';
                    this.setLoginStatus(`✅ SSH key loaded: ${file.name}`, 'success');
                } else {
                    this.setLoginStatus('❌ Invalid SSH key format. Please check your key file.', 'error');
                    this.keyFileData = null;
                }
            };
            
            reader.onerror = () => {
                this.setLoginStatus('❌ Failed to read SSH key file', 'error');
            };
            
            reader.readAsText(file);
        }
    }
    
    validateSSHKey(keyContent) {
        if (!keyContent || typeof keyContent !== 'string') {
            return false;
        }
        
        // Check for common SSH key headers
        const sshKeyPatterns = [
            /-----BEGIN RSA PRIVATE KEY-----/,
            /-----BEGIN PRIVATE KEY-----/,
            /-----BEGIN OPENSSH PRIVATE KEY-----/,
            /-----BEGIN EC PRIVATE KEY-----/,
            /-----BEGIN DSA PRIVATE KEY-----/,
            /ssh-rsa\s+/,
            /ssh-ed25519\s+/,
            /ecdsa-sha2-/
        ];
        
        const hasValidHeader = sshKeyPatterns.some(pattern => pattern.test(keyContent));
        
        if (!hasValidHeader) {
            console.warn('SSH key does not match common formats');
            return false;
        }
        
        // Check for minimum key length
        if (keyContent.length < 100) {
            console.warn('SSH key seems too short');
            return false;
        }
        
        return true;
    }
    
    isRootDirectory(path) {
        return path === '/' || path === '';
    }
    
    showRootDirectoryWarning() {
        const userDir = this.osInfo ? this.osInfo.home_path : 'user directories';
        this.setLoginStatus(`⚠️ You are in the root directory. File operations (create, delete, rename) are restricted for safety. Please navigate to ${userDir} or other user directories.`, 'warning');
    }
    
    validateFileOperation(path, operation) {
        if (this.isRootDirectory(path)) {
            const userDir = this.osInfo ? this.osInfo.home_path : 'user directories';
            this.setLoginStatus(`❌ ${operation} not allowed in root directory. Please navigate to ${userDir} or other user directories.`, 'error');
            return false;
        }
        
        // Check for system directories
        const systemDirs = ['/bin', '/boot', '/dev', '/etc', '/lib', '/lib64', '/proc', '/root', '/sbin', '/sys', '/usr', '/var'];
        const normalizedPath = path.replace(/\/+/g, '/');
        
        for (const sysDir of systemDirs) {
            if (normalizedPath === sysDir || normalizedPath.startsWith(sysDir + '/')) {
                const userDir = this.osInfo ? this.osInfo.home_path : 'user directories';
                this.setLoginStatus(`❌ ${operation} not allowed in system directory: ${path}. Please navigate to ${userDir} or other user directories.`, 'error');
                return false;
            }
        }
        
        return true;
    }
    
    reinitializeSSHKeyUI() {
        console.log('Reinitializing SSH Key UI...');
        
        // Re-setup drag and drop
        this.setupDragAndDrop();
        
        // Re-setup key upload click handler
        const keyUploadArea = document.getElementById('keyUploadArea');
        const keyFileInput = document.getElementById('keyFile');
        
        if (keyUploadArea && keyFileInput) {
            console.log('SSH Key elements found, setting up click handler');
            
            // Add click handler for upload area
            keyUploadArea.addEventListener('click', () => {
                console.log('Key upload area clicked (reinitialized)');
                keyFileInput.click();
            });
            
            console.log('SSH Key UI reinitialized successfully');
        } else {
            console.error('Cannot reinitialize - SSH key elements not found:', { keyUploadArea, keyFileInput });
        }
    }

    handleKeyboardShortcuts(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'a':
                    e.preventDefault();
                    this.selectAllVisible();
                    break;
                case 'd':
                    e.preventDefault();
                    this.clearAllSelections();
                    break;
                case 'i':
                    e.preventDefault();
                    this.invertSelection();
                    break;
            }
        }
        
        if (e.key === 'Escape') {
            this.clearAllSelections();
        }
    }

    changeView(panel, view) {
        // Update view buttons
        document.querySelectorAll(`[data-panel="${panel}"]`).forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-panel="${panel}"][data-view="${view}"]`).classList.add('active');
        
        // Update file list class
        const fileList = document.getElementById(`${panel}FileList`);
        fileList.className = `file-list ${view}-view`;
        
        // Store current view
        this.currentView[panel] = view;
        
        // Re-render current directory to apply new view
        if (panel === 'local') {
            this.loadLocalDirectory(this.currentLocalPath);
        } else {
            this.loadRemoteDirectory(this.currentRemotePath);
        }
    }

    async loadSavedCredentials() {
        try {
            const response = await fetch('/api/saved-credentials');
            const credentials = await response.json();
            
            const section = document.getElementById('savedCredentialsSection');
            const list = document.getElementById('savedCredentialsList');
            
            if (credentials.length > 0) {
                section.style.display = 'block';
                list.innerHTML = '';
                
                credentials.forEach(cred => {
                    const item = document.createElement('div');
                    item.className = 'credential-item';
                    item.innerHTML = `
                        <div class="credential-name">${cred}</div>
                        <div class="credential-actions">
                            <button class="btn btn-small btn-success load-credential-btn" data-credential="${cred}">
                                📋 Load
                            </button>
                            <button class="btn btn-small btn-danger delete-credential-btn" data-credential="${cred}">
                                🗑️ Delete
                            </button>
                        </div>
                    `;
                    list.appendChild(item);
                });
                
                // Add event listeners to the newly created buttons
                list.querySelectorAll('.load-credential-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const credentialName = e.target.dataset.credential;
                        this.loadCredential(credentialName);
                    });
                });
                
                list.querySelectorAll('.delete-credential-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const credentialName = e.target.dataset.credential;
                        this.deleteCredential(credentialName);
                    });
                });
            } else {
                section.style.display = 'none';
            }
        } catch (error) {
            console.error('Failed to load saved credentials:', error);
        }
    }

    async loadCredential(credentialName) {
        try {
            const response = await fetch('/api/load-credential', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential_name: credentialName })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Load credential result:', result);
            
            if (result.success) {
                // Load basic connection info
                document.getElementById('serverHost').value = result.host || '';
                document.getElementById('serverPort').value = result.port || 22;
                document.getElementById('username').value = result.username || '';
                
                // Switch to appropriate auth method
                if (result.has_password) {
                    document.querySelector('[data-auth="password"]').click();
                    this.setLoginStatus('✅ Credentials loaded! Password authentication ready.', 'success');
                } else if (result.has_key) {
                    document.querySelector('[data-auth="key"]').click();
                    // Show that SSH key is saved
                    const keyFileName = document.getElementById('keyFileName');
                    const keyFileNameText = document.getElementById('keyFileNameText');
                    
                    if (keyFileName && keyFileNameText) {
                        keyFileName.style.display = 'block';
                        keyFileNameText.textContent = 'SSH Key (Saved)';
                    }
                    
                    // Safely load key data
                    if (result.credential && result.credential.key_data) {
                        this.keyFileData = result.credential.key_data;
                        this.setLoginStatus('✅ Credentials loaded! SSH key authentication ready.', 'success');
                    } else {
                        console.warn('SSH key credential found but key_data is missing');
                        this.setLoginStatus('⚠️ Credentials loaded but SSH key data is missing. Please re-upload your key.', 'warning');
                    }
                } else {
                    this.setLoginStatus('⚠️ Credentials loaded but no authentication method found.', 'warning');
                }
            } else {
                this.setLoginStatus(`❌ Failed to load credentials: ${result.error || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('Error loading credentials:', error);
            this.setLoginStatus(`❌ Error loading credentials: ${error.message}`, 'error');
        }
    }

    async deleteCredential(credentialName) {
        if (!confirm(`Are you sure you want to delete the saved connection "${credentialName}"?`)) {
            return;
        }
        
        try {
            const response = await fetch('/api/delete-credential', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential_name: credentialName })
            });
            
            const result = await response.json();
            if (result.success) {
                this.setLoginStatus('✅ Credential deleted successfully!', 'success');
                this.loadSavedCredentials(); // Refresh the list
            } else {
                this.setLoginStatus('❌ Failed to delete credential', 'error');
            }
        } catch (error) {
            this.setLoginStatus(`❌ Error deleting credential: ${error.message}`, 'error');
        }
    }

    setupNavigationButtons() {
        console.log('🔧 Setting up navigation buttons...');
        
        // Local navigation
        const localBackBtn = document.getElementById('localBackBtn');
        const localUpBtn = document.getElementById('localUpBtn');
        const localHomeBtn = document.getElementById('localHomeBtn');
        const localRootBtn = document.getElementById('localRootBtn');
        const localRefreshBtn = document.getElementById('localRefreshBtn');
        
        console.log('Local buttons found:', {
            back: !!localBackBtn,
            up: !!localUpBtn,
            home: !!localHomeBtn,
            root: !!localRootBtn,
            refresh: !!localRefreshBtn
        });
        
        if (localBackBtn) localBackBtn.addEventListener('click', () => this.navigateLocalBack());
        if (localUpBtn) localUpBtn.addEventListener('click', () => this.navigateLocalUp());
        if (localHomeBtn) {
            localHomeBtn.addEventListener('click', () => {
                // Home button should go to /home directory (not user home)
                const homePath = this.osInfo && this.osInfo.system === 'windows' ? 'C:\\Users' : '/home';
                console.log('🏠 Home button clicked - navigating to', homePath);
                this.navigateLocal(homePath);
            });
        }
        if (localRootBtn) {
            localRootBtn.addEventListener('click', () => {
                // Root button should go to OS-appropriate root
                let rootPath = '/';
                if (this.osInfo && this.osInfo.system === 'windows') {
                    rootPath = 'C:\\';
                }
                console.log('📁 Root button clicked - navigating to', rootPath);
                console.log('Current local path before navigation:', this.currentLocalPath);
                this.navigateLocal(rootPath);
                console.log('Navigation to root completed');
            });
        }
        if (localRefreshBtn) localRefreshBtn.addEventListener('click', () => this.refreshLocal());

        // Remote navigation
        const remoteBackBtn = document.getElementById('remoteBackBtn');
        const remoteUpBtn = document.getElementById('remoteUpBtn');
        const remoteHomeBtn = document.getElementById('remoteHomeBtn');
        const remoteRootBtn = document.getElementById('remoteRootBtn');
        const remoteRefreshBtn = document.getElementById('remoteRefreshBtn');
        
        if (remoteBackBtn) remoteBackBtn.addEventListener('click', () => this.navigateRemoteBack());
        if (remoteUpBtn) remoteUpBtn.addEventListener('click', () => this.navigateRemoteUp());
        if (remoteHomeBtn) remoteHomeBtn.addEventListener('click', () => this.navigateRemote('/home'));
        if (remoteRootBtn) remoteRootBtn.addEventListener('click', () => this.navigateRemote('/'));
        if (remoteRefreshBtn) remoteRefreshBtn.addEventListener('click', () => this.refreshRemote());
    }

    getConnectionData() {
        const host = document.getElementById('serverHost').value.trim();
        const port = document.getElementById('serverPort').value;
        const username = document.getElementById('username').value.trim();
        const saveCredentials = document.getElementById('saveCredentials').checked;
        
        if (!host || !username) {
            this.setLoginStatus('❌ Please fill in all required fields', 'error');
            return null;
        }

        const activeAuth = document.querySelector('.auth-tab.active').dataset.auth;
        const connectionData = {
            host,
            port: parseInt(port),
            username,
            save_credentials: saveCredentials
        };

        if (activeAuth === 'password') {
            const password = document.getElementById('password').value;
            if (!password) {
                this.setLoginStatus('❌ Please enter password', 'error');
                return null;
            }
            connectionData.password = password;
        } else {
            if (!this.keyFileData) {
                this.setLoginStatus('❌ Please upload SSH key file', 'error');
                return null;
            }
            connectionData.key_data = this.keyFileData;
        }

        return connectionData;
    }

    setLoginStatus(message, type) {
        const statusEl = document.getElementById('loginStatus');
        statusEl.textContent = message;
        statusEl.className = `status-message status-${type}`;
        statusEl.style.display = 'block';
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                statusEl.style.display = 'none';
            }, 3000);
        }
    }

    async testConnection() {
        const connectionData = this.getConnectionData();
        if (!connectionData) return;

        const testBtn = document.getElementById('testConnectionBtn');
        const testBtnText = document.getElementById('testBtnText');
        const testLoading = document.getElementById('testLoading');
        
        testBtn.disabled = true;
        testBtnText.style.display = 'none';
        testLoading.style.display = 'inline-block';
        this.setLoginStatus('🔍 Testing connection...', 'info');
        
        try {
            const response = await fetch('/api/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(connectionData)
            });
            
            const result = await response.json();
            if (result.success) {
                this.setLoginStatus(`✅ Connection successful! Home: ${result.home_dir}`, 'success');
            } else {
                this.setLoginStatus(`❌ Connection failed: ${result.error}`, 'error');
            }
        } catch (error) {
            this.setLoginStatus(`❌ Connection error: ${error.message}`, 'error');
        } finally {
            testBtn.disabled = false;
            testBtnText.style.display = 'inline';
            testLoading.style.display = 'none';
        }
    }

    async login() {
        const connectionData = this.getConnectionData();
        if (!connectionData) return;

        const loginBtn = document.getElementById('loginBtn');
        const loginBtnText = document.getElementById('loginBtnText');
        const loginLoading = document.getElementById('loginLoading');
        
        loginBtn.disabled = true;
        loginBtnText.style.display = 'none';
        loginLoading.style.display = 'inline-block';
        
        try {
            // Step 1: Test server availability first
            this.setLoginStatus('🔍 Checking server availability...', 'info');
            
            const testResponse = await fetch('/api/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    host: connectionData.host, 
                    port: parseInt(connectionData.port) 
                })
            });
            
            const testResult = await testResponse.json();
            if (!testResult.success) {
                let errorMsg = '';
                switch (testResult.error_type) {
                    case 'server_unreachable':
                        errorMsg = `❌ Server ${connectionData.host}:${connectionData.port} is not available.\n\nPlease check:\n• Server is running\n• Network connectivity\n• Firewall settings`;
                        break;
                    case 'timeout':
                        errorMsg = `⏱️ Connection timeout to ${connectionData.host}:${connectionData.port}.\n\nServer may be:\n• Overloaded\n• Behind firewall\n• Having network issues`;
                        break;
                    case 'dns_error':
                        errorMsg = `🌐 Cannot resolve hostname "${connectionData.host}".\n\nPlease check:\n• Server address spelling\n• DNS settings`;
                        break;
                    case 'ssh_unavailable':
                        errorMsg = `🔒 SSH service not available on ${connectionData.host}:${connectionData.port}.\n\nPlease check:\n• SSH service is running\n• Correct port number`;
                        break;
                    default:
                        errorMsg = `❌ Server check failed: ${testResult.error}`;
                }
                this.setLoginStatus(errorMsg, 'error');
                return;
            }
            
            // Step 2: Proceed with authentication
            this.setLoginStatus('🔐 Authenticating...', 'info');
            
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(connectionData)
            });
            
            const result = await response.json();
            if (result.success) {
                this.setLoginStatus('✅ Connected successfully!', 'success');
                
                // Update remote OS detection if available
                if (result.remote_os) {
                    this.updateRemoteOSDetection(result.remote_os);
                }
                
                setTimeout(() => {
                    this.showMainApp(connectionData);
                }, 1000);
            } else {
                // Enhanced error messages for login failures
                let errorMsg = '';
                if (result.error.includes('Authentication failed')) {
                    errorMsg = `🔐 Authentication failed.\n\nPlease check:\n• Username and password\n• SSH key file (if using key auth)\n• User account exists on server`;
                } else if (result.error.includes('Permission denied')) {
                    errorMsg = `🚫 Permission denied.\n\nPlease check:\n• Correct username\n• Account is not locked\n• SSH access is allowed`;
                } else {
                    errorMsg = `❌ Login failed: ${result.error}`;
                }
                this.setLoginStatus(errorMsg, 'error');
            }
        } catch (error) {
            this.setLoginStatus(`❌ Connection error: ${error.message}`, 'error');
        } finally {
            loginBtn.disabled = false;
            loginBtnText.style.display = 'inline';
            loginLoading.style.display = 'none';
        }
    }

    showMainApp(connectionData) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        document.getElementById('connectionDetails').textContent = `${connectionData.username}@${connectionData.host}:${connectionData.port}`;
        
        // Setup navigation buttons now that mainApp is visible
        this.setupNavigationButtons();
        
        // Load initial directories
        this.refreshLocal();
        this.refreshRemote();
    }

    async disconnect() {
        try {
            await fetch('/api/disconnect', { method: 'POST' });
        } catch (error) {
            console.error('Disconnect error:', error);
        }
        
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        this.setLoginStatus('', 'info');
        
        // Reset state
        this.selectedLocalFiles.clear();
        this.selectedRemoteFiles.clear();
        this.updateTransferButtons();
    }

    async refreshLocal() {
        await this.loadLocalDirectory(this.currentLocalPath);
    }

    async refreshRemote() {
        await this.loadRemoteDirectory(this.currentRemotePath);
    }

    async loadLocalDirectory(path) {
        console.log(`📂 loadLocalDirectory called with path: "${path}"`);
        try {
            const response = await fetch(`/api/list-local?path=${encodeURIComponent(path)}`);
            const result = await response.json();
            
            console.log(`📂 API response for path "${path}":`, result);
            
            if (result.error) {
                console.error('Error loading local directory:', result.error);
                return;
            }
            
            this.currentLocalPath = result.current_path;
            this.localFiles = result.items || []; // Update localFiles array
            this.updateBreadcrumb('local', this.currentLocalPath);
            this.renderFileList('local', result.items);
            this.updateFileCount('local', result.items.length);
        } catch (error) {
            console.error('Failed to load local directory:', error);
        }
    }

    async loadRemoteDirectory(path) {
        try {
            // Show root directory warning if in root
            if (this.isRootDirectory(path)) {
                this.showRootDirectoryWarning();
            }
            
            const response = await fetch(`/api/list-remote?path=${encodeURIComponent(path)}`);
            const result = await response.json();
            
            if (result.error) {
                console.error('Error loading remote directory:', result.error);
                return;
            }
            
            this.currentRemotePath = result.current_path;
            this.remoteFiles = result.items || []; // Update remoteFiles array
            this.updateBreadcrumb('remote', this.currentRemotePath);
            this.renderFileList('remote', result.items);
            this.updateFileCount('remote', result.items.length);
            
            // Show warning again if we ended up in root after navigation
            if (this.isRootDirectory(this.currentRemotePath)) {
                this.showRootDirectoryWarning();
            }
        } catch (error) {
            console.error('Failed to load remote directory:', error);
        }
    }

    updateFileCount(panel, count) {
        const countEl = document.getElementById(`${panel}FileCount`);
        countEl.textContent = `(${count} items)`;
    }

    renderFileList(panel, items) {
        const listEl = document.getElementById(`${panel}FileList`);
        const view = this.currentView[panel];
        
        listEl.innerHTML = '';
        listEl.className = `file-list ${view}-view`;

        items.forEach((item, index) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'file-item';
            itemEl.dataset.path = item.path;
            itemEl.dataset.isDirectory = item.is_directory;
            itemEl.dataset.index = index;
            itemEl.draggable = true;
            
            const icon = this.getFileIcon(item);
            const size = item.is_directory ? '' : this.formatFileSize(item.size);
            
            if (view === 'list') {
                itemEl.innerHTML = `
                    <div class="file-icon">${icon}</div>
                    <div class="file-info">
                        <div class="file-name">${item.name}</div>
                        <div class="file-details">
                            <span class="file-size">${size}</span>
                            <span class="file-date">${item.modified}</span>
                            <span class="file-permissions">${item.permissions}</span>
                        </div>
                    </div>
                `;
            } else {
                itemEl.innerHTML = `
                    <div class="file-icon">${icon}</div>
                    <div class="file-info">
                        <div class="file-name">${item.name}</div>
                        <div class="file-details">
                            <span class="file-size">${size}</span>
                            <span class="file-date">${item.modified.split(' ')[0]}</span>
                        </div>
                    </div>
                `;
            }

            // Enhanced drag and drop event listeners
            itemEl.addEventListener('dragstart', (e) => this.handleDragStart(e, panel, item));
            itemEl.addEventListener('dragend', (e) => this.handleDragEnd(e));

            // Click handlers with multiple selection support
            itemEl.addEventListener('click', (e) => {
                this.handleFileClick(e, panel, item, itemEl, index);
            });

            // Right-click for context menu (folder selection)
            itemEl.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (item.is_directory) {
                    this.toggleFileSelection(panel, item.path, itemEl);
                }
            });

            // Double-click for navigation
            itemEl.addEventListener('dblclick', (e) => {
                if (item.is_directory) {
                    if (panel === 'local') {
                        this.navigateLocal(item.path);
                    } else {
                        this.navigateRemote(item.path);
                    }
                }
            });

            listEl.appendChild(itemEl);
        });
        
        // Update selection display
        this.updateSelectionDisplay(panel);
    }

    handleDragStart(e, panel, item) {
        // Ensure draggedFiles is initialized
        if (!this.draggedFiles) {
            this.draggedFiles = [];
        }
        
        // Get all selected files or just this file if not selected
        const selectedSet = panel === 'local' ? this.selectedLocalFiles : this.selectedRemoteFiles;
        let filesToDrag = [];
        
        if (selectedSet.has(item.path)) {
            // Drag all selected files
            filesToDrag = Array.from(selectedSet);
        } else {
            // Drag just this file
            filesToDrag = [item.path];
        }
        
        // Store drag data
        this.draggedFiles = filesToDrag;
        const dragData = {
            sourcePanel: panel,
            files: filesToDrag
        };
        
        e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        e.dataTransfer.effectAllowed = 'copy';
        
        // Visual feedback
        e.target.classList.add('dragging');
        
        // Create drag preview
        this.createDragPreview(e, filesToDrag.length);
    }

    handleDragEnd(e) {
        // Ensure draggedFiles is initialized
        if (!this.draggedFiles) {
            this.draggedFiles = [];
        }
        
        e.target.classList.remove('dragging');
        this.removeDragPreview();
        
        // Clear dragged files
        this.draggedFiles = [];
    }

    createDragPreview(e, fileCount) {
        this.removeDragPreview(); // Remove any existing preview
        
        this.dragPreview = document.createElement('div');
        this.dragPreview.className = 'drag-preview';
        this.dragPreview.textContent = `${fileCount} file${fileCount > 1 ? 's' : ''}`;
        this.dragPreview.style.left = e.clientX + 10 + 'px';
        this.dragPreview.style.top = e.clientY + 10 + 'px';
        
        document.body.appendChild(this.dragPreview);
        
        // Update preview position on mouse move
        const updatePreview = (e) => {
            if (this.dragPreview) {
                this.dragPreview.style.left = e.clientX + 10 + 'px';
                this.dragPreview.style.top = e.clientY + 10 + 'px';
            }
        };
        
        document.addEventListener('dragover', updatePreview);
        
        // Clean up on drag end
        setTimeout(() => {
            document.removeEventListener('dragover', updatePreview);
        }, 100);
    }

    removeDragPreview() {
        if (this.dragPreview) {
            this.dragPreview.remove();
            this.dragPreview = null;
        }
    }

    // Continue with remaining methods...
    // (The rest of the methods remain the same as in the previous version)

    handleFileClick(e, panel, item, element, index) {
        const isCtrlClick = e.ctrlKey || e.metaKey;
        const isShiftClick = e.shiftKey;
        
        if (isShiftClick && this.lastClickedFile[panel] !== null) {
            // Shift+Click: Select range
            this.selectRange(panel, this.lastClickedFile[panel], index);
        } else if (isCtrlClick) {
            // Ctrl+Click: Toggle selection
            this.toggleFileSelection(panel, item.path, element);
        } else {
            // Regular click
            if (item.is_directory) {
                // Navigate into directory
                if (panel === 'local') {
                    this.navigateLocal(item.path);
                } else {
                    this.navigateRemote(item.path);
                }
            } else {
                // Clear other selections and select this file
                this.clearSelection(panel);
                this.toggleFileSelection(panel, item.path, element);
            }
        }
        
        this.lastClickedFile[panel] = index;
    }

    selectRange(panel, startIndex, endIndex) {
        const listEl = document.getElementById(`${panel}FileList`);
        const items = listEl.querySelectorAll('.file-item');
        
        const start = Math.min(startIndex, endIndex);
        const end = Math.max(startIndex, endIndex);
        
        for (let i = start; i <= end; i++) {
            if (items[i]) {
                const path = items[i].dataset.path;
                this.addToSelection(panel, path, items[i]);
            }
        }
        
        this.updateSelectionDisplay(panel);
        this.updateTransferButtons();
    }

    toggleFileSelection(panel, path, element) {
        const selectedSet = panel === 'local' ? this.selectedLocalFiles : this.selectedRemoteFiles;
        
        // If element is null, find it by path
        if (!element) {
            const listEl = document.getElementById(`${panel}FileList`);
            element = listEl.querySelector(`[data-path="${path}"]`);
        }
        
        if (!element) {
            console.warn(`Element not found for path: ${path}`);
            return;
        }
        
        if (selectedSet.has(path)) {
            selectedSet.delete(path);
            element.classList.remove('selected');
        } else {
            selectedSet.add(path);
            element.classList.add('selected');
        }
        
        this.updateSelectionDisplay(panel);
        this.updateTransferButtons();
    }

    addToSelection(panel, path, element) {
        const selectedSet = panel === 'local' ? this.selectedLocalFiles : this.selectedRemoteFiles;
        selectedSet.add(path);
        element.classList.add('selected');
    }

    clearSelection(panel) {
        const selectedSet = panel === 'local' ? this.selectedLocalFiles : this.selectedRemoteFiles;
        const listEl = document.getElementById(`${panel}FileList`);
        
        selectedSet.clear();
        listEl.querySelectorAll('.file-item.selected').forEach(el => {
            el.classList.remove('selected');
        });
        
        this.updateSelectionDisplay(panel);
        this.updateTransferButtons();
    }

    selectAllLocal() {
        this.selectAll('local');
    }

    selectAllRemote() {
        this.selectAll('remote');
    }

    selectAll(panel) {
        const listEl = document.getElementById(`${panel}FileList`);
        const items = listEl.querySelectorAll('.file-item');
        
        items.forEach(item => {
            const path = item.dataset.path;
            this.addToSelection(panel, path, item);
        });
        
        this.updateSelectionDisplay(panel);
        this.updateTransferButtons();
    }

    clearSelectionLocal() {
        this.clearSelection('local');
    }

    clearSelectionRemote() {
        this.clearSelection('remote');
    }

    invertSelectionLocal() {
        this.invertSelectionPanel('local');
    }

    invertSelectionRemote() {
        this.invertSelectionPanel('remote');
    }

    invertSelectionPanel(panel) {
        const listEl = document.getElementById(`${panel}FileList`);
        const items = listEl.querySelectorAll('.file-item');
        const selectedSet = panel === 'local' ? this.selectedLocalFiles : this.selectedRemoteFiles;
        
        items.forEach(item => {
            const path = item.dataset.path;
            if (selectedSet.has(path)) {
                selectedSet.delete(path);
                item.classList.remove('selected');
            } else {
                selectedSet.add(path);
                item.classList.add('selected');
            }
        });
        
        this.updateSelectionDisplay(panel);
        this.updateTransferButtons();
    }

    async deleteSelectedLocal() {
        if (this.selectedLocalFiles.size === 0) {
            this.showNotification('⚠️ Please select files to delete', 'warning');
            return;
        }

        const fileList = Array.from(this.selectedLocalFiles);
        const items = fileList.map(path => {
            const file = this.localFiles && Array.isArray(this.localFiles) 
                ? this.localFiles.find(f => f.path === path) 
                : null;
            return {
                path: path,
                name: file ? file.name : path.split('/').pop(),
                isDirectory: file ? file.isDirectory : false,
                type: file ? (file.isDirectory ? 'folder' : 'file') : 'file'
            };
        });

        this.showDeleteConfirmation({
            title: `Delete ${fileList.length} Item${fileList.length > 1 ? 's' : ''}`,
            subtitle: 'This action cannot be undone',
            icon: '🗑️',
            message: `Are you sure you want to permanently delete ${fileList.length} selected item${fileList.length > 1 ? 's' : ''}?`,
            items: items,
            onConfirm: async () => {
                await this.performDeleteLocal(fileList);
            }
        });
    }

    async performDeleteLocal(fileList) {
        try {
            const response = await fetch('/api/delete-local-files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: fileList })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`✅ Successfully deleted ${fileList.length} item${fileList.length > 1 ? 's' : ''}`, 'success');
                
                // Clear selection and refresh
                this.clearSelectionLocal();
                await this.loadLocalDirectory(this.currentLocalPath);
            } else {
                throw new Error(result.error || 'Delete operation failed');
            }
        } catch (error) {
            console.error('Delete local error:', error);
            throw new Error(`Failed to delete items: ${error.message}`);
        }
    }

    async deleteSelectedRemote() {
        if (this.selectedRemoteFiles.size === 0) {
            this.showNotification('⚠️ Please select files to delete', 'warning');
            return;
        }

        const fileList = Array.from(this.selectedRemoteFiles);
        const items = fileList.map(path => {
            const file = this.remoteFiles && Array.isArray(this.remoteFiles) 
                ? this.remoteFiles.find(f => f.path === path) 
                : null;
            return {
                path: path,
                name: file ? file.name : path.split('/').pop(),
                isDirectory: file ? file.isDirectory : false,
                type: file ? (file.isDirectory ? 'folder' : 'file') : 'file'
            };
        });

        this.showDeleteConfirmation({
            title: `Delete ${fileList.length} Item${fileList.length > 1 ? 's' : ''}`,
            subtitle: 'This action cannot be undone',
            icon: '🗑️',
            message: `Are you sure you want to permanently delete ${fileList.length} selected item${fileList.length > 1 ? 's' : ''} from remote server?`,
            items: items,
            onConfirm: async () => {
                await this.performDeleteRemote(fileList);
            }
        });
    }

    async performDeleteRemote(fileList) {
        try {
            const response = await fetch('/api/delete-remote-files', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: fileList })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`✅ Successfully deleted ${fileList.length} item${fileList.length > 1 ? 's' : ''}`, 'success');
                
                // Clear selection and refresh
                this.clearSelectionRemote();
                await this.loadRemoteDirectory(this.currentRemotePath);
            } else {
                throw new Error(result.error || 'Delete operation failed');
            }
        } catch (error) {
            console.error('Delete remote error:', error);
            throw new Error(`Failed to delete items: ${error.message}`);
        }
    }

    getSelectedItemsInfo(panel) {
        const selectedSet = panel === 'local' ? this.selectedLocalFiles : this.selectedRemoteFiles;
        const listEl = document.getElementById(`${panel}FileList`);
        const items = [];

        selectedSet.forEach(path => {
            // Try to find element by path
            const element = listEl.querySelector(`[data-path="${path}"]`);
            if (element && element.dataset) {
                const isDirectory = element.dataset.isDirectory === 'true';
                const name = path.split('/').pop();
                items.push({
                    path: path,
                    name: name,
                    type: isDirectory ? 'folder' : 'file',
                    isDirectory: isDirectory
                });
            } else {
                // Fallback: create item info from path only
                const name = path.split('/').pop();
                items.push({
                    path: path,
                    name: name,
                    type: 'item', // Generic type
                    isDirectory: false // Default to file
                });
            }
        });

        return items;
    }

    async createNewFolder(panel) {
        const currentPath = panel === 'local' ? this.currentLocalPath : this.currentRemotePath;
        const panelName = panel === 'local' ? 'Local' : 'Remote';

        this.showInlineEdit({
            title: 'Create New Folder',
            subtitle: `Create a new folder in ${panelName} (${this.shortenPath(currentPath)})`,
            icon: '📁',
            placeholder: 'Enter folder name...',
            currentValue: '',
            validator: (folderName) => {
                const trimmedName = folderName ? folderName.trim() : '';
                
                if (!trimmedName || trimmedName === '') {
                    return 'Folder name cannot be empty';
                }
                
                // Check for invalid characters
                const invalidChars = panel === 'local' && this.osInfo?.system === 'windows' 
                    ? /[<>:"|?*\x00-\x1f]/
                    : /[\x00]/;
                    
                if (invalidChars.test(trimmedName)) {
                    return 'Folder name contains invalid characters';
                }
                
                if (trimmedName.length > 255) {
                    return 'Folder name is too long (max 255 characters)';
                }
                
                // Check for reserved names on Windows
                if (panel === 'local' && this.osInfo?.system === 'windows') {
                    const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
                    if (reservedNames.includes(trimmedName.toUpperCase())) {
                        return 'This name is reserved by Windows';
                    }
                }
                
                return true;
            },
            onConfirm: async (folderName) => {
                await this.performCreateFolder(panel, folderName, currentPath);
            }
        });
    }

    async performCreateFolder(panel, folderName, currentPath) {
        const separator = panel === 'local' && this.osInfo?.system === 'windows' ? '\\' : '/';
        
        let fullPath;
        if (currentPath === '/' || currentPath === 'C:\\') {
            fullPath = currentPath + folderName;
        } else if (currentPath.endsWith(separator)) {
            fullPath = currentPath + folderName;
        } else {
            fullPath = currentPath + separator + folderName;
        }

        try {
            const endpoint = panel === 'local' ? '/api/create-local-folder' : '/api/create-remote-folder';
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ path: fullPath })
            });

            const result = await response.json();
            
            if (result && result.success === true) {
                this.showNotification(`✅ Successfully created folder "${folderName}"`, 'success');
                
                // Refresh directory
                if (panel === 'local') {
                    this.loadLocalDirectory(this.currentLocalPath);
                } else {
                    this.loadRemoteDirectory(this.currentRemotePath);
                }
            } else {
                throw new Error(result.error || 'Create folder operation failed');
            }
        } catch (error) {
            console.error('Create folder error:', error);
            throw new Error(`Failed to create folder: ${error.message}`);
        }
    }

    async renameSelected(panel) {
        const selectedFiles = panel === 'local' ? this.selectedLocalFiles : this.selectedRemoteFiles;
        
        if (selectedFiles.size !== 1) {
            this.showNotification('⚠️ Please select exactly one file or folder to rename', 'warning');
            return;
        }

        const oldPath = Array.from(selectedFiles)[0];
        const pathParts = oldPath.split(panel === 'local' && this.osInfo?.system === 'windows' ? '\\' : '/');
        const oldName = pathParts.pop();
        const parentPath = pathParts.join(panel === 'local' && this.osInfo?.system === 'windows' ? '\\' : '/');

        console.log('🔍 Rename - oldPath:', oldPath);
        console.log('🔍 Rename - pathParts:', pathParts);
        console.log('🔍 Rename - oldName:', oldName);
        console.log('🔍 Rename - parentPath:', parentPath);

        // Determine if it's a file or folder
        const isFolder = this.isDirectory(oldPath, panel);
        const itemType = isFolder ? 'folder' : 'file';
        const icon = isFolder ? '📁' : '📄';

        console.log('🔍 Rename - calling showInlineEdit with currentValue:', oldName);

        this.showInlineEdit({
            title: `Rename ${itemType}`,
            subtitle: `Enter a new name for "${oldName}"`,
            icon: icon,
            placeholder: 'Enter new name...',
            currentValue: oldName,
            validator: (newName) => {
                if (!newName || newName.trim() === '') {
                    return 'Name cannot be empty';
                }
                
                if (newName === oldName) {
                    return 'New name must be different from current name';
                }
                
                // Check for invalid characters
                const invalidChars = panel === 'local' && this.osInfo?.system === 'windows' 
                    ? /[<>:"|?*\x00-\x1f]/
                    : /[\x00]/;
                    
                if (invalidChars.test(newName)) {
                    return 'Name contains invalid characters';
                }
                
                if (newName.length > 255) {
                    return 'Name is too long (max 255 characters)';
                }
                
                return true;
            },
            onConfirm: async (newName) => {
                await this.performRename(panel, oldPath, newName, parentPath);
            }
        });
    }

    async performRename(panel, oldPath, newName, parentPath) {
        const separator = panel === 'local' && this.osInfo?.system === 'windows' ? '\\' : '/';
        const newPath = parentPath ? `${parentPath}${separator}${newName}` : newName;

        try {
            const endpoint = panel === 'local' ? '/api/rename-local-item' : '/api/rename-remote-item';
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    old_path: oldPath,
                    new_path: newPath
                })
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`✅ Successfully renamed to "${newName}"`, 'success');
                
                // Clear selection and refresh
                if (panel === 'local') {
                    this.clearSelectionLocal();
                    await this.loadLocalDirectory(this.currentLocalPath);
                } else {
                    this.clearSelectionRemote();
                    await this.loadRemoteDirectory(this.currentRemotePath);
                }
            } else {
                throw new Error(result.error || 'Rename operation failed');
            }
        } catch (error) {
            console.error('Rename error:', error);
            throw new Error(`Failed to rename: ${error.message}`);
        }
    }

    showNotification(message, type) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 10000;
                max-width: 400px;
                word-wrap: break-word;
                transition: all 0.3s ease;
            `;
            document.body.appendChild(notification);
        }

        // Set message and styling based on type
        notification.textContent = message;
        if (type === 'success') {
            notification.style.background = 'rgba(40, 167, 69, 0.9)';
        } else if (type === 'error') {
            notification.style.background = 'rgba(220, 53, 69, 0.9)';
        } else {
            notification.style.background = 'rgba(0, 123, 255, 0.9)';
        }

        // Show notification
        notification.style.display = 'block';
        notification.style.opacity = '1';

        // Auto-hide after 4 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 4000);
    }

    selectAllVisible() {
        this.selectAll('local');
        this.selectAll('remote');
    }

    clearAllSelections() {
        this.clearSelection('local');
        this.clearSelection('remote');
    }

    invertSelection() {
        ['local', 'remote'].forEach(panel => {
            const listEl = document.getElementById(`${panel}FileList`);
            const items = listEl.querySelectorAll('.file-item');
            const selectedSet = panel === 'local' ? this.selectedLocalFiles : this.selectedRemoteFiles;
            
            items.forEach(item => {
                const path = item.dataset.path;
                if (selectedSet.has(path)) {
                    selectedSet.delete(path);
                    item.classList.remove('selected');
                } else {
                    selectedSet.add(path);
                    item.classList.add('selected');
                }
            });
            
            this.updateSelectionDisplay(panel);
        });
        
        this.updateTransferButtons();
    }

    updateSelectionDisplay(panel) {
        const selectedSet = panel === 'local' ? this.selectedLocalFiles : this.selectedRemoteFiles;
        const selectionInfo = document.getElementById(`${panel}SelectionInfo`);
        const selectionCount = document.getElementById(`${panel}SelectionCount`);
        
        // Only update if elements exist
        if (selectionInfo && selectionCount) {
            if (selectedSet.size > 0) {
                selectionInfo.classList.add('show');
                selectionCount.textContent = `${selectedSet.size} item${selectedSet.size > 1 ? 's' : ''} selected`;
            } else {
                selectionInfo.classList.remove('show');
            }
        }
        
        // Update transfer buttons
        this.updateTransferButtons();
    }

    updateTransferButtons() {
        const downloadBtn = document.getElementById('downloadBtn');
        const uploadBtn = document.getElementById('uploadBtn');
        const downloadCount = document.getElementById('downloadCount');
        const uploadCount = document.getElementById('uploadCount');
        
        if (downloadBtn) {
            downloadBtn.disabled = this.selectedRemoteFiles.size === 0;
        }
        
        if (uploadBtn) {
            uploadBtn.disabled = this.selectedLocalFiles.size === 0;
        }
        
        // Update count if elements exist
        if (downloadCount) {
            downloadCount.textContent = this.selectedRemoteFiles.size;
        }
        
        if (uploadCount) {
            uploadCount.textContent = this.selectedLocalFiles.size;
        }
    }

    getFileIcon(item) {
        if (item.is_directory) return '📁';
        
        const ext = item.name.split('.').pop().toLowerCase();
        const iconMap = {
            // Documents
            'txt': '📄', 'doc': '📄', 'docx': '📄', 'pdf': '📄', 'rtf': '📄',
            'odt': '📄', 'pages': '📄',
            
            // Images
            'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'svg': '🖼️',
            'bmp': '🖼️', 'tiff': '🖼️', 'webp': '🖼️', 'ico': '🖼️',
            
            // Audio
            'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'ogg': '🎵', 'aac': '🎵',
            'm4a': '🎵', 'wma': '🎵',
            
            // Video
            'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'mkv': '🎬', 'wmv': '🎬',
            'flv': '🎬', 'webm': '🎬', 'm4v': '🎬',
            
            // Archives
            'zip': '📦', 'rar': '📦', 'tar': '📦', '7z': '📦', 'gz': '📦',
            'bz2': '📦', 'xz': '📦', 'deb': '📦', 'rpm': '📦',
            
            // Code
            'js': '💻', 'html': '💻', 'css': '💻', 'py': '💻', 'java': '💻',
            'cpp': '💻', 'c': '💻', 'h': '💻', 'php': '💻', 'rb': '💻',
            'go': '💻', 'rs': '💻', 'swift': '💻', 'kt': '💻',
            
            // Data
            'json': '📝', 'xml': '📝', 'csv': '📝', 'log': '📝', 'yml': '📝',
            'yaml': '📝', 'toml': '📝', 'ini': '📝', 'conf': '📝',
            
            // Executables
            'exe': '⚙️', 'msi': '⚙️', 'deb': '⚙️', 'rpm': '⚙️', 'dmg': '⚙️',
            'app': '⚙️', 'appimage': '⚙️'
        };
        
        return iconMap[ext] || '📄';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Navigation methods
    navigateLocal(path) {
        console.log(`🧭 navigateLocal called with path: ${path}`);
        this.updateActivity(); // Update activity for keep-alive
        this.addToHistory('local', path);
        this.loadLocalDirectory(path);
        this.clearSelection('local');
    }

    navigateRemote(path) {
        this.addToHistory('remote', path);
        this.loadRemoteDirectory(path);
        this.clearSelection('remote');
    }

    addToHistory(panel, path) {
        if (panel === 'local') {
            this.localHistory = this.localHistory.slice(0, this.localHistoryIndex + 1);
            this.localHistory.push(path);
            this.localHistoryIndex = this.localHistory.length - 1;
        } else {
            this.remoteHistory = this.remoteHistory.slice(0, this.remoteHistoryIndex + 1);
            this.remoteHistory.push(path);
            this.remoteHistoryIndex = this.remoteHistory.length - 1;
        }
    }

    navigateLocalBack() {
        if (this.localHistoryIndex > 0) {
            this.localHistoryIndex--;
            this.loadLocalDirectory(this.localHistory[this.localHistoryIndex]);
            this.clearSelection('local');
        }
    }

    navigateRemoteBack() {
        if (this.remoteHistoryIndex > 0) {
            this.remoteHistoryIndex--;
            this.loadRemoteDirectory(this.remoteHistory[this.remoteHistoryIndex]);
            this.clearSelection('remote');
        }
    }

    navigateLocalUp() {
        const parentPath = this.getParentPath(this.currentLocalPath);
        if (parentPath !== this.currentLocalPath) {
            this.navigateLocal(parentPath);
        }
    }

    navigateRemoteUp() {
        const parentPath = this.getParentPath(this.currentRemotePath);
        if (parentPath !== this.currentRemotePath) {
            this.navigateRemote(parentPath);
        }
    }

    getParentPath(path) {
        if (path === '/') return '/';
        return path.substring(0, path.lastIndexOf('/')) || '/';
    }

    // Transfer methods
    async downloadSelected() {
        const selectedFiles = Array.from(this.selectedRemoteFiles);
        if (selectedFiles.length === 0) return;

        this.showProgressModal('⬇️', `Downloading ${selectedFiles.length} file(s)...`);
        this.transferInProgress = true;
        
        // Start progress monitoring
        this.startProgressMonitoring();
        
        try {
            const response = await fetch('/api/transfer-multiple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: selectedFiles,
                    direction: 'download',
                    source_base: this.currentRemotePath,
                    dest_base: this.currentLocalPath
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Check for partial failures
                const failedFiles = result.results ? result.results.filter(r => !r.success) : [];
                
                if (failedFiles.length > 0) {
                    const successCount = selectedFiles.length - failedFiles.length;
                    this.showCompletionModal(
                        '⚠️ Download Completed with Issues',
                        `Partial success: ${successCount}/${selectedFiles.length} files downloaded successfully.\n${failedFiles.length} files failed.`,
                        'warning'
                    );
                } else {
                    this.showCompletionModal(
                        '✅ Download Completed Successfully',
                        `Successfully downloaded ${selectedFiles.length} file(s) to local directory.`,
                        'success'
                    );
                }
                
                setTimeout(() => {
                    this.selectedRemoteFiles.clear();
                    this.refreshLocal();
                    this.updateTransferButtons();
                    this.updateSelectionDisplay('remote');
                }, 1000);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Download error:', error);
            this.showCompletionModal(
                '❌ Download Failed',
                `Download failed: ${error.message}`,
                'error'
            );
        } finally {
            this.transferInProgress = false;
            this.stopProgressMonitoring();
        }
    }

    async uploadSelected() {
        const selectedFiles = Array.from(this.selectedLocalFiles);
        if (selectedFiles.length === 0) return;

        this.showProgressModal('⬆️', `Uploading ${selectedFiles.length} file(s)...`);
        this.transferInProgress = true;
        
        // Start progress monitoring
        this.startProgressMonitoring();
        
        try {
            const response = await fetch('/api/transfer-multiple', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files: selectedFiles,
                    direction: 'upload',
                    source_base: this.currentLocalPath,
                    dest_base: this.currentRemotePath
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Check for partial failures
                const failedFiles = result.results ? result.results.filter(r => !r.success) : [];
                
                if (failedFiles.length > 0) {
                    const successCount = selectedFiles.length - failedFiles.length;
                    this.showCompletionModal(
                        '⚠️ Upload Completed with Issues',
                        `Partial success: ${successCount}/${selectedFiles.length} files uploaded successfully.\n${failedFiles.length} files failed.`,
                        'warning'
                    );
                } else {
                    this.showCompletionModal(
                        '✅ Upload Completed Successfully',
                        `Successfully uploaded ${selectedFiles.length} file(s) to remote directory.`,
                        'success'
                    );
                }
                
                setTimeout(() => {
                    this.selectedLocalFiles.clear();
                    this.refreshRemote();
                    this.updateTransferButtons();
                    this.updateSelectionDisplay('local');
                }, 1000);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showCompletionModal(
                '❌ Upload Failed',
                `Upload failed: ${error.message}`,
                'error'
            );
        } finally {
            this.transferInProgress = false;
            this.stopProgressMonitoring();
        }
    }

    // Modal methods
    showProgressModal(icon, message) {
        const modal = document.getElementById('progressModal');
        const iconEl = document.getElementById('progressIcon');
        const textEl = document.getElementById('progressText');
        const detailsEl = document.getElementById('progressDetails');
        const fillEl = document.getElementById('progressFill');
        
        if (modal) modal.style.display = 'flex';
        if (iconEl) iconEl.textContent = icon;
        if (textEl) textEl.textContent = 'Preparing transfer...';
        if (fillEl) fillEl.style.width = '0%';
        
        // Show initial message in details
        if (detailsEl) {
            detailsEl.innerHTML = `
                <div style="margin-bottom: 8px; font-weight: 500; color: rgba(255, 255, 255, 0.9);">
                    ${message}
                </div>
                <div style="font-size: 12px; opacity: 0.7;">
                    Calculating transfer details...
                </div>
            `;
        }
        
        this.updateProgress(0);
    }

    hideProgressModal() {
        document.getElementById('progressModal').style.display = 'none';
    }

    updateProgress(percentage) {
        document.getElementById('progressFill').style.width = percentage + '%';
        document.getElementById('progressText').textContent = `Progress: ${Math.round(percentage)}%`;
    }

    async cancelTransfer() {
        if (this.transferInProgress) {
            try {
                console.log('🛑 Cancelling transfer...');
                
                // Call the cancel API
                const response = await fetch('/api/cancel-transfer', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Transfer cancelled successfully');
                    this.transferInProgress = false;
                    this.setTransferActive(false);
                    this.stopProgressMonitoring();
                    this.hideProgressModal();
                    
                    // Show cancellation message
                    this.showCompletionModal(
                        '🛑 Transfer Cancelled',
                        'The file transfer has been cancelled successfully.',
                        'warning'
                    );
                } else {
                    console.error('❌ Failed to cancel transfer:', result.error);
                    this.showCompletionModal(
                        '❌ Cancel Failed',
                        `Failed to cancel transfer: ${result.error}`,
                        'error'
                    );
                }
            } catch (error) {
                console.error('❌ Error cancelling transfer:', error);
                this.showCompletionModal(
                    '❌ Cancel Error',
                    `Error cancelling transfer: ${error.message}`,
                    'error'
                );
            }
        }
    }

    showConfirmModal(title, message, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').style.display = 'flex';
        this.confirmCallback = callback;
    }

    hideConfirmModal() {
        document.getElementById('confirmModal').style.display = 'none';
        this.confirmCallback = null;
    }

    confirmAction() {
        if (this.confirmCallback) {
            this.confirmCallback();
        }
        this.hideConfirmModal();
    }
}

// Global app instance
let app;

// Initialize the enhanced application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    
    // Add a small delay to ensure all elements are rendered
    setTimeout(() => {
        app = new EnhancedSCPWebAppV2();
        
        // Load initial local directory (OS-specific default)
        // Wait a bit for OS detection to complete
        setTimeout(() => {
            const defaultPath = app.osInfo ? app.osInfo.default_path : '/home';
            app.loadLocalDirectory(defaultPath);
        }, 100);
        
        // Additional SSH key UI debugging
        setTimeout(() => {
            console.log('=== SSH Key UI Debug Check ===');
            const keyUploadArea = document.getElementById('keyUploadArea');
            const keyAuth = document.getElementById('keyAuth');
            const authTabs = document.querySelectorAll('.auth-tab');
            
            console.log('keyUploadArea found:', !!keyUploadArea);
            console.log('keyAuth found:', !!keyAuth);
            console.log('Auth tabs found:', authTabs.length);
            
            if (keyAuth) {
                console.log('keyAuth display style:', keyAuth.style.display);
                console.log('keyAuth computed display:', window.getComputedStyle(keyAuth).display);
            }
            
            // Test SSH key tab click
            const sshKeyTab = document.querySelector('.auth-tab[data-auth="key"]');
            if (sshKeyTab) {
                console.log('SSH Key tab found, adding test click listener');
                sshKeyTab.addEventListener('click', () => {
                    console.log('SSH Key tab clicked - should show key upload area');
                });
            }
        }, 500);
    }, 100);
});
