@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

rem ============================================================
rem  scripts\ensure-git-push-auth.bat
rem
rem  Garantisce che `git push` funzioni:
rem  1. Pulisce eventuali token embeddati nell'URL del remote
rem     ^(setup.bat originale ne metteva uno read-only, che blocca i push^).
rem  2. Verifica che gh sia installato e loggato.
rem  3. Configura git per usare gh come credential helper.
rem
rem  Idempotente: lanciarlo piu' volte non fa danni. Niente prompt
rem  se tutto e' gia' a posto.
rem ============================================================

rem --- 1. URL del remote pulito (no token embedded) ---
set "REMOTE_URL="
for /f "delims=" %%u in ('git remote get-url origin 2^>nul') do set "REMOTE_URL=%%u"

if "!REMOTE_URL!"=="" (
    echo [!] Remote 'origin' non configurato. Sei dentro il repo FatTrack?
    exit /b 1
)

set "CLEAN_URL=https://github.com/davidefarci-cyber/fattrack.git"

echo !REMOTE_URL! | findstr /C:"@github.com" >nul
if not errorlevel 1 (
    echo [ ] Remote URL ha un token incorporato. Lo pulisco...
    call git remote set-url origin "!CLEAN_URL!"
    if errorlevel 1 (
        echo [!] Impossibile aggiornare URL remote.
        exit /b 1
    )
    echo [OK] Remote URL ora: !CLEAN_URL!
)

rem --- 2. gh installato ---
where gh >nul 2>nul
if errorlevel 1 (
    echo [!] GitHub CLI ^(gh^) non trovata.
    echo     Installala con:  winget install --id GitHub.cli -e
    echo     Poi chiudi e riapri il prompt e rilancia.
    exit /b 1
)

rem --- 3. gh loggato ---
call gh auth status >nul 2>nul
if errorlevel 1 (
    echo [ ] gh non autenticato. Avvio gh auth login...
    call gh auth login
    if errorlevel 1 (
        echo [!] gh auth login fallito.
        exit /b 1
    )
)

rem --- 4. Verifica scope: serve almeno 'repo' per push ---
rem `gh auth status` con --hostname mostra gli scope; se manca 'repo', refresh.
set "_HAS_REPO_SCOPE=0"
for /f "delims=" %%s in ('gh auth status 2^>^&1 ^| findstr /C:"Token scopes:"') do (
    echo %%s | findstr /C:"'repo'" >nul && set "_HAS_REPO_SCOPE=1"
    echo %%s | findstr /C:"\"repo\"" >nul && set "_HAS_REPO_SCOPE=1"
    rem Alcune versioni di gh stampano "Token scopes: repo, workflow"
    echo %%s | findstr /R "[ ,]repo[, ]" >nul && set "_HAS_REPO_SCOPE=1"
    echo %%s | findstr /R " repo$" >nul && set "_HAS_REPO_SCOPE=1"
)
if "!_HAS_REPO_SCOPE!"=="0" (
    echo [ ] Token gh senza scope 'repo'. Lo aggiungo...
    call gh auth refresh -h github.com -s repo
    if errorlevel 1 (
        echo [!] gh auth refresh fallito. Aggiungi manualmente lo scope 'repo'.
        exit /b 1
    )
)

rem --- 5. Setup credential helper di git ---
call gh auth setup-git >nul 2>nul
if errorlevel 1 (
    echo [!] gh auth setup-git fallito.
    exit /b 1
)

echo [OK] Auth git push configurata (gh come credential helper, scope repo).
exit /b 0
