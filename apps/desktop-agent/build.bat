@echo off
echo 🚀 Reko HR Desktop Agent - Windows Build Script
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if Python is available (needed for native modules)
python --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Warning: Python not found. Installing windows-build-tools...
    npm install --global --production windows-build-tools
    if errorlevel 1 (
        echo ❌ Failed to install windows-build-tools
        echo Please install Python 3.x manually or Visual Studio Build Tools
        pause
        exit /b 1
    )
)

:: Set environment variables for production build
set NODE_ENV=production

:: Ask user for API URL
echo.
echo 📡 Select API configuration:
echo   1) Local (http://localhost:3000)
echo   2) Production (https://api.reko-hr.com)
echo   3) Custom URL
echo.
set /p api_choice="Enter choice (1-3): "

if "%api_choice%"=="1" (
    set API_URL=http://localhost:3000
    echo Using Local API
) else if "%api_choice%"=="2" (
    set API_URL=https://api.reko-hr.com
    echo Using Production API
) else if "%api_choice%"=="3" (
    set /p API_URL="Enter custom API URL: "
    echo Using Custom API: %API_URL%
) else (
    echo Invalid choice, using Local API as default
    set API_URL=http://localhost:3000
)

echo.
echo 🏗️  Starting build with:
echo    NODE_ENV: %NODE_ENV%
echo    API_URL: %API_URL%
echo.

:: Run the build script
node scripts/build.js --win

if errorlevel 1 (
    echo.
    echo ❌ Build failed! Check the error messages above.
    pause
    exit /b 1
)

echo.
echo 🎉 Build completed successfully!
echo 📁 Check the 'release' folder for the installer
echo.

:: Ask if user wants to open the release folder
set /p open_folder="Open release folder? (Y/n): "
if /i not "%open_folder%"=="n" (
    explorer release
)

pause