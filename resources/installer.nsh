;--------------------------------
; Custom Uninstaller Logic
; Runs at the end of uninstallation
;--------------------------------

!macro customUnInstall
  ; Remove all app data on uninstall
  RMDir /r "$LOCALAPPDATA\prompt-enhancer"
  RMDir /r "$APPDATA\prompt-enhancer"
  
  ; Remove any leftover logs
  Delete "$APPDATA\prompt-enhancer\logs\*.log"
  RMDir "$APPDATA\prompt-enhancer\logs"
  
  ; Remove registry entries
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
  DeleteRegKey HKCU "Software\Classes\prompt-enhancer"
  
  ; Remove Start Menu folder
  RMDir /r "$SMPROGRAMS\${STARTMENU_FOLDER}"
  
  ; Remove desktop shortcut
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  
  ; Clear temp files
  RMDir /r "$TEMP\prompt-enhancer-*"
!macroend

;--------------------------------
; Pre-Init - Set 64-bit registry view
;--------------------------------

!macro preInit
  SetRegView 64
!macroend

;--------------------------------
; Custom Install - Log completion
;--------------------------------

!macro customInstall
  DetailPrint "Installation completed successfully"
  DetailPrint "Version: ${VERSION}"
  DetailPrint "Install Directory: $INSTDIR"
!macroend

;--------------------------------
; Pre-Uninstall - Check if app is running
;--------------------------------

!macro un.preUninstall
  FindProcDLL::FindProc "${PRODUCT_NAME}.exe"
  Pop $R0
  StrCmp $R0 "1" 0 +4
    MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "${PRODUCT_NAME} is currently running.$\nPlease close it before uninstalling." IDOK +2
    Abort "Uninstall cancelled: application is running"
  
  ; Ask user if they want to remove all user data
  MessageBox MB_YESNO|MB_ICONQUESTION "Do you want to remove all user data (settings, API keys, history)? Click No to keep your data for a future reinstall." IDNO +2
    RMDir /r "$LOCALAPPDATA\prompt-enhancer"
    RMDir /r "$APPDATA\prompt-enhancer"
!macroend

;--------------------------------
; Installation Directory Validation
;--------------------------------

Function .onVerifyInstDir
  StrCmp $INSTDIR "" 0 +2
    StrCpy $INSTDIR "$PROGRAMFILES64\${PRODUCT_NAME}"
FunctionEnd