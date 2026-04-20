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

rem --- Auto-detect IP LAN (adapter attivo con gateway di default) ---
rem Serve per evitare che Metro scelga 127.0.0.1 quando il PC ha piu'
rem schede di rete (Wi-Fi + Ethernet + VPN + virtual adapters Docker/VMware).
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPConfiguration ^| Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } ^| Select-Object -First 1).IPv4Address.IPAddress"`) do set "LAN_IP=%%i"

if defined LAN_IP (
    echo [OK] IP LAN rilevato: !LAN_IP!
    set "REACT_NATIVE_PACKAGER_HOSTNAME=!LAN_IP!"
) else (
    echo [!] IP LAN non rilevato. Expo provera' da solo.
    echo     Se il QR fa "Failed to download remote update" usa "avvia-dev-tunnel.bat".
)

echo.
echo  1. Installa "Expo Go" sul telefono ^(Play Store / App Store^)
echo  2. Telefono e PC sulla stessa rete Wi-Fi
echo  3. Scansiona il QR code
if defined LAN_IP (
    echo.
    echo  Il telefono si connettera' a: exp://!LAN_IP!:8081
)
echo.
echo ============================================================
echo.

call npx expo start --host lan

endlocal
