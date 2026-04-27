@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================================
echo  FatTrack - Release end-to-end
echo  Bumpa la versione, builda l'APK, taggа, pubblica su GitHub
echo ============================================================
echo.
echo  Nota: la release builda solo arm64-v8a ^(impostato in eas.json^).
echo  Per un APK armeabi-v7a spot ^(amico con device vecchio^) usa
echo  crea-apk-locale.bat e scegli "armeabi-v7a" al prompt ABI.
echo.

rem ============================================================
rem  1. PRE-CHECK: tool installati
rem ============================================================
echo [ ] Verifico i tool richiesti...

where node >nul 2>nul || (echo [!] Node.js non trovato. Lancia setup.bat. & pause & exit /b 1)
where git >nul 2>nul || (echo [!] git non trovato. Lancia setup.bat. & pause & exit /b 1)
where eas >nul 2>nul || (echo [!] EAS CLI non trovato. Lancia setup.bat. & pause & exit /b 1)
where gh >nul 2>nul
if errorlevel 1 (
    echo [!] GitHub CLI ^(gh^) non trovata.
    echo     Installala con:  winget install --id GitHub.cli -e
    echo     Poi chiudi e riapri il prompt.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [!] "node_modules" mancante. Lancia prima setup.bat.
    pause
    exit /b 1
)

rem ============================================================
rem  2. PRE-CHECK: identita' git e auth gh
rem ============================================================
git config user.name >nul 2>nul || (
    echo [!] git non configurato ^(user.name^).
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

rem ============================================================
rem  3. PRE-CHECK: branch + working tree pulito + sync con remoto
rem ============================================================
for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD') do set "CURRENT_BRANCH=%%b"
if not "!CURRENT_BRANCH!"=="main" (
    echo [!] Sei sul branch "!CURRENT_BRANCH!", non "main".
    echo     Le release devono partire da main. Fai checkout e riprova.
    pause
    exit /b 1
)

for /f "delims=" %%s in ('git status --porcelain') do (
    echo [!] Hai modifiche non committate nel working tree:
    git status --short
    echo     Committa o stasha prima di rilasciare.
    pause
    exit /b 1
)

echo [ ] Aggiorno il branch da remoto ^(git pull --ff-only^)...
call git pull --ff-only
if errorlevel 1 (
    echo [!] git pull --ff-only fallito ^(forse il remoto e' avanti con merge?^).
    echo     Risolvi e riprova.
    pause
    exit /b 1
)

rem ============================================================
rem  4. PRE-CHECK: typecheck
rem ============================================================
echo [ ] Eseguo typecheck...
call npm run --silent typecheck
if errorlevel 1 (
    echo [!] Typecheck fallito. Sistema gli errori prima di rilasciare.
    pause
    exit /b 1
)

rem ============================================================
rem  5. CALCOLO VERSIONE
rem ============================================================
for /f "delims=" %%v in ('node scripts\bump-version.js current') do set "CUR_VER=%%v"
echo.
echo  Versione attuale: !CUR_VER!
echo.
echo  Tipo di bump:
echo    1^) patch  ^(bugfix:    X.Y.Z -^> X.Y.[Z+1]^)
echo    2^) minor  ^(feature:   X.Y.Z -^> X.[Y+1].0^)
echo    3^) major  ^(breaking:  X.Y.Z -^> [X+1].0.0^)
echo    4^) custom ^(specifica tu^)
echo.
set /p "BUMP_CHOICE=Scegli [1-4]: "

set "NEW_VER="
if "!BUMP_CHOICE!"=="1" (
    for /f "delims=" %%v in ('node scripts\bump-version.js next patch') do set "NEW_VER=%%v"
) else if "!BUMP_CHOICE!"=="2" (
    for /f "delims=" %%v in ('node scripts\bump-version.js next minor') do set "NEW_VER=%%v"
) else if "!BUMP_CHOICE!"=="3" (
    for /f "delims=" %%v in ('node scripts\bump-version.js next major') do set "NEW_VER=%%v"
) else if "!BUMP_CHOICE!"=="4" (
    set /p "NEW_VER=Inserisci la nuova versione (es. 1.2.3): "
) else (
    echo [!] Scelta non valida.
    pause
    exit /b 1
)

if "!NEW_VER!"=="" (
    echo [!] Versione vuota.
    pause
    exit /b 1
)

set "TAG=v!NEW_VER!"

rem Tag gia' esistente?
git rev-parse "!TAG!" >nul 2>nul
if not errorlevel 1 (
    echo [!] Tag !TAG! esiste gia'. Scegli una versione diversa.
    pause
    exit /b 1
)
git ls-remote --tags origin "!TAG!" 2>nul | findstr "!TAG!" >nul
if not errorlevel 1 (
    echo [!] Tag !TAG! esiste sul remoto. Scegli una versione diversa.
    pause
    exit /b 1
)

rem ============================================================
rem  6. NOTE DI RILASCIO ^(editor^)
rem ============================================================
set "NOTES_FILE=%TEMP%\fattrack-release-notes-!NEW_VER!.txt"
> "!NOTES_FILE!" echo # Note per FatTrack !NEW_VER! ^(le righe che iniziano con # vengono ignorate^)
>> "!NOTES_FILE!" echo # Scrivi qui sotto cosa cambia in questa release.
>> "!NOTES_FILE!" echo # Salva e chiudi notepad per continuare.
>> "!NOTES_FILE!" echo.

echo.
echo [ ] Apro notepad per le note di rilascio...
start "" /WAIT notepad "!NOTES_FILE!"

rem Rimuovi righe che iniziano con #
set "NOTES_CLEAN=%TEMP%\fattrack-release-notes-!NEW_VER!-clean.txt"
findstr /V /R "^#" "!NOTES_FILE!" > "!NOTES_CLEAN!"

rem Verifica che ci sia almeno una riga non vuota
set "HAS_CONTENT=0"
for /f "usebackq delims=" %%l in ("!NOTES_CLEAN!") do set "HAS_CONTENT=1"
if "!HAS_CONTENT!"=="0" (
    echo [!] Note vuote. Aborto.
    del "!NOTES_FILE!" >nul 2>nul
    del "!NOTES_CLEAN!" >nul 2>nul
    pause
    exit /b 1
)

rem ============================================================
rem  7. SCEGLI METODO BUILD
rem ============================================================
echo.
echo  Build APK:
echo    1^) Locale  ^(consigliato: 2-4 min se cache calda, niente coda^)
echo    2^) Cloud EAS ^(10-20 min, ma niente Android SDK^)
echo.
set /p "BUILD_CHOICE=Scegli [1-2]: "

if not "!BUILD_CHOICE!"=="1" if not "!BUILD_CHOICE!"=="2" (
    echo [!] Scelta non valida.
    pause
    exit /b 1
)

rem Per la build locale, verifica/installa la toolchain PRIMA di toccare i file
rem ^(cosi' se l'utente rifiuta l'install non c'e' bump da rollbackare^).
if "!BUILD_CHOICE!"=="1" (
    call :ensure_android_toolchain
    if errorlevel 1 (
        del "!NOTES_FILE!" >nul 2>nul
        del "!NOTES_CLEAN!" >nul 2>nul
        pause
        exit /b 1
    )
)

rem ============================================================
rem  8. RIEPILOGO + CONFERMA
rem ============================================================
echo.
echo ============================================================
echo  Riepilogo release
echo ============================================================
echo  Versione:    !CUR_VER!  -^>  !NEW_VER!
echo  Tag:         !TAG!
if "!BUILD_CHOICE!"=="1" echo  Build:       LOCALE ^(eas build --local^)
if "!BUILD_CHOICE!"=="2" echo  Build:       CLOUD EAS
echo  Note:        !NOTES_CLEAN!
echo  Branch:      main ^(commit + tag + push^)
echo  GitHub:      gh release create !TAG! ./fattrack.apk
echo ============================================================
set /p "CONFIRM=Procedo? [s/N]: "
if /i not "!CONFIRM!"=="s" (
    echo Annullato.
    del "!NOTES_FILE!" >nul 2>nul
    del "!NOTES_CLEAN!" >nul 2>nul
    exit /b 0
)

rem ============================================================
rem  9. APPLICA BUMP VERSIONE ^(scrive su app.json + version.json^)
rem ============================================================
echo.
echo [ ] Aggiorno app.json e version.json...
call node scripts\bump-version.js apply "!NEW_VER!" "!NOTES_CLEAN!"
if errorlevel 1 (
    echo [!] bump-version.js apply fallito.
    pause
    exit /b 1
)

rem ============================================================
rem  10. BUILD
rem ============================================================
set "APK_PATH="
if "!BUILD_CHOICE!"=="1" goto :build_local
if "!BUILD_CHOICE!"=="2" goto :build_cloud

:build_local
rem Forza arm64-v8a anche se eas.json non venisse propagato al subprocess
rem Gradle. Coerente con il default del profilo production.
set "ORG_GRADLE_PROJECT_reactNativeArchitectures=arm64-v8a"

rem Toolchain gia' verificata/installata al passo 7b. Solo login EAS qui.
call eas whoami >nul 2>nul
if errorlevel 1 (
    call eas login || goto :rollback
)

echo.
echo [ ] Build LOCALE production...
call eas build --platform android --profile production --local --output "fattrack.apk" --non-interactive
if errorlevel 1 (
    echo [!] Build locale fallita.
    goto :rollback
)
set "APK_PATH=fattrack.apk"
if not exist "!APK_PATH!" (
    echo [!] APK atteso in "!APK_PATH!" ma non trovato.
    goto :rollback
)
goto :after_build

:build_cloud
call eas whoami >nul 2>nul
if errorlevel 1 (
    call eas login || goto :rollback
)
echo.
echo [ ] Build CLOUD production ^(attendo il completamento^)...
call eas build --platform android --profile production --non-interactive --wait
if errorlevel 1 (
    echo [!] Build cloud fallita.
    goto :rollback
)

rem Recupera l'URL dell'ultima build completata e scaricala
echo [ ] Recupero URL APK dall'ultima build...
for /f "usebackq delims=" %%u in (`eas build:list --platform android --status finished --limit 1 --json --non-interactive ^| node -e "let d='';process.stdin.on('data',c=^>d+=c);process.stdin.on('end',()=^>{const a=JSON.parse(d);if(a[0]^&^&a[0].artifacts^&^&a[0].artifacts.buildUrl)process.stdout.write(a[0].artifacts.buildUrl);})"`) do set "BUILD_URL=%%u"
if "!BUILD_URL!"=="" (
    echo [!] Non sono riuscito a recuperare la URL dell'APK. Scaricalo a mano da expo.dev e rilancia gh release create.
    goto :rollback
)
echo [ ] Scarico !BUILD_URL!...
powershell -NoProfile -Command "Invoke-WebRequest -Uri '!BUILD_URL!' -OutFile 'fattrack.apk'"
if errorlevel 1 (
    echo [!] Download APK fallito.
    goto :rollback
)
set "APK_PATH=fattrack.apk"

:after_build

rem ============================================================
rem  11. COMMIT + TAG + PUSH
rem ============================================================
echo.
echo [ ] git add + commit + tag...
call git add app.json version.json
call git commit -m "release: !TAG!"
if errorlevel 1 (
    echo [!] git commit fallito.
    goto :rollback
)
call git tag -a "!TAG!" -m "FatTrack !NEW_VER!"
if errorlevel 1 (
    echo [!] git tag fallito.
    goto :rollback
)

echo [ ] git push origin main + tag...
call git push origin main
if errorlevel 1 (
    echo [!] git push origin main fallito.
    echo     Il tag locale e' stato creato ma non pushato. Risolvi e riprova manualmente:
    echo         git push origin main
    echo         git push origin !TAG!
    pause
    exit /b 1
)
call git push origin "!TAG!"
if errorlevel 1 (
    echo [!] git push del tag fallito. Riprova manualmente:  git push origin !TAG!
    pause
    exit /b 1
)

rem ============================================================
rem  12. GITHUB RELEASE
rem ============================================================
echo.
echo [ ] Creo la GitHub Release "!TAG!" e carico l'APK...
call gh release create "!TAG!" "!APK_PATH!" --title "FatTrack !NEW_VER!" --notes-file "!NOTES_CLEAN!"
if errorlevel 1 (
    echo [!] gh release create fallita. Crea la release manualmente con:
    echo         gh release create !TAG! !APK_PATH! --title "FatTrack !NEW_VER!" --notes-file "!NOTES_CLEAN!"
    pause
    exit /b 1
)

del "!NOTES_FILE!" >nul 2>nul
del "!NOTES_CLEAN!" >nul 2>nul

echo.
echo ============================================================
echo  RELEASE COMPLETATA
echo  Versione !NEW_VER! pubblicata.
echo  Gli utenti riceveranno l'alert al prossimo lancio dell'app.
echo ============================================================
pause
exit /b 0

:rollback
echo.
echo [!] Rollback delle modifiche locali ad app.json e version.json...
call git checkout -- app.json version.json
del "!NOTES_FILE!" >nul 2>nul
del "!NOTES_CLEAN!" >nul 2>nul
pause
exit /b 1


rem ============================================================
rem  Subroutine: verifica JDK17 + ANDROID_HOME, installa se manca
rem  ^(stessa logica di crea-apk-locale.bat^)
rem ============================================================
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
echo     Posso installare automaticamente:
echo       - JDK 17 ^(Adoptium Temurin, via winget^)
echo       - Android SDK cmdline-tools ^(download diretto da Google^)
echo       - platform-tools, platforms;android-34, build-tools;34.0.0
echo       - Accettazione licenze SDK
echo     Spazio richiesto: ~1.5 GB. Tempo: 5-10 minuti.
echo.
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

endlocal
