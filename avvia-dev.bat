@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo  FatTrack - Dev server Expo ^(test con Expo Go^)
echo ============================================================
echo.

if not exist "node_modules" (
    echo [!] "node_modules" mancante. Lancia prima setup.bat.
    pause
    exit /b 1
)

rem --- Auto-detect IP LAN ---
set "LAN_IP="
for /f "usebackq tokens=* delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\detect-lan-ip.ps1" 2^>nul`) do set "LAN_IP=%%i"

rem Trim di sicurezza su eventuali spazi/tab
if defined LAN_IP (
    for /f "tokens=* delims= 	" %%x in ("!LAN_IP!") do set "LAN_IP=%%x"
)

if not "!LAN_IP!"=="" (
    echo [OK] IP LAN rilevato: !LAN_IP!
    set "REACT_NATIVE_PACKAGER_HOSTNAME=!LAN_IP!"
    echo     Il telefono si connettera' a: exp://!LAN_IP!:8081
) else (
    echo [!] IP LAN non rilevato automaticamente.
    echo.
    echo     Apri una finestra cmd e lancia:  ipconfig
    echo     Cerca l'IPv4 della tua scheda Wi-Fi ^(tipo 192.168.x.x^).
    echo.
    set /p "LAN_IP=    Incolla qui l'IP (o premi invio per usare tunnel): "
    if not "!LAN_IP!"=="" (
        set "REACT_NATIVE_PACKAGER_HOSTNAME=!LAN_IP!"
        echo     OK, uso !LAN_IP!
    ) else (
        echo     Nessun IP: lancio modalita' tunnel ^(piu' lenta, ma funziona ovunque^).
        call npx expo start --tunnel
        endlocal
        exit /b 0
    )
)

echo.
echo  1. Apri Expo Go sul telefono ^(stessa Wi-Fi del PC^)
echo  2. Scansiona il QR qui sotto
echo.
echo ============================================================
echo.

call npx expo start --host lan

endlocal
