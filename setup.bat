@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

rem ============================================================
rem  FatTrack - Setup / Update (Windows)
rem  - Installa Git e Node.js LTS via winget se mancanti
rem  - Installa EAS CLI globalmente
rem  - Clona il repo la prima volta, altrimenti fa git pull
rem  - Esegue npm install
rem ============================================================

set "REPO_URL=https://github.com/davidefarci-cyber/fattrack.git"
set "REPO_DIR=FatTrack"
set "BRANCH=claude/init-fattrack-project-3XYHC"

echo ============================================================
echo  FatTrack - Setup / Update
echo  Cartella corrente: %CD%
echo ============================================================
echo.

set "NEEDS_RESTART=0"
set "NEED_WINGET=0"

rem --- Pre-check: serve winget se manca qualcosa da installare? ---
where git >nul 2>nul
if errorlevel 1 set "NEED_WINGET=1"
where node >nul 2>nul
if errorlevel 1 set "NEED_WINGET=1"

if "!NEED_WINGET!"=="1" (
    where winget >nul 2>nul
    if errorlevel 1 (
        echo [!] winget non trovato.
        echo     Installa "App Installer" dal Microsoft Store:
        echo     https://apps.microsoft.com/detail/9NBLGGH4NNS1
        echo     Poi rilancia questo script.
        pause
        exit /b 1
    )
)

rem --- Git ---
where git >nul 2>nul
if errorlevel 1 (
    echo [ ] Git non trovato. Installo Git for Windows con winget...
    winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
        echo [!] Installazione Git fallita.
        pause
        exit /b 1
    )
    set "NEEDS_RESTART=1"
) else (
    for /f "delims=" %%v in ('git --version') do echo [OK] %%v
)

rem --- Node.js LTS (include npm) ---
where node >nul 2>nul
if errorlevel 1 (
    echo [ ] Node.js non trovato. Installo Node.js LTS con winget...
    winget install --id OpenJS.NodeJS.LTS -e --source winget --accept-package-agreements --accept-source-agreements
    if errorlevel 1 (
        echo [!] Installazione Node.js fallita.
        pause
        exit /b 1
    )
    set "NEEDS_RESTART=1"
) else (
    for /f "delims=" %%v in ('node --version') do echo [OK] Node.js %%v
    for /f "delims=" %%v in ('npm --version') do echo [OK] npm %%v
)

if "!NEEDS_RESTART!"=="1" (
    echo.
    echo ============================================================
    echo  Sono stati installati nuovi tool ^(Git / Node.js^).
    echo  Chiudi questa finestra, apri un NUOVO prompt ^(cmd o
    echo  PowerShell^) e rilancia questo script per completare
    echo  il setup.
    echo ============================================================
    pause
    exit /b 0
)

rem --- EAS CLI ---
where eas >nul 2>nul
if errorlevel 1 (
    echo [ ] EAS CLI non trovato. Installo globalmente con npm...
    call npm install -g eas-cli
    if errorlevel 1 (
        echo [!] Installazione EAS CLI fallita.
        pause
        exit /b 1
    )
) else (
    for /f "delims=" %%v in ('eas --version') do echo [OK] EAS CLI %%v
)

rem --- Repository: clone oppure pull ---
if not exist "%REPO_DIR%\.git" (
    echo.
    echo [ ] Clono il repository in "%REPO_DIR%" ^(branch %BRANCH%^)...
    git clone --branch "%BRANCH%" "%REPO_URL%" "%REPO_DIR%"
    if errorlevel 1 (
        echo [!] git clone fallito.
        pause
        exit /b 1
    )
) else (
    echo.
    echo [ ] Aggiorno il repository "%REPO_DIR%" ^(git pull --ff-only^)...
    pushd "%REPO_DIR%"
    git fetch origin
    if errorlevel 1 (
        echo [!] git fetch fallito.
        popd
        pause
        exit /b 1
    )
    git pull --ff-only
    if errorlevel 1 (
        echo [!] git pull fallito ^(potrebbe servire un merge manuale^).
        popd
        pause
        exit /b 1
    )
    popd
)

rem --- npm install ---
echo.
echo [ ] npm install in "%REPO_DIR%"...
pushd "%REPO_DIR%"
call npm install
if errorlevel 1 (
    echo [!] npm install fallito.
    popd
    pause
    exit /b 1
)
popd

rem --- .env ---
if not exist "%REPO_DIR%\.env" (
    if exist "%REPO_DIR%\.env.example" (
        echo [ ] Creo "%REPO_DIR%\.env" da .env.example ^(da compilare^)
        copy /Y "%REPO_DIR%\.env.example" "%REPO_DIR%\.env" >nul
    )
)

echo.
echo ============================================================
echo  Setup completato!
echo.
echo  Prossimi passi:
echo    cd %REPO_DIR%
echo    npm run start              ^(avvia Expo dev server^)
echo.
echo  Per la prima build APK ^(cloud^):
echo    eas login
echo    eas build:configure
echo    npm run build:android:preview
echo.
echo  Rilancia questo script in qualunque momento per aggiornare
echo  il repo ^(git pull^) e reinstallare le dipendenze.
echo ============================================================
pause
endlocal
