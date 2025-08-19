# 📚 Git Documentation - MacOS to Linux SCP

## 🎯 Repository Overview

This document provides comprehensive Git setup, workflow, and management instructions for the **MacOS to Linux SCP** project.

### 📊 Repository Statistics
- **Project Name:** MacOS to Linux Servers SCP
- **Version:** 2.0 (with Transfer Cancellation)
- **Language:** Python (Flask) + JavaScript
- **License:** MIT
- **Last Updated:** August 19, 2025

---

## 🚀 Initial Git Setup

### 1. Initialize Repository
```bash
# Navigate to project directory
cd macos-to-linux-servers-scp

# Initialize Git repository
git init

# Add remote origin (replace with your repository URL)
git remote add origin https://github.com/yourusername/macos-to-linux-servers-scp.git
```

### 2. Create .gitignore File
```bash
# Create comprehensive .gitignore
cat > .gitignore << 'EOF'
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg
MANIFEST

# Virtual Environment
venv/
env/
ENV/
env.bak/
venv.bak/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db

# Project Specific
*.log
*.enc
encryption.key
saved_credentials.enc
temp/
uploads/
downloads/

# Node modules (if any)
node_modules/

# Backup files
*.bak
*.backup
*.old

# Test files
test_*.py
*_test.py
EOF
```

### 3. Initial Commit
```bash
# Add all files
git add .

# Create initial commit
git commit -m "🎉 Initial commit: MacOS to Linux SCP v2.0

✨ Features:
- Web-based SCP file transfer interface
- Dual authentication (password/SSH key)
- Real-time progress monitoring
- Transfer cancellation system
- Stuck transfer detection
- Cross-platform compatibility

🔧 Tech Stack:
- Backend: Python Flask + Paramiko
- Frontend: Vanilla JavaScript + Modern CSS
- Security: Fernet encryption + SSH protocol"

# Push to remote repository
git push -u origin main
```

---

## 🌿 Branching Strategy

### Branch Structure
```
main (production-ready)
├── develop (integration branch)
├── feature/transfer-cancellation
├── feature/ui-improvements
├── hotfix/security-patch
└── release/v2.0
```

### Creating Branches
```bash
# Create and switch to development branch
git checkout -b develop

# Create feature branch
git checkout -b feature/transfer-cancellation

# Create hotfix branch
git checkout -b hotfix/progress-monitoring-fix

# Create release branch
git checkout -b release/v2.1
```

---

## 📝 Commit Message Convention

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **✨ feat:** New feature
- **🐛 fix:** Bug fix
- **📚 docs:** Documentation changes
- **🎨 style:** Code style changes (formatting, etc.)
- **♻️ refactor:** Code refactoring
- **⚡ perf:** Performance improvements
- **✅ test:** Adding or updating tests
- **🔧 chore:** Maintenance tasks

### Examples
```bash
# Feature commit
git commit -m "✨ feat(transfer): Add cancellation system

- Implement /api/cancel-transfer endpoint
- Add cancel button to progress modal
- Include stuck transfer detection
- Update progress monitoring with timeout handling

Fixes #123"

# Bug fix commit
git commit -m "🐛 fix(progress): Resolve stuck transfer at 10.3%

- Add cancellation checks in progress callbacks
- Implement proper cleanup mechanisms
- Fix infinite progress polling loop

Closes #456"

# Documentation commit
git commit -m "📚 docs: Add comprehensive project documentation

- Create HTML documentation with features overview
- Add Git workflow and branching strategy
- Include troubleshooting and deployment guides"
```

---

## 🔄 Development Workflow

### 1. Feature Development
```bash
# Start new feature
git checkout develop
git pull origin develop
git checkout -b feature/new-feature-name

# Make changes and commit
git add .
git commit -m "✨ feat: Add new feature description"

# Push feature branch
git push origin feature/new-feature-name

# Create Pull Request to develop branch
```

### 2. Bug Fixes
```bash
# Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/bug-description

# Fix the bug and commit
git add .
git commit -m "🐛 fix: Resolve bug description"

# Push and create PR to main
git push origin hotfix/bug-description
```

### 3. Release Process
```bash
# Create release branch from develop
git checkout develop
git pull origin develop
git checkout -b release/v2.1

# Update version numbers and changelog
# Test thoroughly

# Merge to main
git checkout main
git merge release/v2.1
git tag -a v2.1 -m "Release version 2.1"

# Merge back to develop
git checkout develop
git merge release/v2.1

# Push everything
git push origin main develop --tags
```

---

## 📋 Project File Structure for Git

```
macos-to-linux-servers-scp/
├── .git/                           # Git repository data
├── .gitignore                      # Git ignore rules
├── README.md                       # Project overview
├── LICENSE                         # MIT license
├── requirements.txt                # Python dependencies
├── app_enhanced.py                 # Main Flask application
├── static/
│   └── enhanced_methods_v2.js      # Frontend JavaScript
├── templates/
│   └── index_enhanced_v2.html      # Main UI template
├── start.sh                        # Linux/macOS startup script
├── start.bat                       # Windows batch startup
├── start.ps1                       # Windows PowerShell startup
├── test_cancel_transfer.py         # Test script
├── PROJECT_DOCUMENTATION.html     # Comprehensive docs
├── GIT_DOCUMENTATION.md           # This file
├── CHANGELOG.md                   # Version history
├── CONTRIBUTING.md                # Contribution guidelines
└── docs/                          # Additional documentation
    ├── API.md                     # API documentation
    ├── DEPLOYMENT.md              # Deployment guide
    └── TROUBLESHOOTING.md         # Common issues
```

---

## 🏷️ Tagging Strategy

### Semantic Versioning
```
MAJOR.MINOR.PATCH
```

- **MAJOR:** Breaking changes
- **MINOR:** New features (backward compatible)
- **PATCH:** Bug fixes (backward compatible)

### Creating Tags
```bash
# Create annotated tag
git tag -a v2.0.0 -m "Release v2.0.0: Transfer Cancellation System

✨ New Features:
- Transfer cancellation functionality
- Stuck transfer detection
- Enhanced progress monitoring
- Improved error handling

🐛 Bug Fixes:
- Fixed infinite progress polling
- Resolved stuck transfer issues
- Better cleanup mechanisms"

# Push tags
git push origin --tags

# List all tags
git tag -l

# Show tag details
git show v2.0.0
```

---

## 🔍 Git Workflow Commands

### Daily Development
```bash
# Check status
git status

# View changes
git diff
git diff --staged

# Add changes
git add .                    # Add all changes
git add file.py             # Add specific file
git add -p                  # Interactive staging

# Commit changes
git commit -m "commit message"
git commit --amend          # Amend last commit

# Push changes
git push origin branch-name

# Pull latest changes
git pull origin main
```

### Branch Management
```bash
# List branches
git branch                  # Local branches
git branch -r              # Remote branches
git branch -a              # All branches

# Switch branches
git checkout branch-name
git switch branch-name     # Git 2.23+

# Create and switch
git checkout -b new-branch
git switch -c new-branch   # Git 2.23+

# Delete branches
git branch -d branch-name          # Safe delete
git branch -D branch-name          # Force delete
git push origin --delete branch-name  # Delete remote
```

### History and Logs
```bash
# View commit history
git log
git log --oneline
git log --graph --oneline --all

# View specific file history
git log -- filename

# Show changes in commit
git show commit-hash

# Search commits
git log --grep="search term"
git log --author="author name"
```

---

## 🚨 Emergency Procedures

### Undo Changes
```bash
# Undo unstaged changes
git checkout -- filename
git restore filename       # Git 2.23+

# Undo staged changes
git reset HEAD filename
git restore --staged filename  # Git 2.23+

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Revert commit (safe for shared repos)
git revert commit-hash
```

### Fix Mistakes
```bash
# Change last commit message
git commit --amend -m "new message"

# Add files to last commit
git add forgotten-file
git commit --amend --no-edit

# Reset to specific commit
git reset --hard commit-hash

# Create backup before dangerous operations
git branch backup-branch-name
```

---

## 🤝 Collaboration Guidelines

### Pull Request Process
1. **Create Feature Branch:** `git checkout -b feature/description`
2. **Make Changes:** Implement feature with proper commits
3. **Update Documentation:** Update relevant docs
4. **Test Thoroughly:** Ensure all tests pass
5. **Create PR:** Submit pull request with description
6. **Code Review:** Address reviewer feedback
7. **Merge:** Squash and merge to target branch

### Code Review Checklist
- [ ] Code follows project style guidelines
- [ ] All tests pass
- [ ] Documentation is updated
- [ ] No sensitive data in commits
- [ ] Commit messages follow convention
- [ ] Feature is properly tested

---

## 📊 Repository Maintenance

### Regular Tasks
```bash
# Clean up merged branches
git branch --merged | grep -v main | xargs git branch -d

# Prune remote tracking branches
git remote prune origin

# Garbage collection
git gc --aggressive

# Check repository size
git count-objects -vH
```

### Backup Strategy
```bash
# Create bundle backup
git bundle create backup.bundle --all

# Clone from bundle
git clone backup.bundle restored-repo

# Mirror repository
git clone --mirror origin-url backup-repo.git
```

---

## 🔐 Security Best Practices

### Sensitive Data Protection
```bash
# Remove file from history (dangerous!)
git filter-branch --force --index-filter \
'git rm --cached --ignore-unmatch sensitive-file' \
--prune-empty --tag-name-filter cat -- --all

# Use git-secrets to prevent commits
git secrets --register-aws
git secrets --install
```

### SSH Key Setup
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"

# Add to SSH agent
ssh-add ~/.ssh/id_ed25519

# Test connection
ssh -T git@github.com
```

---

## 📈 Project Metrics

### Repository Statistics
```bash
# Lines of code
git ls-files | grep -E '\.(py|js|html|css)$' | xargs wc -l

# Commit count
git rev-list --count HEAD

# Contributors
git shortlog -sn

# File changes over time
git log --stat --oneline
```

### Generate Reports
```bash
# Contribution summary
git log --pretty=format:"%an %ad %s" --date=short --since="2025-01-01"

# Files changed most often
git log --pretty=format: --name-only | sort | uniq -c | sort -rg | head -10
```

---

## 🎯 Quick Reference

### Essential Commands
```bash
git status                 # Check repository status
git add .                  # Stage all changes
git commit -m "message"    # Commit with message
git push                   # Push to remote
git pull                   # Pull from remote
git checkout -b branch     # Create and switch branch
git merge branch           # Merge branch
git log --oneline          # View commit history
git diff                   # View changes
git reset --hard HEAD      # Discard all changes
```

### Useful Aliases
```bash
# Add to ~/.gitconfig
[alias]
    st = status
    co = checkout
    br = branch
    ci = commit
    ca = commit -a
    ps = push
    pl = pull
    lg = log --oneline --graph --all
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = !gitk
```

---

## 📞 Support and Resources

### Getting Help
- **Git Documentation:** https://git-scm.com/doc
- **GitHub Guides:** https://guides.github.com/
- **Atlassian Git Tutorials:** https://www.atlassian.com/git/tutorials

### Project Contacts
- **Repository:** https://github.com/yourusername/macos-to-linux-servers-scp
- **Issues:** Use GitHub Issues for bug reports and feature requests
- **Discussions:** Use GitHub Discussions for questions and ideas

---

*This Git documentation is part of the MacOS to Linux SCP project. Keep it updated as the project evolves.*
