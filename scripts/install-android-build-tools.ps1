# Auto-installer per la toolchain Android usata da `eas build --local`.
# Installa (se mancanti):
#   - JDK 17 (Adoptium Temurin) via winget
#   - Android SDK cmdline-tools (download diretto da Google)
#   - platform-tools, platforms;android-34, build-tools;34.0.0 via sdkmanager
#   - Accetta le licenze SDK in modo non interattivo
#
# Imposta JAVA_HOME, ANDROID_HOME e Path sia a livello User (persistente)
# sia per la sessione corrente. Inoltre scrive un piccolo file .cmd in %TEMP%
# che il batch chiamante puo' "call"are per importare le var nella propria shell
# (utile perche' un processo figlio non puo' modificare l'env del padre).
#
# Uso (dal .bat):
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts\install-android-build-tools.ps1
#   if exist "%TEMP%\fattrack-android-env.cmd" call "%TEMP%\fattrack-android-env.cmd"

[CmdletBinding()]
param(
    [string]$AndroidHome = (Join-Path $env:USERPROFILE 'Android'),
    [string]$CmdlineToolsUrl = 'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip',
    [string]$AndroidPlatform = 'platforms;android-34',
    [string]$BuildTools = 'build-tools;34.0.0'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'   # Invoke-WebRequest e' molto piu' veloce senza progress bar

function Write-Step($msg)  { Write-Host "[ ] $msg" }
function Write-Ok  ($msg)  { Write-Host "[OK] $msg" }
function Write-Warn($msg)  { Write-Host "[!] $msg" -ForegroundColor Yellow }

function Find-JdkHome {
    $candidates = @(
        'C:\Program Files\Eclipse Adoptium',
        (Join-Path $env:LOCALAPPDATA 'Programs\Eclipse Adoptium')
    )
    foreach ($base in $candidates) {
        if (Test-Path $base) {
            $hit = Get-ChildItem $base -Directory -ErrorAction SilentlyContinue |
                Where-Object { $_.Name -like 'jdk-17*' } |
                Sort-Object Name -Descending |
                Select-Object -First 1
            if ($hit) { return $hit.FullName }
        }
    }
    return $null
}

function Test-Java17 {
    try {
        $out = & java -version 2>&1
        return ($out -join "`n") -match 'version "17\.'
    } catch {
        return $false
    }
}

function Ensure-Winget {
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        throw "winget non disponibile. Installa 'App Installer' dal Microsoft Store: https://apps.microsoft.com/detail/9NBLGGH4NNS1"
    }
}

# ============================================================
# JDK 17
# ============================================================
$javaHome = $env:JAVA_HOME
if ($javaHome -and (Test-Path (Join-Path $javaHome 'bin\java.exe'))) {
    Write-Ok "JAVA_HOME gia' impostato: $javaHome"
} else {
    $javaHome = Find-JdkHome
    if (-not $javaHome) {
        Ensure-Winget
        Write-Step 'Installo JDK 17 (Adoptium Temurin) con winget...'
        & winget install --id EclipseAdoptium.Temurin.17.JDK -e --silent `
            --accept-package-agreements --accept-source-agreements | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "winget install JDK 17 fallita (exit $LASTEXITCODE)" }
        $javaHome = Find-JdkHome
        if (-not $javaHome) { throw 'JDK 17 non trovato dopo l''installazione winget.' }
    }
    Write-Ok "JDK 17 trovato in $javaHome"
}

$env:JAVA_HOME = $javaHome
$env:Path = "$javaHome\bin;$env:Path"
[Environment]::SetEnvironmentVariable('JAVA_HOME', $javaHome, 'User')

# ============================================================
# Android SDK: cmdline-tools
# ============================================================
$existingHome = $env:ANDROID_HOME
if (-not $existingHome) { $existingHome = $env:ANDROID_SDK_ROOT }
if ($existingHome -and (Test-Path (Join-Path $existingHome 'cmdline-tools\latest\bin\sdkmanager.bat'))) {
    $AndroidHome = $existingHome
    Write-Ok "ANDROID_HOME gia' valido: $AndroidHome"
} else {
    $cmdToolsParent = Join-Path $AndroidHome 'cmdline-tools'
    $latestDir      = Join-Path $cmdToolsParent 'latest'
    $sdkmanagerBat  = Join-Path $latestDir 'bin\sdkmanager.bat'

    if (-not (Test-Path $sdkmanagerBat)) {
        Write-Step "Preparo cartella $AndroidHome..."
        New-Item -ItemType Directory -Force -Path $cmdToolsParent | Out-Null

        $zipPath = Join-Path $env:TEMP 'fattrack-cmdline-tools.zip'
        Write-Step "Scarico Android cmdline-tools da $CmdlineToolsUrl ..."
        Invoke-WebRequest -Uri $CmdlineToolsUrl -OutFile $zipPath -UseBasicParsing
        Write-Step 'Estraggo cmdline-tools...'
        # Pulisci eventuali residui di un'estrazione precedente
        $tempExtract = Join-Path $cmdToolsParent 'cmdline-tools'
        if (Test-Path $tempExtract) { Remove-Item $tempExtract -Recurse -Force }
        Expand-Archive -Path $zipPath -DestinationPath $cmdToolsParent -Force
        # Lo zip estrae in cmdline-tools\cmdline-tools\* — ma noi siamo gia' dentro
        # cmdline-tools\, quindi diventa cmdline-tools\cmdline-tools. Rinomina in 'latest'.
        if (Test-Path $latestDir) { Remove-Item $latestDir -Recurse -Force }
        Move-Item $tempExtract $latestDir
        Remove-Item $zipPath -Force -ErrorAction SilentlyContinue
        Write-Ok "cmdline-tools installati in $latestDir"
    } else {
        Write-Ok "cmdline-tools gia' presenti in $latestDir"
    }
}

$env:ANDROID_HOME = $AndroidHome
$env:ANDROID_SDK_ROOT = $AndroidHome   # alcuni tool usano ancora il vecchio nome
$env:Path = "$AndroidHome\cmdline-tools\latest\bin;$AndroidHome\platform-tools;$env:Path"
[Environment]::SetEnvironmentVariable('ANDROID_HOME', $AndroidHome, 'User')
[Environment]::SetEnvironmentVariable('ANDROID_SDK_ROOT', $AndroidHome, 'User')

# ============================================================
# Accetta licenze + installa pacchetti SDK
# ============================================================
$sdkmanager = Join-Path $AndroidHome 'cmdline-tools\latest\bin\sdkmanager.bat'
if (-not (Test-Path $sdkmanager)) { throw "sdkmanager non trovato in $sdkmanager" }

Write-Step 'Accetto licenze SDK (non interattivo)...'
# Pipa una sequenza di "y" per ogni licenza chiesta.
# 30 e' abbondante: di solito sono 6-8 licenze.
$ys = ('y' * 30) -split '' | Where-Object { $_ } | ForEach-Object { 'y' }
$ys | & $sdkmanager --licenses --sdk_root="$AndroidHome" 2>&1 | Out-Null
# Se exit code != 0 ma le licenze sono comunque state accettate, proseguiamo:
# il vero test e' se i pacchetti si installano dopo.

Write-Step "Installo platform-tools, $AndroidPlatform, $BuildTools..."
& $sdkmanager --sdk_root="$AndroidHome" 'platform-tools' $AndroidPlatform $BuildTools | Out-Host
if ($LASTEXITCODE -ne 0) {
    throw "sdkmanager install fallita (exit $LASTEXITCODE). Possibili cause: licenze non accettate, rete, spazio disco."
}
Write-Ok 'Pacchetti SDK installati.'

# ============================================================
# Aggiorna PATH user-level (persistente) in modo idempotente
# ============================================================
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $userPath) { $userPath = '' }
$pathsToAdd = @(
    (Join-Path $javaHome 'bin'),
    (Join-Path $AndroidHome 'cmdline-tools\latest\bin'),
    (Join-Path $AndroidHome 'platform-tools')
)
$changed = $false
foreach ($p in $pathsToAdd) {
    $segments = $userPath -split ';' | Where-Object { $_ -ne '' }
    if ($segments -notcontains $p) {
        $userPath = if ($userPath) { "$p;$userPath" } else { $p }
        $changed = $true
    }
}
if ($changed) {
    [Environment]::SetEnvironmentVariable('Path', $userPath, 'User')
    Write-Ok "PATH utente aggiornato (verra' visto da nuovi prompt automaticamente)."
}

# ============================================================
# Esporta env per il batch chiamante (env del figlio non torna al padre)
# ============================================================
$envFile = Join-Path $env:TEMP 'fattrack-android-env.cmd'
@"
@echo off
rem File generato automaticamente da install-android-build-tools.ps1
rem Importa JAVA_HOME, ANDROID_HOME, ANDROID_SDK_ROOT e PATH nella shell corrente.
set "JAVA_HOME=$javaHome"
set "ANDROID_HOME=$AndroidHome"
set "ANDROID_SDK_ROOT=$AndroidHome"
set "PATH=$javaHome\bin;$AndroidHome\cmdline-tools\latest\bin;$AndroidHome\platform-tools;%PATH%"
"@ | Set-Content -Path $envFile -Encoding ASCII

Write-Ok "Toolchain pronta. JAVA_HOME=$javaHome  ANDROID_HOME=$AndroidHome"
Write-Host ''
Write-Host "  -> File env temporaneo: $envFile"
exit 0
