@echo off
setlocal enabledelayedexpansion
title Nova HR Agent v1.0.12 Setup Wizard

cls
color 0a
echo.
echo        ████████╗ █████╗ ███╗   ██╗██╗  ██╗    ██╗  ██╗██████╗ 
echo        ╚══██╔══╝██╔══██╗████╗  ██║██║ ██╔╝    ██║  ██║██╔══██╗
echo           ██║   ███████║██╔██╗ ██║█████╔╝     ███████║██████╔╝
echo           ██║   ██╔══██║██║╚██╗██║██╔═██╗     ██╔══██║██╔══██╗
echo           ██║   ██║  ██║██║ ╚████║██║  ██╗    ██║  ██║██║  ██║
echo           ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝    ╚═╝  ╚═╝╚═╝  ╚═╝
echo.
color 07
echo        ================================================================
echo                         Nova HR Agent v1.0.12 Setup
echo        ================================================================
echo.
echo        Welcome to the Nova HR Agent installation wizard.
echo        This will install Nova HR Agent on your computer.
echo.
echo        Press any key to continue or Ctrl+C to cancel...
pause >nul

cls
echo ================================================================
echo                    System Requirements Check
echo ================================================================
echo.

:: Check for Node.js
echo Checking for Node.js...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    color 0c
    echo [✗] Node.js is NOT installed!
    echo.
    echo     Nova HR Agent requires Node.js to function properly.
    echo     Please install Node.js from: https://nodejs.org/
    echo.
    echo     After installing Node.js, run this installer again.
    color 07
    echo.
    pause
    exit /b 1
) else (
    echo [✓] Node.js is installed
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo     Version: %NODE_VERSION%
)

echo.
echo ================================================================
echo                      Installation Options
echo ================================================================
echo.

set "INSTALL_DIR=%ProgramFiles%\Nova HR Agent"
echo Default installation directory: %INSTALL_DIR%
echo.
set /p CUSTOM_DIR="Use custom directory? (Y/N): "
if /i "%CUSTOM_DIR%"=="Y" (
    set /p INSTALL_DIR="Enter installation path: "
)

echo.
echo Installation directory: %INSTALL_DIR%
echo.
set /p CONTINUE="Continue with installation? (Y/N): "
if /i "%CONTINUE%" NEQ "Y" (
    echo Installation cancelled.
    pause
    exit /b 0
)

cls
echo ================================================================
echo                        Installing...
echo ================================================================
echo.

:: Stop any running instances
echo [1/6] Stopping existing Nova HR Agent instances...
taskkill /F /IM NovaHRAgent.exe >nul 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Nova HR Agent*" >nul 2>nul
timeout /t 2 /nobreak >nul

:: Create installation directory
echo [2/6] Creating installation directory...
if not exist "%INSTALL_DIR%" (
    mkdir "%INSTALL_DIR%" 2>nul
    if !errorlevel! neq 0 (
        echo ERROR: Could not create installation directory.
        echo Please run as administrator or choose a different directory.
        pause
        exit /b 1
    )
)

:: Install main files
echo [3/6] Installing Nova HR Agent files...

:: Create the main launcher batch file
(
echo @echo off
echo title Nova HR Agent v1.0.12
echo cd /d "%%~dp0"
echo.
echo echo Starting Nova HR Agent v1.0.12...
echo echo Press Ctrl+C to stop
echo.
echo if exist node.exe ^(
echo     node.exe NovaHRAgent.js
echo ^) else ^(
echo     node NovaHRAgent.js
echo ^)
echo.
echo pause
) > "%INSTALL_DIR%\NovaHRAgent.bat"

:: Create the main Node.js application
(
echo const http = require^('http'^);
echo const os = require^('os'^);
echo const fs = require^('fs'^);
echo const path = require^('path'^);
echo.
echo // Configuration
echo const config = {
echo   version: '1.0.12',
echo   apiUrl: 'http://localhost:3333/api/v1',
echo   heartbeatInterval: 60000,
echo   logFile: path.join^(__dirname, 'nova-hr-agent.log'^)
echo };
echo.
echo // Logger
echo function log^(level, message^) {
echo   const timestamp = new Date^(^).toISOString^(^);
echo   const logMessage = `[${timestamp}] [${level}] ${message}`;
echo   console.log^(logMessage^);
echo   try {
echo     fs.appendFileSync^(config.logFile, logMessage + '\n'^);
echo   } catch ^(e^) {}
echo }
echo.
echo // Send heartbeat
echo function sendHeartbeat^(^) {
echo   const data = JSON.stringify^({
echo     version: config.version,
echo     os: os.platform^(^) + ' ' + os.release^(^),
echo     hostname: os.hostname^(^),
echo     uptime: os.uptime^(^),
echo     memory: { total: os.totalmem^(^), free: os.freemem^(^) },
echo     timestamp: new Date^(^).toISOString^(^)
echo   }^);
echo.
echo   const url = new URL^(config.apiUrl + '/attitude/agent/heartbeat'^);
echo   const options = {
echo     hostname: url.hostname,
echo     port: url.port ^|^| 80,
echo     path: url.pathname,
echo     method: 'POST',
echo     headers: {
echo       'Content-Type': 'application/json',
echo       'Content-Length': data.length,
echo       'User-Agent': 'Nova-HR-Agent/1.0.12'
echo     }
echo   };
echo.
echo   const req = http.request^(options, res =^> {
echo     log^('INFO', `Heartbeat sent: ${res.statusCode}`^);
echo   }^);
echo.
echo   req.on^('error', error =^> {
echo     log^('ERROR', `Heartbeat failed: ${error.message}`^);
echo   }^);
echo.
echo   req.write^(data^);
echo   req.end^(^);
echo }
echo.
echo // Main execution
echo console.log^(''^);
echo console.log^('========================================'^);
echo console.log^('Nova HR Agent v1.0.12'^);
echo console.log^('========================================'^);
echo console.log^(`OS: ${os.platform^(^)} ${os.release^(^)}`^);
echo console.log^(`Hostname: ${os.hostname^(^)}`^);
echo console.log^(`API URL: ${config.apiUrl}`^);
echo console.log^(`Log file: ${config.logFile}`^);
echo console.log^('========================================'^);
echo console.log^(''^);
echo.
echo // Send initial heartbeat
echo sendHeartbeat^(^);
echo.
echo // Schedule periodic heartbeats
echo setInterval^(sendHeartbeat, config.heartbeatInterval^);
echo.
echo console.log^('Nova HR Agent is running...'^);
echo console.log^('Press Ctrl+C to stop'^);
echo.
echo // Keep process alive
echo process.stdin.resume^(^);
) > "%INSTALL_DIR%\NovaHRAgent.js"

:: Create configuration file
echo [4/6] Creating configuration file...
(
echo {
echo   "version": "1.0.12",
echo   "apiUrl": "http://localhost:3333/api/v1",
echo   "heartbeatInterval": 60000,
echo   "autoStart": true,
echo   "installDate": "%DATE% %TIME%"
echo }
) > "%INSTALL_DIR%\config.json"

:: Create shortcuts
echo [5/6] Creating shortcuts...
powershell -Command "try { $WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('$env:USERPROFILE\Desktop\Nova HR Agent.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\NovaHRAgent.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'Nova HR Agent v1.0.12'; $Shortcut.Save(); Write-Host 'Desktop shortcut created' } catch { Write-Host 'Could not create desktop shortcut' }" 2>nul

:: Add to Start Menu
if not exist "%ProgramData%\Microsoft\Windows\Start Menu\Programs\Nova HR Agent" (
    mkdir "%ProgramData%\Microsoft\Windows\Start Menu\Programs\Nova HR Agent" 2>nul
)
powershell -Command "try { $WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Nova HR Agent\Nova HR Agent.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\NovaHRAgent.bat'; $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; $Shortcut.Description = 'Nova HR Agent v1.0.12'; $Shortcut.Save() } catch {}" 2>nul

:: Registry entries
echo [6/6] Adding registry entries...
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\NovaHRAgent" /v "DisplayName" /d "Nova HR Agent" /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\NovaHRAgent" /v "DisplayVersion" /d "1.0.12" /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\NovaHRAgent" /v "Publisher" /d "Nova HR" /f >nul
reg add "HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\NovaHRAgent" /v "InstallLocation" /d "%INSTALL_DIR%" /f >nul

cls
color 0a
echo.
echo        ================================================================
echo                            INSTALLATION COMPLETE!
echo        ================================================================
echo.
color 07
echo        Nova HR Agent v1.0.12 has been successfully installed!
echo.
echo        Installation Directory: %INSTALL_DIR%
echo        Desktop Shortcut: Created
echo        Start Menu: Added
echo.
echo        ================================================================
echo                               POST-INSTALL OPTIONS
echo        ================================================================
echo.

set /p AUTOSTART="Add Nova HR Agent to Windows startup? (Y/N): "
if /i "%AUTOSTART%"=="Y" (
    reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "NovaHRAgent" /d "\"%INSTALL_DIR%\NovaHRAgent.bat\"" /f >nul
    echo [✓] Added to Windows startup
) else (
    echo [○] Not added to startup
)

echo.
set /p START_NOW="Start Nova HR Agent now? (Y/N): "
if /i "%START_NOW%"=="Y" (
    echo.
    echo Starting Nova HR Agent...
    start "Nova HR Agent" "%INSTALL_DIR%\NovaHRAgent.bat"
    echo [✓] Nova HR Agent started
)

echo.
echo        ================================================================
echo                                   COMPLETE
echo        ================================================================
echo.
echo        You can now:
echo        • Run Nova HR Agent from the desktop shortcut
echo        • Find it in the Start Menu under "Nova HR Agent"
echo        • Start it manually from: %INSTALL_DIR%\NovaHRAgent.bat
echo.
echo        For support, visit: http://localhost:3014
echo.
echo        Thank you for using Nova HR Agent!
echo.
pause