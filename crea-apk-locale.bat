@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo  FatTrack - Build APK locale ^(Windows native, Gradle diretto^)
echo ============================================================
echo.
echo  Bypassa "eas build --local" che NON funziona su Windows.
echo  Usa: expo prebuild + gradlew.bat assembleRelease
echo  Prerequisiti: JDK 17, Android SDK ^(installati on demand qui sotto^).
echo.

rem --- node_modules ---
if not exist "node_modules" (
    echo [!] "node_modules" mancante. Lancia prima setup.bat.
    pause
    exit /b 1
)

rem --- Toolchain Android: check + auto-install se manca
call :ensure_android_toolchain
if errorlevel 1 (
    pause
    exit /b 1
)

rem --- Profilo ^(default: preview, usato solo per il nome dell'APK^)
set "PROFILE=preview"
if not "%~1"=="" set "PROFILE=%~1"

rem ============================================================
rem  Scelta ABI: di default solo arm64-v8a per APK leggero ^(~30-40 MB^).
rem  Override: 2o argomento posizionale OPPURE prompt interattivo.
rem ============================================================
set "ABI=%~2"
if "!ABI!"=="" (
    echo.
    echo  Architetture ABI da compilare:
    echo    1^) arm64-v8a    ^(default - smartphone moderni, ~30-40 MB^)
    echo    2^) armeabi-v7a  ^(vecchi smartphone, da passare a un amico^)
    echo    3^) Universal    ^(tutte e 4 le ABI, ~90 MB - sconsigliato^)
    echo.
    set /p "_ABI_CHOICE=Scegli [1]: "
    if "!_ABI_CHOICE!"=="" set "_ABI_CHOICE=1"
    if "!_ABI_CHOICE!"=="1" set "ABI=arm64-v8a"
    if "!_ABI_CHOICE!"=="2" set "ABI=armeabi-v7a"
    if "!_ABI_CHOICE!"=="3" set "ABI=universal"
)

set "OUTPUT_APK=fattrack-!PROFILE!-!ABI!.apk"

echo.
echo [ ] Avvio build LOCALE Android, profilo: !PROFILE!, ABI: !ABI!
echo     output: !OUTPUT_APK!
echo.

call "%~dp0scripts\build-android-local.bat" "!ABI!" "!OUTPUT_APK!"
if errorlevel 1 (
    echo [!] Build locale fallita.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Build locale completata.
echo  APK: !OUTPUT_APK!
echo  Trasferiscilo sul telefono ^(USB / Drive / mail^) e installa.
echo ============================================================
pause
endlocal
exit /b 0


rem ============================================================
rem  Subroutine: verifica JDK17 + ANDROID_HOME, installa se manca
rem ============================================================
:ensure_android_toolchain
set "_NEED_INSTALL=0"

where java >nul 2>nul
if errorlevel 1 (
    set "_NEED_INSTALL=1"
) else (
    set "_JAVA_OK=0"
    for /f "tokens=*" %%v in ('java -version 2^>^&1') do (
        echo %%v | findstr /C:"\"17." >nul && set "_JAVA_OK=1"
    )
    if "!_JAVA_OK!"=="0" set "_NEED_INSTALL=1"
)

set "_ANDROID_OK=0"
if defined ANDROID_HOME (
    if exist "!ANDROID_HOME!\cmdline-tools\latest\bin\sdkmanager.bat" set "_ANDROID_OK=1"
)
if "!_ANDROID_OK!"=="0" if defined ANDROID_SDK_ROOT (
    if exist "!ANDROID_SDK_ROOT!\cmdline-tools\latest\bin\sdkmanager.bat" (
        set "ANDROID_HOME=!ANDROID_SDK_ROOT!"
        set "_ANDROID_OK=1"
    )
)
if "!_ANDROID_OK!"=="0" set "_NEED_INSTALL=1"

if "!_NEED_INSTALL!"=="0" (
    echo [OK] Toolchain Android gia' configurata ^(JAVA_HOME + ANDROID_HOME^).
    exit /b 0
)

echo.
echo [!] Toolchain Android incompleta o assente.
echo     Posso installare automaticamente:
echo       - JDK 17 ^(Adoptium Temurin, via winget^)
echo       - Android SDK cmdline-tools ^(download diretto da Google^)
echo       - platform-tools, platforms;android-34, build-tools;34.0.0
echo       - Accettazione licenze SDK
echo     Spazio richiesto: ~1.5 GB. Tempo: 5-10 minuti.
echo.
set /p "_GO=Installo ora? [s/N]: "
if /i not "!_GO!"=="s" (
    echo Annullato. Installa manualmente e rilancia.
    exit /b 1
)

echo.
echo [ ] Avvio installer PowerShell...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-android-build-tools.ps1"
if errorlevel 1 (
    echo [!] Auto-install fallita. Vedi i log sopra.
    exit /b 1
)

if not exist "%TEMP%\fattrack-android-env.cmd" (
    echo [!] Installer non ha generato il file env. Riapri il prompt e riprova.
    exit /b 1
)
call "%TEMP%\fattrack-android-env.cmd"
del "%TEMP%\fattrack-android-env.cmd" >nul 2>nul

echo [OK] Toolchain pronta nella sessione corrente.
exit /b 0
