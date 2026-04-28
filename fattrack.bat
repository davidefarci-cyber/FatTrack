@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

rem ============================================================
rem  fattrack.bat - Menu unico per FatTrack
rem  Sostituisce: avvia-dev, avvia-dev-tunnel, crea-apk,
rem               crea-apk-locale, pubblica-update, release.
rem  Bootstrap pre-clone resta in setup.bat.
rem ============================================================

:main_menu
cls
echo ============================================================
echo  FatTrack - Menu principale
echo ============================================================
echo.
echo  [1] Aggiorna repo (git pull)
echo  [2] Avvia dev server (Expo Go)
echo  [3] Build APK rapido (locale, solo test)
echo  [4] Release completa (bump + APK + GitHub Release)
echo  [5] Pubblica update OTA (JS/TS only)
echo  [6] Verifica/installa dipendenze
echo  [0] Esci
echo.
set "_OPT="
set /p "_OPT=Scelta [0-6]: "

if "!_OPT!"=="0" goto :end
if "!_OPT!"=="1" call :menu_pull & goto :main_menu
if "!_OPT!"=="2" call :menu_dev & goto :main_menu
if "!_OPT!"=="3" call :menu_build_quick & goto :main_menu
if "!_OPT!"=="4" call :menu_release & goto :main_menu
if "!_OPT!"=="5" call :menu_ota & goto :main_menu
if "!_OPT!"=="6" call :menu_deps & goto :main_menu
echo [!] Scelta non valida.
timeout /t 1 >nul
goto :main_menu

:end
endlocal
exit /b 0


rem ============================================================
rem  VOCE 1: Aggiorna repo
rem ============================================================
:menu_pull
echo.
echo === Aggiorna repo ===
where git >nul 2>nul || (echo [!] git non trovato. Lancia setup.bat. & pause & exit /b 1)

set "_HEAD_BEFORE="
for /f "delims=" %%c in ('git rev-parse HEAD 2^>nul') do set "_HEAD_BEFORE=%%c"

echo [ ] git pull --ff-only...
call git pull --ff-only
if errorlevel 1 (
    echo [!] git pull fallito. Risolvi a mano e riprova.
    pause
    exit /b 1
)

set "_HEAD_AFTER="
for /f "delims=" %%c in ('git rev-parse HEAD 2^>nul') do set "_HEAD_AFTER=%%c"

if not "!_HEAD_BEFORE!"=="!_HEAD_AFTER!" (
    echo [ ] Nuovi commit ricevuti. Eseguo npm install...
    call npm install
    if errorlevel 1 (
        echo [!] npm install fallito.
        pause
        exit /b 1
    )
) else (
    echo [OK] Gia' aggiornato.
)
pause
exit /b 0


rem ============================================================
rem  VOCE 2: Dev server (Expo Go)
rem ============================================================
:menu_dev
echo.
echo === Dev server (Expo Go) ===
call :check_node_modules || exit /b 1

echo.
echo  Modalita':
echo    1) LAN auto-detect (default - veloce, stessa Wi-Fi)
echo    2) Tunnel (firewall / Wi-Fi isolation / VPN)
echo.
set "_DEV_MODE="
set /p "_DEV_MODE=Scelta [1]: "
if "!_DEV_MODE!"=="" set "_DEV_MODE=1"

if "!_DEV_MODE!"=="2" (
    echo [ ] Avvio in modalita' tunnel...
    call npx expo start --tunnel
    exit /b 0
)

rem --- LAN auto-detect ---
set "LAN_IP="
for /f "usebackq tokens=* delims=" %%i in (`powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\detect-lan-ip.ps1" 2^>nul`) do set "LAN_IP=%%i"
if defined LAN_IP for /f "tokens=* delims= 	" %%x in ("!LAN_IP!") do set "LAN_IP=%%x"

if "!LAN_IP!"=="" (
    echo [!] IP LAN non rilevato.
    set /p "LAN_IP=    Incolla IP manualmente (invio = tunnel): "
    if "!LAN_IP!"=="" (
        echo [ ] Fallback su tunnel...
        call npx expo start --tunnel
        exit /b 0
    )
)

echo [OK] IP LAN: !LAN_IP!
set "REACT_NATIVE_PACKAGER_HOSTNAME=!LAN_IP!"
echo     Telefono si connettera' a: exp://!LAN_IP!:8081
echo.
call npx expo start --host lan
exit /b 0


rem ============================================================
rem  VOCE 3: Build APK rapido (locale, no commit)
rem ============================================================
:menu_build_quick
echo.
echo === Build APK rapido (locale) ===
call :check_node_modules || exit /b 1
call :ensure_android_toolchain || exit /b 1

echo.
echo  Architetture ABI:
echo    1) arm64-v8a    (default - smartphone moderni, ~30-40 MB)
echo    2) armeabi-v7a  (smartphone vecchi)
echo    3) Universal    (tutte le ABI, ~90 MB)
echo.
set "_ABI_CHOICE="
set /p "_ABI_CHOICE=Scelta [1]: "
if "!_ABI_CHOICE!"=="" set "_ABI_CHOICE=1"
set "ABI=arm64-v8a"
if "!_ABI_CHOICE!"=="2" set "ABI=armeabi-v7a"
if "!_ABI_CHOICE!"=="3" set "ABI=universal"

set "OUTPUT_APK=fattrack-test-!ABI!.apk"

echo.
echo [ ] Build LOCALE rapida, ABI: !ABI!, output: !OUTPUT_APK!
call "%~dp0scripts\build-android-local.bat" "!ABI!" "!OUTPUT_APK!"
if errorlevel 1 (
    echo [!] Build locale fallita.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Build completata: !OUTPUT_APK!
echo  Trasferisci sul telefono e installa.
echo ============================================================
pause
exit /b 0


rem ============================================================
rem  VOCE 4: Release end-to-end (bump + APK + GitHub Release)
rem  Porting 1:1 dell'ex release.bat con label prefisso :rel_*
rem ============================================================
:menu_release
echo.
echo === Release completa ===
echo.
echo  Note: build LOCALE su Windows usa expo prebuild + Gradle diretto
echo  (eas build --local non e' supportato). Build LOCALE = arm64-v8a.
echo.

rem --- 1. PRE-CHECK tool ---
where node >nul 2>nul || (echo [!] Node.js non trovato. Lancia setup.bat. & pause & exit /b 1)
where git  >nul 2>nul || (echo [!] git non trovato. Lancia setup.bat. & pause & exit /b 1)
where eas  >nul 2>nul || (echo [!] EAS CLI non trovato. Lancia setup.bat. & pause & exit /b 1)
where gh   >nul 2>nul || (
    echo [!] GitHub CLI ^(gh^) non trovata.
    echo     Installala con:  winget install --id GitHub.cli -e
    pause
    exit /b 1
)
call :check_node_modules || exit /b 1

rem --- 2. PRE-CHECK identita' git e auth gh ---
git config user.name >nul 2>nul || (
    echo [!] git user.name non configurato.
    echo     Esegui:  git config --global user.name "Tuo Nome"
    echo              git config --global user.email "tu@example.com"
    pause
    exit /b 1
)

call gh auth status >nul 2>nul
if errorlevel 1 (
    echo [ ] GitHub CLI non autenticato. Avvio "gh auth login"...
    call gh auth login
    if errorlevel 1 (
        echo [!] gh auth login fallito.
        pause
        exit /b 1
    )
)

call "%~dp0scripts\ensure-git-push-auth.bat"
if errorlevel 1 (
    echo [!] Configurazione auth git push fallita.
    pause
    exit /b 1
)

rem --- 3. PRE-CHECK branch + working tree + sync ---
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "CURRENT_BRANCH=%%b"
if not "!CURRENT_BRANCH!"=="main" (
    echo [!] Sei sul branch "!CURRENT_BRANCH!", non "main".
    echo     Le release devono partire da main. Fai checkout e riprova.
    pause
    exit /b 1
)

set "_DIRTY=0"
for /f "delims=" %%s in ('git status --porcelain') do set "_DIRTY=1"
if "!_DIRTY!"=="1" (
    echo.
    echo [!] Working tree non pulito:
    git status --short
    echo.
    echo     Posso committare le modifiche tracciate ^(M/D^) come
    echo     "chore: pre-release sync" e proseguire. I file untracked
    echo     ^(?? sopra^) NON verranno toccati.
    echo.
    set "_AUTO="
    set /p "_AUTO=Auto-commit le modifiche tracciate? [s/N]: "
    if /i not "!_AUTO!"=="s" (
        echo Annullato. Sistema il working tree e rilancia.
        pause
        exit /b 1
    )
    call git add -u
    if errorlevel 1 (
        echo [!] git add -u fallito.
        pause
        exit /b 1
    )
    call git diff --cached --quiet
    if errorlevel 1 (
        echo [ ] Committo "chore: pre-release sync"...
        call git commit -m "chore: pre-release sync"
        if errorlevel 1 (
            echo [!] git commit fallito.
            pause
            exit /b 1
        )
    ) else (
        echo [!] Nessun file tracciato da committare ^(solo untracked^).
        pause
        exit /b 1
    )
)

echo [ ] git pull --ff-only...
call git pull --ff-only
if errorlevel 1 (
    echo [!] git pull --ff-only fallito.
    pause
    exit /b 1
)

rem --- 4. typecheck ---
echo [ ] Eseguo typecheck...
call npm run --silent typecheck
if errorlevel 1 (
    echo [!] Typecheck fallito. Sistema gli errori prima di rilasciare.
    pause
    exit /b 1
)

rem --- 5. CALCOLO VERSIONE ---
for /f "delims=" %%v in ('node scripts\bump-version.js current') do set "CUR_VER=%%v"
echo.
echo  Versione attuale: !CUR_VER!
echo  Tipo di bump:
echo    1^) patch  ^(X.Y.Z -^> X.Y.[Z+1]^)
echo    2^) minor  ^(X.Y.Z -^> X.[Y+1].0^)
echo    3^) major  ^(X.Y.Z -^> [X+1].0.0^)
echo    4^) custom
echo.
set "BUMP_CHOICE="
set /p "BUMP_CHOICE=Scegli [1-4]: "

set "NEW_VER="
if "!BUMP_CHOICE!"=="1" for /f "delims=" %%v in ('node scripts\bump-version.js next patch') do set "NEW_VER=%%v"
if "!BUMP_CHOICE!"=="2" for /f "delims=" %%v in ('node scripts\bump-version.js next minor') do set "NEW_VER=%%v"
if "!BUMP_CHOICE!"=="3" for /f "delims=" %%v in ('node scripts\bump-version.js next major') do set "NEW_VER=%%v"
if "!BUMP_CHOICE!"=="4" set /p "NEW_VER=Inserisci la nuova versione (es. 1.2.3): "
if "!NEW_VER!"=="" (
    echo [!] Versione vuota o scelta non valida.
    pause
    exit /b 1
)

set "TAG=v!NEW_VER!"
git rev-parse "!TAG!" >nul 2>nul
if not errorlevel 1 (
    echo [!] Tag !TAG! esiste gia' localmente.
    pause
    exit /b 1
)
git ls-remote --tags origin "!TAG!" 2>nul | findstr "!TAG!" >nul
if not errorlevel 1 (
    echo [!] Tag !TAG! esiste sul remoto.
    pause
    exit /b 1
)

rem --- 6. NOTE DI RILASCIO ---
set "NOTES_FILE=%TEMP%\fattrack-release-notes-!NEW_VER!.txt"
> "!NOTES_FILE!" echo # Note per FatTrack !NEW_VER! ^(le righe che iniziano con # vengono ignorate^)
>> "!NOTES_FILE!" echo # Scrivi qui sotto cosa cambia. Salva e chiudi notepad per continuare.
>> "!NOTES_FILE!" echo.

echo [ ] Apro notepad per le note di rilascio...
start "" /WAIT notepad "!NOTES_FILE!"

set "NOTES_CLEAN=%TEMP%\fattrack-release-notes-!NEW_VER!-clean.txt"
findstr /V /R "^#" "!NOTES_FILE!" > "!NOTES_CLEAN!"

set "HAS_CONTENT=0"
for /f "usebackq delims=" %%l in ("!NOTES_CLEAN!") do set "HAS_CONTENT=1"
if "!HAS_CONTENT!"=="0" (
    echo [!] Note vuote. Aborto.
    del "!NOTES_FILE!" >nul 2>nul
    del "!NOTES_CLEAN!" >nul 2>nul
    pause
    exit /b 1
)

rem --- 7. SCEGLI BUILD ---
echo.
echo  Build APK:
echo    1^) Locale  ^(2-4 min se cache calda^)
echo    2^) Cloud EAS ^(10-20 min, niente Android SDK locale^)
echo.
set "BUILD_CHOICE="
set /p "BUILD_CHOICE=Scegli [1-2]: "
if not "!BUILD_CHOICE!"=="1" if not "!BUILD_CHOICE!"=="2" (
    echo [!] Scelta non valida.
    del "!NOTES_FILE!" >nul 2>nul
    del "!NOTES_CLEAN!" >nul 2>nul
    pause
    exit /b 1
)

if "!BUILD_CHOICE!"=="1" (
    call :ensure_android_toolchain
    if errorlevel 1 (
        del "!NOTES_FILE!" >nul 2>nul
        del "!NOTES_CLEAN!" >nul 2>nul
        pause
        exit /b 1
    )
)

rem --- 8. RIEPILOGO + CONFERMA ---
echo.
echo ============================================================
echo  Riepilogo release
echo ============================================================
echo  Versione:    !CUR_VER!  -^>  !NEW_VER!
echo  Tag:         !TAG!
if "!BUILD_CHOICE!"=="1" echo  Build:       LOCALE ^(arm64-v8a^)
if "!BUILD_CHOICE!"=="2" echo  Build:       CLOUD EAS
echo  Branch:      main ^(commit + tag + push^)
echo  GitHub:      gh release create !TAG! ./fattrack.apk
echo ============================================================
set "CONFIRM="
set /p "CONFIRM=Procedo? [s/N]: "
if /i not "!CONFIRM!"=="s" (
    echo Annullato.
    del "!NOTES_FILE!" >nul 2>nul
    del "!NOTES_CLEAN!" >nul 2>nul
    exit /b 0
)

rem --- 9. APPLICA BUMP ---
echo.
echo [ ] Aggiorno app.json e version.json...
call node scripts\bump-version.js apply "!NEW_VER!" "!NOTES_CLEAN!"
if errorlevel 1 (
    echo [!] bump-version.js apply fallito.
    pause
    exit /b 1
)

rem --- 10. BUILD ---
set "APK_PATH="
if "!BUILD_CHOICE!"=="1" goto :rel_build_local
if "!BUILD_CHOICE!"=="2" goto :rel_build_cloud

:rel_build_local
echo.
echo [ ] Build LOCALE production ^(arm64-v8a^)...
call "%~dp0scripts\build-android-local.bat" "arm64-v8a" "fattrack.apk"
if errorlevel 1 (
    echo [!] Build locale fallita.
    goto :rel_rollback
)
set "APK_PATH=fattrack.apk"
if not exist "!APK_PATH!" (
    echo [!] APK atteso in "!APK_PATH!" ma non trovato.
    goto :rel_rollback
)
goto :rel_after_build

:rel_build_cloud
call eas whoami >nul 2>nul
if errorlevel 1 (
    call eas login || goto :rel_rollback
)
echo.
echo [ ] Build CLOUD production ^(attendo il completamento^)...
call eas build --platform android --profile production --non-interactive --wait
if errorlevel 1 (
    echo [!] Build cloud fallita.
    goto :rel_rollback
)

echo [ ] Recupero URL APK dall'ultima build...
set "BUILD_URL="
for /f "usebackq delims=" %%u in (`eas build:list --platform android --status finished --limit 1 --json --non-interactive ^| node -e "let d='';process.stdin.on('data',c=^>d+=c);process.stdin.on('end',()=^>{const a=JSON.parse(d);if(a[0]^&^&a[0].artifacts^&^&a[0].artifacts.buildUrl)process.stdout.write(a[0].artifacts.buildUrl);})"`) do set "BUILD_URL=%%u"
if "!BUILD_URL!"=="" (
    echo [!] Non sono riuscito a recuperare la URL dell'APK.
    goto :rel_rollback
)
echo [ ] Scarico !BUILD_URL!...
powershell -NoProfile -Command "Invoke-WebRequest -Uri '!BUILD_URL!' -OutFile 'fattrack.apk'"
if errorlevel 1 (
    echo [!] Download APK fallito.
    goto :rel_rollback
)
set "APK_PATH=fattrack.apk"

:rel_after_build

rem --- 11. COMMIT + TAG + PUSH ---
echo.
echo [ ] git add + commit + tag...
call git add app.json version.json
call git commit -m "release: !TAG!"
if errorlevel 1 (
    echo [!] git commit fallito.
    goto :rel_rollback
)
call git tag -a "!TAG!" -m "FatTrack !NEW_VER!"
if errorlevel 1 (
    echo [!] git tag fallito.
    goto :rel_rollback
)

echo [ ] git push origin main + tag...
call git push origin main
if errorlevel 1 (
    echo [!] git push origin main fallito.
    echo     Tag locale creato ma non pushato. Risolvi e riprova:
    echo         git push origin main
    echo         git push origin !TAG!
    pause
    exit /b 1
)
call git push origin "!TAG!"
if errorlevel 1 (
    echo [!] git push del tag fallito. Riprova:  git push origin !TAG!
    pause
    exit /b 1
)

rem --- 12. GITHUB RELEASE ---
echo.
echo [ ] Creo la GitHub Release "!TAG!" e carico l'APK...
call gh release create "!TAG!" "!APK_PATH!" --title "FatTrack !NEW_VER!" --notes-file "!NOTES_CLEAN!"
if errorlevel 1 (
    echo [!] gh release create fallita. Crea la release manualmente.
    pause
    exit /b 1
)

del "!NOTES_FILE!" >nul 2>nul
del "!NOTES_CLEAN!" >nul 2>nul

echo.
echo ============================================================
echo  RELEASE COMPLETATA
echo  Versione !NEW_VER! pubblicata. Gli utenti riceveranno
echo  l'alert al prossimo lancio dell'app.
echo ============================================================
pause
exit /b 0

:rel_rollback
echo.
echo [!] Rollback delle modifiche locali ad app.json e version.json...
call git checkout -- app.json version.json
del "!NOTES_FILE!" >nul 2>nul
del "!NOTES_CLEAN!" >nul 2>nul
pause
exit /b 1


rem ============================================================
rem  VOCE 5: Pubblica update OTA
rem ============================================================
:menu_ota
echo.
echo === Pubblica update OTA (JS/TS only) ===
echo.
echo  Usa per fix rapidi solo JS/TS/asset, senza ribuildare l'APK.
echo  NON usare se hai modificato dipendenze native, app.json o SDK.
echo.

call :check_node_modules || exit /b 1
call :require_tool eas "winget install --id Expo.EasCli -e oppure: npm i -g eas-cli" || exit /b 1
call :ensure_eas_login || exit /b 1

findstr /C:"\"projectId\": \"\"" app.json >nul
if not errorlevel 1 (
    echo [!] expo.extra.eas.projectId in app.json e' vuoto.
    echo     Configura una volta sola con:  eas init
    pause
    exit /b 1
)

where git >nul 2>nul
if not errorlevel 1 (
    for /f "delims=" %%s in ('git status --porcelain') do (
        echo [!] Modifiche non committate. L'OTA pubblichera' lo stato attuale.
        set "GOON="
        set /p "GOON=    Continuare? [s/N]: "
        if /i not "!GOON!"=="s" exit /b 1
        goto :ota_msg
    )
)

:ota_msg
set "MSG="
set /p "MSG=Messaggio update (es. 'fix calcolo kcal'): "
if "!MSG!"=="" (
    echo [!] Messaggio vuoto, uscita.
    pause
    exit /b 1
)

echo.
echo [ ] Pubblico OTA su branch "production"...
call eas update --branch production --message "!MSG!"
if errorlevel 1 (
    echo [!] eas update fallito.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  OTA pubblicato. Update consegnato al prossimo lancio app.
echo ============================================================
pause
exit /b 0


rem ============================================================
rem  VOCE 6: Verifica/installa dipendenze
rem ============================================================
:menu_deps
echo.
echo === Verifica/installa dipendenze ===
echo.
echo  [1] Mostra versioni tool installati
echo  [2] Reinstalla node_modules (npm install)
echo  [3] Installa toolchain Android (JDK17 + SDK)
echo  [4] Configura auth git push (gh credential helper)
echo  [0] Indietro
echo.
set "_D="
set /p "_D=Scelta: "
if "!_D!"=="0" exit /b 0
if "!_D!"=="1" goto :deps_versions
if "!_D!"=="2" goto :deps_npm
if "!_D!"=="3" goto :deps_android
if "!_D!"=="4" goto :deps_gh
echo [!] Scelta non valida.
timeout /t 1 >nul
goto :menu_deps

:deps_versions
echo.
call :show_tool node "Node.js"
call :show_tool npm  "npm"
call :show_tool git  "git"
call :show_tool eas  "EAS CLI"
call :show_tool gh   "GitHub CLI"
call :show_tool java "Java"
if defined ANDROID_HOME (
    echo [OK] ANDROID_HOME: !ANDROID_HOME!
) else (
    echo [!] ANDROID_HOME non settato.
)
echo.
pause
goto :menu_deps

:deps_npm
echo.
echo [ ] npm install...
call npm install
if errorlevel 1 echo [!] npm install fallito.
pause
goto :menu_deps

:deps_android
call :ensure_android_toolchain
pause
goto :menu_deps

:deps_gh
call "%~dp0scripts\ensure-git-push-auth.bat"
pause
goto :menu_deps


rem ============================================================
rem  HELPER: subroutine condivise
rem ============================================================

:check_node_modules
if exist "node_modules" exit /b 0
echo [!] "node_modules" mancante.
set "_NPMI="
set /p "_NPMI=Eseguo npm install ora? [s/N]: "
if /i not "!_NPMI!"=="s" (
    echo Annullato.
    exit /b 1
)
call npm install
if errorlevel 1 (
    echo [!] npm install fallito.
    exit /b 1
)
exit /b 0

:require_tool
rem  Uso: call :require_tool <nome_tool> <hint>
where %~1 >nul 2>nul
if errorlevel 1 (
    echo [!] %~1 non trovato.
    if not "%~2"=="" echo     Hint: %~2
    exit /b 1
)
exit /b 0

:show_tool
rem  Uso: call :show_tool <comando> <etichetta>
where %~1 >nul 2>nul
if errorlevel 1 (
    echo [!] %~2 non trovato.
    exit /b 0
)
for /f "delims=" %%v in ('%~1 --version 2^>nul') do (
    echo [OK] %~2: %%v
    exit /b 0
)
echo [OK] %~2 presente
exit /b 0

:ensure_eas_login
call eas whoami >nul 2>nul
if errorlevel 1 (
    echo [ ] Non sei loggato su EAS. Avvio "eas login"...
    call eas login
    if errorlevel 1 (
        echo [!] Login EAS fallito.
        exit /b 1
    )
)
for /f "delims=" %%u in ('eas whoami 2^>nul') do echo [OK] EAS: %%u
exit /b 0

:ensure_android_toolchain
set "_NEED_INSTALL=0"

where java >nul 2>nul
if errorlevel 1 (
    set "_NEED_INSTALL=1"
) else (
    set "_JAVA_OK=0"
    for /f "tokens=*" %%v in ('java -version 2^>^&1') do (
        echo %%v | findstr /C:"\"17." >nul && set "_JAVA_OK=1"
    )
    if "!_JAVA_OK!"=="0" set "_NEED_INSTALL=1"
)

set "_ANDROID_OK=0"
if defined ANDROID_HOME (
    if exist "!ANDROID_HOME!\cmdline-tools\latest\bin\sdkmanager.bat" set "_ANDROID_OK=1"
)
if "!_ANDROID_OK!"=="0" if defined ANDROID_SDK_ROOT (
    if exist "!ANDROID_SDK_ROOT!\cmdline-tools\latest\bin\sdkmanager.bat" (
        set "ANDROID_HOME=!ANDROID_SDK_ROOT!"
        set "_ANDROID_OK=1"
    )
)
if "!_ANDROID_OK!"=="0" set "_NEED_INSTALL=1"

if "!_NEED_INSTALL!"=="0" (
    echo [OK] Toolchain Android gia' configurata.
    exit /b 0
)

echo.
echo [!] Toolchain Android incompleta o assente.
echo     Posso installare:
echo       - JDK 17 ^(Adoptium Temurin via winget^)
echo       - Android SDK cmdline-tools ^(download diretto Google^)
echo       - platform-tools, platforms;android-34, build-tools;34.0.0
echo     Spazio: ~1.5 GB. Tempo: 5-10 min.
echo.
set "_GO="
set /p "_GO=Installo ora? [s/N]: "
if /i not "!_GO!"=="s" (
    echo Annullato. Installa manualmente o usa la build CLOUD.
    exit /b 1
)

echo.
echo [ ] Avvio installer PowerShell...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-android-build-tools.ps1"
if errorlevel 1 (
    echo [!] Auto-install fallita. Vedi i log sopra.
    exit /b 1
)

if not exist "%TEMP%\fattrack-android-env.cmd" (
    echo [!] Installer non ha generato il file env. Riapri il prompt e riprova.
    exit /b 1
)
call "%TEMP%\fattrack-android-env.cmd"
del "%TEMP%\fattrack-android-env.cmd" >nul 2>nul
echo [OK] Toolchain pronta nella sessione corrente.
exit /b 0
