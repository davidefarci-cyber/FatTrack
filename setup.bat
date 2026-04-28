@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

rem Lavora sempre nella cartella in cui si trova questo .bat,
rem anche se lanciato "come amministratore" (che imposta CWD su
rem C:\Windows\System32) o da un altro path.
cd /d "%~dp0"

rem ============================================================
rem  FatTrack - Setup / Update (Windows)
rem  - Installa Git e Node.js LTS via winget se mancanti
rem  - Installa EAS CLI globalmente
rem  - Clona il repo la prima volta, altrimenti fa git pull
rem  - Esegue npm install
rem ============================================================

set "REPO_OWNER=davidefarci-cyber"
set "REPO_NAME=fattrack"
set "REPO_DIR=FatTrack"
set "BRANCH=main"
set "REPO_URL=https://github.com/%REPO_OWNER%/%REPO_NAME%.git"

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

rem --- Token GitHub per repo privato ---
rem Priorita': 1) variabile d'ambiente GITHUB_TOKEN gia' settata
rem            2) file "setup.local.bat" nella stessa cartella (git-ignored)
rem            3) prompt interattivo (input nascosto via PowerShell),
rem               poi salvataggio in setup.local.bat per le volte successive
if not defined GITHUB_TOKEN (
    if exist "setup.local.bat" call "setup.local.bat"
)

if not defined GITHUB_TOKEN (
    echo.
    echo [ ] Il repository "%REPO_OWNER%/%REPO_NAME%" e' privato.
    echo     Serve un GitHub Personal Access Token ^(PAT^).
    echo     Crealo qui: https://github.com/settings/tokens
    echo       - Classic: scope "repo"
    echo       - Fine-grained: permesso "Contents: Read-only" sul repo %REPO_NAME%
    echo.
    for /f "usebackq delims=" %%t in (`powershell -NoProfile -Command "$s = Read-Host -AsSecureString 'Incolla il token (input nascosto)'; [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))"`) do set "GITHUB_TOKEN=%%t"

    if not defined GITHUB_TOKEN (
        echo [!] Nessun token fornito. Uscita.
        pause
        exit /b 1
    )

    rem Salva per esecuzioni future (file git-ignored)
    > "setup.local.bat" echo @echo off
    >> "setup.local.bat" echo rem File generato automaticamente da setup.bat - NON committare
    >> "setup.local.bat" echo set "GITHUB_TOKEN=!GITHUB_TOKEN!"
    echo [OK] Token salvato in "setup.local.bat"
)

set "AUTH_REPO_URL=https://oauth2:!GITHUB_TOKEN!@github.com/%REPO_OWNER%/%REPO_NAME%.git"

rem --- Repository: clone oppure pull ---
if not exist "%REPO_DIR%\.git" (
    echo.
    echo [ ] Clono il repository in "%REPO_DIR%" ^(branch %BRANCH%^)...
    git clone --branch "%BRANCH%" "!AUTH_REPO_URL!" "%REPO_DIR%"
    if errorlevel 1 (
        echo [!] git clone fallito ^(token scaduto o permessi insufficienti?^).
        echo     Rigenera il PAT e cancella "setup.local.bat" per reinserirlo.
        pause
        exit /b 1
    )
) else (
    echo.
    echo [ ] Aggiorno il repository "%REPO_DIR%" ^(git pull --ff-only^)...
    pushd "%REPO_DIR%"
    rem Aggiorna la URL di origin con il token corrente (utile se il PAT e' stato ruotato)
    git remote set-url origin "!AUTH_REPO_URL!"
    git fetch origin
    if errorlevel 1 (
        echo [!] git fetch fallito ^(token scaduto o permessi insufficienti?^).
        popd
        pause
        exit /b 1
    )
    git pull --ff-only
    if errorlevel 1 (
        echo [!] git pull fallito al primo tentativo.
        echo [ ] Rimuovo i file non tracciati che esistono anche nel branch remoto
        echo     ^(es. package-lock.json rigenerato da npm install^)...
        for /f "usebackq delims=" %%f in (`git ls-files --others --exclude-standard`) do (
            git cat-file -e "origin/%BRANCH%:%%f" 2>nul
            if not errorlevel 1 (
                set "RM_PATH=%%f"
                set "RM_PATH=!RM_PATH:/=\!"
                echo     elimino "!RM_PATH!"
                del /f /q "!RM_PATH!" >nul 2>nul
            )
        )
        git pull --ff-only
        if errorlevel 1 (
            echo [!] git pull fallito anche dopo la pulizia ^(merge manuale necessario^).
            popd
            pause
            exit /b 1
        )
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

rem --- Pulizia URL remote + setup gh come credential helper ---
rem (rimuove il token read-only embeddato per il clone, cosi' i push
rem successivi usano gh / SSH e non vanno in 403)
if exist "%REPO_DIR%\scripts\ensure-git-push-auth.bat" (
    echo.
    echo [ ] Configuro auth git push ^(gh credential helper^)...
    pushd "%REPO_DIR%"
    call scripts\ensure-git-push-auth.bat
    popd
    rem Errore non fatale: setup ok anche se gh non e' installato.
)

echo.
echo ============================================================
echo  Setup completato!
echo.
echo  Tutto il workflow quotidiano passa da un menu unico:
echo    %REPO_DIR%\fattrack.bat   ^(dev server, build APK, release, OTA, deps^)
echo.
echo  Rilancia setup.bat in qualunque momento per aggiornare
echo  l'ambiente (Git/Node/EAS) e fare git pull del repo.
echo ============================================================

if exist "%REPO_DIR%\fattrack.bat" (
    set "_LAUNCH="
    set /p "_LAUNCH=Avvio il menu fattrack.bat ora? [s/N]: "
    if /i "!_LAUNCH!"=="s" (
        pushd "%REPO_DIR%"
        call fattrack.bat
        popd
        endlocal
        exit /b 0
    )
)

pause
endlocal
