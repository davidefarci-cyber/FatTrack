@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo  FatTrack - Build APK preview ^(cloud EAS^)
echo ============================================================
echo.

where eas >nul 2>nul
if errorlevel 1 (
    echo [!] EAS CLI non trovato. Lancia prima setup.bat.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [!] "node_modules" mancante. Lancia prima setup.bat.
    pause
    exit /b 1
)

rem --- Verifica login EAS ---
eas whoami >nul 2>nul
if errorlevel 1 (
    echo [ ] Non sei loggato su EAS. Avvio "eas login"...
    echo     ^(usa il tuo account Expo - crealo su https://expo.dev se non ce l'hai^)
    call eas login
    if errorlevel 1 (
        echo [!] Login EAS fallito.
        pause
        exit /b 1
    )
)

for /f "delims=" %%u in ('eas whoami') do echo [OK] Loggato come %%u

echo.
echo [ ] Avvio build Android preview sul cloud Expo...
echo     ^(la prima build puo' richiedere 10-20 minuti^)
echo.

call npm run build:android:preview
if errorlevel 1 (
    echo [!] Build fallita.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Build avviata/completata.
echo
echo  Prossimi passi:
echo    - Apri il link mostrato sopra ^(oppure https://expo.dev^)
echo    - Scarica l'APK sul telefono
echo    - Installa ^(abilita "Origini sconosciute" se richiesto^)
echo ============================================================
pause

endlocal
