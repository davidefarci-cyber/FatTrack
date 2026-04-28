# Sostituisce la riga "reactNativeArchitectures=..." in
# android\gradle.properties con il valore passato in -Abi. Se la riga
# non c'è, la appende. Necessario perché il template Expo SDK 51 contiene
# come default "reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64"
# (universal) e il flag -PreactNativeArchitectures sulla command line di
# Gradle in alcuni casi edge non viene onorato dal task mergeReleaseNativeLibs
# (cache dei task non invalidata) -> APK con 4 ABI nonostante il flag.
# Modificare il file alla radice elimina ogni ambiguità.
param([Parameter(Mandatory=$true)][string]$Abi)

$file = Join-Path $PSScriptRoot '..\android\gradle.properties'
if (-not (Test-Path $file)) {
    Write-Error "gradle.properties non trovato: $file"
    exit 1
}

$content = Get-Content $file -Raw
$pattern = '(?m)^reactNativeArchitectures=.*$'
if ($content -match $pattern) {
    $content = $content -replace $pattern, "reactNativeArchitectures=$Abi"
} else {
    $content = $content.TrimEnd("`r","`n") + "`r`nreactNativeArchitectures=$Abi`r`n"
}
Set-Content -Path $file -Value $content -NoNewline
Write-Host "[OK] gradle.properties: reactNativeArchitectures=$Abi"
