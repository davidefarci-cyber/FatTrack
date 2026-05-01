@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul

rem ============================================================
rem  scripts\build-android-local.bat
rem  Build Android APK locale su Windows usando expo prebuild + Gradle
rem  diretto (bypassa "eas build --local" che NON funziona su Windows).
rem
rem  Uso:
rem    scripts\build-android-local.bat <abi> <output-apk-name>
rem
rem  Args:
rem    %1 abi             : arm64-v8a | armeabi-v7a | universal
rem    %2 output-apk-name : nome del file .apk finale nella root del repo
rem                         (es. "fattrack.apk" oppure "fattrack-arm64.apk")
rem
rem  Prerequisiti (gestiti dai .bat chiamanti via :ensure_android_toolchain):
rem    - JDK 17 sul PATH (JAVA_HOME settato)
rem    - Android SDK installato (ANDROID_HOME settato)
rem    - node_modules presente
rem
rem  Output:
rem    - L'APK firmato (con la debug.keystore stabile, vedi sotto) viene
rem      copiato in <repo-root>\<output-apk-name>.
rem
rem  Keystore:
rem    - La PRIMA build genera una debug.keystore tramite expo prebuild +
rem      Gradle e la copia in keystore\debug.keystore (NON committata).
rem    - Le build successive ripristinano sempre quella keystore prima di
rem      buildare, cosi' tutte le release sono firmate con la stessa chiave
rem      e Android puo' fare l'update senza disinstall.
rem    - SE PERDI keystore\debug.keystore, gli utenti dovranno disinstallare
rem      manualmente prima di poter installare la nuova versione.
rem ============================================================

set "ABI=%~1"
set "OUTPUT_APK=%~2"

if "!ABI!"=="" (
    echo [!] build-android-local: manca primo argomento ^(ABI^).
    exit /b 1
)
if "!OUTPUT_APK!"=="" (
    echo [!] build-android-local: manca secondo argomento ^(output APK name^).
    exit /b 1
)

rem Risali alla root del repo (questo script vive in scripts\)
pushd "%~dp0\.."
set "REPO_ROOT=%CD%"
popd
cd /d "!REPO_ROOT!"

rem ============================================================
rem  1. Argomento Gradle per le ABI
rem ============================================================
set "GRADLE_ABI_ARG="
if /i "!ABI!"=="universal" (
    rem Niente arg: vince il default di gradle.properties (tutte le ABI).
    echo [ ] ABI: universal ^(tutte e 4, APK piu' grande^)
) else (
    set "GRADLE_ABI_ARG=-PreactNativeArchitectures=!ABI!"
    echo [ ] ABI: !ABI!
)

rem ============================================================
rem  2. expo prebuild (genera o aggiorna la cartella android\)
rem
rem  Detect leftover OTA: se un prebuild PRECEDENTE aveva
rem  expo-updates configurato, AndroidManifest.xml contiene meta-data
rem  expo.modules.updates.* che ora sono incoerenti col nuovo app.json
rem  (no runtimeVersion, no expo-updates in deps). Senza --clean,
rem  prebuild aborta con:
rem    "A runtime version is set in your AndroidManifest.xml, but is
rem     missing from your app.json".
rem  Soluzione: una tantum forziamo --clean, prebuild rigenera il
rem  manifest da zero senza i meta-data OTA. La keystore stabile resta
rem  in keystore\debug.keystore (root) e viene ripristinata nello step 3.
rem ============================================================
set "PREBUILD_FLAGS=--platform android --no-install"
set "_MANIFEST=android\app\src\main\AndroidManifest.xml"
if exist "!_MANIFEST!" (
    findstr /C:"expo.modules.updates.EXPO_RUNTIME_VERSION" "!_MANIFEST!" >nul 2>nul
    if not errorlevel 1 (
        echo [!] AndroidManifest.xml contiene meta-data OTA da prebuild precedente.
        echo     Forzo --clean per rigenerare android\ pulito ^(la keystore
        echo     stabile in keystore\ non viene toccata^).
        set "PREBUILD_FLAGS=--platform android --no-install --clean"
    )
)

echo [ ] Eseguo expo prebuild !PREBUILD_FLAGS!...
call npx --yes expo prebuild !PREBUILD_FLAGS!
if errorlevel 1 (
    echo [!] expo prebuild fallito.
    exit /b 1
)

if not exist "android\app\build.gradle" (
    echo [!] android\app\build.gradle non trovato dopo prebuild. Stato inconsistente.
    exit /b 1
)

rem ============================================================
rem  2-bis. Forza arm64-only su due livelli (post-prebuild)
rem
rem  reactNativeArchitectures (gradle.properties): controlla quali .so
rem  RN core compila. Da solo NON basta: i moduli nativi di terze parti
rem  (expo-camera, expo-sqlite, react-native-screens, ...) hanno le loro
rem  .so precompilate per tutte le 4 ABI nei rispettivi AAR e quelle
rem  finiscono nell'APK indipendentemente da reactNativeArchitectures.
rem
rem  ndk.abiFilters (build.gradle defaultConfig): filtra le ABI a livello
rem  di packaging finale dell'APK. Anche se le .so per altre ABI esistono
rem  nei dipendency, vengono escluse dall'APK. Questo e' il fix che
rem  davvero porta l'APK a ~30-40 MB.
rem ============================================================
if /i not "!ABI!"=="universal" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0force-react-native-architectures.ps1" -Abi "!ABI!"
    if errorlevel 1 (
        echo [!] Impossibile aggiornare gradle.properties.
        exit /b 1
    )
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0force-abi-filters.ps1" -Abi "!ABI!"
    if errorlevel 1 (
        echo [!] Impossibile aggiornare android\app\build.gradle.
        exit /b 1
    )
)

rem ============================================================
rem  3. Keystore: backup primo run, restore le altre volte
rem ============================================================
if not exist "keystore" mkdir "keystore"

if exist "keystore\debug.keystore" (
    rem Restore: assicura che la build usi sempre LA STESSA chiave
    copy /Y "keystore\debug.keystore" "android\app\debug.keystore" >nul
    echo [OK] keystore\debug.keystore ripristinato in android\app\
) else (
    rem Prima volta: backup di quella generata da prebuild
    if not exist "android\app\debug.keystore" (
        echo [!] android\app\debug.keystore non trovato dopo prebuild. Anomalo.
        exit /b 1
    )
    copy /Y "android\app\debug.keystore" "keystore\debug.keystore" >nul
    echo.
    echo ========================================================
    echo  PRIMA BUILD: backup di debug.keystore -^> keystore\debug.keystore
    echo  ATTENZIONE: questo file e' la firma di TUTTE le tue release.
    echo  - NON va committato ^(lo gitignoriamo^).
    echo  - FANNE UNA COPIA SU CLOUD/USB.
    echo  - Se lo perdi, gli utenti dovranno disinstallare l'app
    echo    per poter installare versioni nuove ^(firma diversa^).
    echo ========================================================
    echo.
)

rem ============================================================
rem  4. Gradle assembleRelease (incrementale, no clean automatico)
rem
rem  abiFilters in build.gradle filtra le ABI a livello di packaging,
rem  quindi non serve "gradlew clean" preventivo per produrre arm64-only.
rem  Se la build sembra rotta (output stranamente grande, .so vecchie
rem  che si ostinano a entrare, ...), pulisci la cache da:
rem    fattrack.bat -> [5] Verifica/installa dipendenze -> Pulisci cache build
rem ============================================================
echo.
echo [ ] Avvio Gradle assembleRelease...
echo     ^(prima volta: scarica Gradle wrapper + dipendenze, 5-10 min^)
echo     ^(successive: incrementale, 1-3 min^)
echo.

pushd android
call gradlew.bat assembleRelease !GRADLE_ABI_ARG!
set "GRADLE_RC=!errorlevel!"
popd

if not "!GRADLE_RC!"=="0" (
    echo [!] Gradle build fallita ^(exit !GRADLE_RC!^).
    exit /b 1
)

rem ============================================================
rem  5. Copia APK in root con nome richiesto
rem ============================================================
set "APK_SRC=android\app\build\outputs\apk\release\app-release.apk"
if not exist "!APK_SRC!" (
    echo [!] APK atteso in !APK_SRC! ma non trovato.
    exit /b 1
)

copy /Y "!APK_SRC!" "!OUTPUT_APK!" >nul
if errorlevel 1 (
    echo [!] Copia APK fallita.
    exit /b 1
)

echo.
echo [OK] APK pronto: !OUTPUT_APK!
for %%I in ("!OUTPUT_APK!") do (
    set /a "_SIZE_MB=%%~zI / 1024 / 1024"
    echo      Dimensione: %%~zI bytes ^(circa !_SIZE_MB! MB^)
)
exit /b 0
