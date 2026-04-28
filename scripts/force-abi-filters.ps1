# Inietta "ndk { abiFilters \"<Abi>\" }" dentro il blocco defaultConfig di
# android\app\build.gradle. abiFilters agisce a livello di packaging finale
# dell'APK: anche se le .so per altre ABI esistono nelle dipendenze
# (expo-camera, expo-sqlite, react-native-screens hanno .so precompilate per
# tutte le 4 ABI), vengono escluse dall'APK. La sola property
# reactNativeArchitectures controlla solo le .so di RN core, non quelle dei
# moduli nativi di terze parti.
#
# Idempotente: se il blocco ndk con abiFilters esiste gia' dentro
# defaultConfig, viene sostituito col valore richiesto.

param([Parameter(Mandatory=$true)][string]$Abi)

$file = Join-Path $PSScriptRoot '..\android\app\build.gradle'
if (-not (Test-Path $file)) {
    Write-Error "build.gradle non trovato: $file"
    exit 1
}

$ndkLine = '        ndk { abiFilters "' + $Abi + '" }'
$lines = Get-Content $file
$out = New-Object System.Collections.Generic.List[string]
$inDefault = $false
$depth = 0
$injected = $false

foreach ($line in $lines) {
    # Skippa una eventuale ndk { abiFilters ... } gia' presente: la sostituiremo.
    if ($inDefault -and ($line -match '^\s*ndk\s*\{\s*abiFilters\s*[^}]*\}\s*$')) {
        continue
    }

    if (-not $inDefault) {
        $out.Add($line)
        if ($line -match '^\s*defaultConfig\s*\{') {
            $inDefault = $true
            $opens = ([regex]::Matches($line, '\{')).Count
            $closes = ([regex]::Matches($line, '\}')).Count
            $depth = $opens - $closes
            if ($depth -le 0) {
                # Caso edge: defaultConfig {} su singola riga (vuoto)
                $out.Insert($out.Count - 1, $ndkLine)
                $injected = $true
                $inDefault = $false
            }
        }
        continue
    }

    $opens = ([regex]::Matches($line, '\{')).Count
    $closes = ([regex]::Matches($line, '\}')).Count
    $newDepth = $depth + $opens - $closes

    if ($newDepth -le 0 -and -not $injected) {
        # La riga corrente chiude defaultConfig: inietta prima.
        $out.Add($ndkLine)
        $injected = $true
    }

    $out.Add($line)
    $depth = $newDepth
    if ($newDepth -le 0) {
        $inDefault = $false
    }
}

if (-not $injected) {
    Write-Error "Blocco defaultConfig non trovato in $file"
    exit 1
}

Set-Content -Path $file -Value $out
Write-Host "[OK] build.gradle: ndk.abiFilters = $Abi"
