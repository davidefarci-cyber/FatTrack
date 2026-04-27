@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo  FatTrack - Pubblica aggiornamento OTA ^(EAS Update^)
echo ============================================================
echo.
echo  Usa questo per fix rapidi solo JS/TS/asset, senza ribuildare l'APK.
echo  L'utente riceve l'update silenziosamente al prossimo lancio.
echo.
echo  NON usare se hai modificato:
echo    - dipendenze native ^(package.json con nuovi pacchetti expo-^*^)
echo    - app.json ^(permessi, plugin, version^)
echo    - SDK Expo
echo  In quei casi serve un APK nuovo: usa release.bat oppure crea-apk*.bat
echo.

if not exist "node_modules" (
    echo [!] "node_modules" mancante. Lancia prima setup.bat.
    pause
    exit /b 1
)

where eas >nul 2>nul
if errorlevel 1 (
    echo [!] EAS CLI non trovato. Lancia prima setup.bat.
    pause
    exit /b 1
)

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

rem --- Project ID configurato? ---
findstr /C:"\"projectId\": \"\"" app.json >nul
if not errorlevel 1 (
    echo.
    echo [!] expo.extra.eas.projectId in app.json e' vuoto.
    echo     Configura una volta sola con:
    echo         eas init
    echo         eas update:configure
    echo     Poi rilancia questo script.
    pause
    exit /b 1
)

rem --- Working tree pulito ^(consigliato^) ---
where git >nul 2>nul
if not errorlevel 1 (
    for /f "delims=" %%s in ('git status --porcelain') do (
        echo [!] Hai modifiche non committate. L'OTA pubblichera' lo stato attuale del filesystem.
        set /p "GOON=    Continuare comunque? [s/N]: "
        if /i not "!GOON!"=="s" exit /b 1
        goto :tree_ok
    )
)
:tree_ok

rem --- Messaggio update ---
set "MSG="
if not "%~*"=="" set "MSG=%*"
if "!MSG!"=="" (
    set /p "MSG=Messaggio update ^(es. 'fix calcolo kcal'^): "
)
if "!MSG!"=="" (
    echo [!] Messaggio vuoto, uscita.
    pause
    exit /b 1
)

echo.
echo [ ] Pubblico OTA su branch "production"...
echo     Messaggio: !MSG!
echo.

call eas update --branch production --message "!MSG!"
if errorlevel 1 (
    echo [!] eas update fallito.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  OTA pubblicato.
echo  Gli utenti riceveranno l'update al prossimo lancio dell'app
echo  ^(o al ritorno in foreground, secondo expo-updates^).
echo ============================================================
pause

endlocal
