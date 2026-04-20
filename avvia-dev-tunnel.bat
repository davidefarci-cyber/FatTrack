@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo  FatTrack - Dev server Expo ^(modalita' TUNNEL^)
echo ============================================================
echo.
echo  Usa questo script quando "avvia-dev.bat" normale non funziona
echo  ^(errore "Failed to download remote update" su Expo Go^):
echo    - firewall Windows che blocca node.exe
echo    - Wi-Fi con client isolation
echo    - PC ed telefono su reti/subnet diverse
echo    - VPN attiva
echo.
echo  Il tunnel passa via ngrok: piu' lento, ma funziona ovunque.
echo  La prima volta scarica "@expo/ngrok" ^(puo' chiedere conferma^).
echo.
echo ============================================================
echo.

if not exist "node_modules" (
    echo [!] "node_modules" mancante. Lancia prima setup.bat.
    pause
    exit /b 1
)

call npx expo start --tunnel

endlocal
