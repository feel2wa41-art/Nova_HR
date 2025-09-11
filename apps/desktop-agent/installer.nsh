; NSIS installer script for Reko HR Desktop Agent
; This script provides additional installer customization

; Custom installer pages
!include "MUI2.nsh"

; Add custom install steps
Section "Custom" SEC01
  ; Check if Visual C++ Redistributable is installed
  ; This is needed for native modules
  ReadRegStr $0 HKEY_LOCAL_MACHINE "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Version"
  ${If} $0 == ""
    MessageBox MB_YESNO|MB_ICONQUESTION "Visual C++ 2015-2019 Redistributable is required. Download and install it now?" IDNO skip_vcredist
    ExecShell "open" "https://aka.ms/vs/16/release/vc_redist.x64.exe"
    MessageBox MB_OK "Please install Visual C++ Redistributable and then continue with the installation."
    skip_vcredist:
  ${EndIf}

  ; Create application data directory
  CreateDirectory "$APPDATA\Reko HR Desktop Agent"
  
  ; Set permissions for the app data directory (commented out due to plugin issue)
  ; AccessControl::GrantOnFile "$APPDATA\Reko HR Desktop Agent" "(BU)" "FullAccess"
  
  ; Create logs directory
  CreateDirectory "$APPDATA\Reko HR Desktop Agent\logs"
  
  ; Register app for auto-start (optional)
  WriteRegStr HKEY_CURRENT_USER "SOFTWARE\Microsoft\Windows\CurrentVersion\Run" "RekoHRDesktopAgent" "$INSTDIR\Reko HR Desktop Agent.exe --hidden"
SectionEnd

; Custom uninstall steps
Section "Uninstall"
  ; Remove auto-start registry entry
  DeleteRegValue HKEY_CURRENT_USER "SOFTWARE\Microsoft\Windows\CurrentVersion\Run" "RekoHRDesktopAgent"
  
  ; Remove application data if user chose to
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to remove all application data including settings and logs?" IDNO skip_data_removal
  RMDir /r "$APPDATA\Reko HR Desktop Agent"
  skip_data_removal:
SectionEnd

; Simplified installation without complex language strings

; Custom installer functions
Function .onInit
  ; Check Windows version
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_OK "This application requires Windows 10 or later."
    Abort
  ${EndIf}
  
  ; Simple initialization without registry checks
FunctionEnd

; Show finish page
Function .onInstSuccess
  ; Optional: Show completion message
  MessageBox MB_OK "Reko HR Desktop Agent has been installed successfully!$\n$\nThe application will start automatically when you log in to Windows."
FunctionEnd