@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo  FatTrack - Dev server Expo ^(test con Expo Go^)
echo ============================================================
echo.
echo  1. Installa "Expo Go" sul telefono ^(Play Store / App Store^)
echo  2. Telefono e PC sulla stessa rete Wi-Fi
echo  3. Scansiona il QR code che apparira' qui sotto
echo.
echo  Se la rete non collega ^(Wi-Fi aziendale/pubblico^):
echo    chiudi e lancia:  npx expo start --tunnel
echo.
echo ============================================================
echo.

if not exist "node_modules" (
    echo [!] "node_modules" mancante. Lancia prima setup.bat.
    pause
    exit /b 1
)

call npm run start

endlocal
