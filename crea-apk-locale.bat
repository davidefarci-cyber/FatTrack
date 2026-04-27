@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo  FatTrack - Build APK preview ^(LOCALE, senza coda EAS^)
echo ============================================================
echo.
echo  Vantaggi: niente coda Expo, niente upload del bundle.
echo  Prerequisiti: JDK 17, Android SDK ^(ANDROID_HOME^), EAS CLI.
echo.

rem --- node_modules ---
if not exist "node_modules" (
    echo [!] "node_modules" mancante. Lancia prima setup.bat.
    pause
    exit /b 1
)

rem --- EAS CLI ---
where eas >nul 2>nul
if errorlevel 1 (
    echo [!] EAS CLI non trovato. Lancia prima setup.bat.
    pause
    exit /b 1
)

rem --- JDK ---
where java >nul 2>nul
if errorlevel 1 (
    echo [!] Java non trovato sul PATH.
    echo     Installa JDK 17, ad esempio:
    echo         winget install --id EclipseAdoptium.Temurin.17.JDK -e
    echo     Poi chiudi e riapri il prompt.
    pause
    exit /b 1
)

rem Verifica versione JDK ^(deve essere 17.x^)
set "JAVA_OK=0"
for /f "tokens=*" %%v in ('java -version 2^>^&1 ^| findstr /R "version"') do (
    echo %%v | findstr /C:"\"17." >nul && set "JAVA_OK=1"
)
if "!JAVA_OK!"=="0" (
    echo [!] La versione di Java sul PATH non sembra JDK 17.
    echo     Build EAS richiede JDK 17. Imposta JAVA_HOME al JDK 17 e
    echo     metti %%JAVA_HOME%%\bin in cima al PATH.
    java -version 2>&1
    echo.
    set /p "GOFORCE=    Vuoi continuare comunque? [s/N]: "
    if /i not "!GOFORCE!"=="s" exit /b 1
)

rem --- Android SDK ---
if not defined ANDROID_HOME (
    if defined ANDROID_SDK_ROOT (
        set "ANDROID_HOME=!ANDROID_SDK_ROOT!"
    )
)
if not defined ANDROID_HOME (
    echo [!] ANDROID_HOME non impostata.
    echo     Installa l'Android SDK ^(piu' leggero: cmdline-tools^):
    echo       1^) Scarica "Android Command line tools" da
    echo          https://developer.android.com/studio#command-line-tools-only
    echo       2^) Scompatta in C:\Android\cmdline-tools\latest\
    echo       3^) Setta ANDROID_HOME=C:\Android e aggiungi al PATH:
    echo          %%ANDROID_HOME%%\cmdline-tools\latest\bin
    echo          %%ANDROID_HOME%%\platform-tools
    echo       4^) Lancia: sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0"
    echo.
    pause
    exit /b 1
)
echo [OK] ANDROID_HOME = !ANDROID_HOME!

rem --- Login EAS ^(serve anche per build --local: scarica credenziali^) ---
call eas whoami >nul 2>nul
if errorlevel 1 (
    echo [ ] Non sei loggato su EAS. Avvio "eas login"...
    call eas login
    if errorlevel 1 (
        echo [!] Login EAS fallito.
        pause
        exit /b 1
    )
)
for /f "delims=" %%u in ('eas whoami') do echo [OK] Loggato come %%u

rem --- Profilo ^(default: preview^) ---
set "PROFILE=preview"
if not "%~1"=="" set "PROFILE=%~1"
echo.
echo [ ] Avvio build LOCALE Android, profilo: !PROFILE!
echo     ^(la prima build scarica Gradle/dipendenze: 5-10 min,
echo      le successive sono incrementali: 2-4 min^)
echo.

call eas build --platform android --profile !PROFILE! --local
if errorlevel 1 (
    echo [!] Build locale fallita.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Build locale completata.
echo  L'APK e' nella cartella corrente ^(file .apk creato da EAS^).
echo ============================================================
pause

endlocal
