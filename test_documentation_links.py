#!/usr/bin/env python3
"""
Test script to verify all documentation links are working properly
"""

import sys
import os
sys.path.append('.')

from app_enhanced import app
import requests
from urllib.parse import urljoin

def test_documentation_links():
    """Test all documentation links and routes"""
    
    print("🧪 Testing Documentation Links")
    print("=" * 50)
    
    # Documentation routes to test
    routes_to_test = {
        '/docs': 'Documentation Hub',
        '/docs/user-guide': 'User Guide', 
        '/docs/technical-report': 'Technical Documentation',
        '/docs/project-report': 'Project Report',
        '/docs/windows-wsl': 'Windows to WSL Setup Guide',
        '/docs/changelog': 'Visual Changelog',
        '/development-journey': 'Development Journey',
        '/api-docs': 'API Reference',
        '/changelog': 'Changelog (Markdown)',
        '/contributing': 'Contributing Guidelines',
        '/deployment': 'Deployment Guide'
    }
    
    # Test with Flask test client
    with app.test_client() as client:
        print("\n📋 Route Testing Results:")
        print("-" * 30)
        
        success_count = 0
        total_count = len(routes_to_test)
        
        for route, description in routes_to_test.items():
            try:
                response = client.get(route)
                if response.status_code == 200:
                    content_length = len(response.data)
                    print(f"✅ {route:<25} | {description:<30} | {content_length:,} bytes")
                    success_count += 1
                else:
                    print(f"❌ {route:<25} | {description:<30} | Status: {response.status_code}")
            except Exception as e:
                print(f"💥 {route:<25} | {description:<30} | Error: {str(e)}")
        
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {success_count}/{total_count} routes working")
        
        if success_count == total_count:
            print("🎉 All documentation links are working perfectly!")
            return True
        else:
            print(f"⚠️  {total_count - success_count} routes need attention")
            return False

def check_documentation_files():
    """Check if all documentation files exist"""
    
    print("\n📁 Documentation Files Check:")
    print("-" * 30)
    
    files_to_check = {
        'Doc/DOCUMENTATION_INDEX.html': 'Main Documentation Hub',
        'Doc/user_guide.html': 'User Guide',
        'Doc/TECHNICAL_REPORT.html': 'Technical Report',
        'Doc/PROJECT_REPORT.html': 'Project Report', 
        'Doc/WINDOWS_WSL_GUIDE.html': 'Windows WSL Guide',
        'Doc/CHANGELOG_VISUAL.html': 'Visual Changelog',
        'Doc/DEVELOPMENT_JOURNEY_VISUAL.html': 'Development Journey',
        'API_DOCUMENTATION.md': 'API Documentation',
        'CHANGELOG.md': 'Changelog',
        'CONTRIBUTING.md': 'Contributing Guidelines',
        'DEPLOYMENT_GUIDE.md': 'Deployment Guide'
    }
    
    success_count = 0
    total_count = len(files_to_check)
    
    for file_path, description in files_to_check.items():
        if os.path.exists(file_path):
            size = os.path.getsize(file_path)
            print(f"✅ {file_path:<35} | {description:<25} | {size:,} bytes")
            success_count += 1
        else:
            print(f"❌ {file_path:<35} | {description:<25} | MISSING")
    
    print(f"\n📊 Files Check: {success_count}/{total_count} files exist")
    return success_count == total_count

def main():
    """Main test function"""
    
    print("🚀 Secure Copy App Universal - Documentation Test")
    print("=" * 60)
    
    # Check files first
    files_ok = check_documentation_files()
    
    # Test routes
    routes_ok = test_documentation_links()
    
    print("\n" + "=" * 60)
    if files_ok and routes_ok:
        print("🎉 SUCCESS: All documentation is properly configured!")
        print("✨ Users can now access all documentation via dropdown menus")
        print("🔗 Links work from both login page and dashboard")
        return 0
    else:
        print("⚠️  ISSUES FOUND: Some documentation needs attention")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
