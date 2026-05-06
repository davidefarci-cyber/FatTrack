# Invia un file all'app Samsung Quick Share invocando il verb del context
# menu di Windows. Apre la finestra Quick Share con il file pre-caricato:
# l'utente sceglie il device di destinazione e conferma.
#
# Uso (positional):
#   powershell -File quickshare-send.ps1 "C:\path\to\file.apk"
#
# Exit codes:
#   0 = verb invocato (Quick Share aperto)
#   1 = errore generico (file non trovato, ParseName fallito, ...)
#   2 = verb "Quick Share" non registrato sul PC (fallback grazioso)

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, Position=0)]
    [string]$ApkPath
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ApkPath)) {
    Write-Host "ERRORE: file non trovato: $ApkPath"
    exit 1
}

$abs  = (Resolve-Path -LiteralPath $ApkPath).Path
$dir  = Split-Path -LiteralPath $abs -Parent
$leaf = Split-Path -LiteralPath $abs -Leaf

try {
    $shell  = New-Object -ComObject Shell.Application
    $folder = $shell.Namespace($dir)
    if (-not $folder) {
        Write-Host "ERRORE: impossibile aprire la cartella '$dir'."
        exit 1
    }
    $item = $folder.ParseName($leaf)
    if (-not $item) {
        Write-Host "ERRORE: ParseName fallito per '$leaf'."
        exit 1
    }

    # Il nome del verb dipende dalla versione di Quick Share e dal locale OS.
    # Su Windows IT con Samsung Quick Share installato e' tipicamente
    # "Quick Share" (l'app conserva il nome inglese), ma copriamo anche
    # eventuali traduzioni future.
    $verb = $item.Verbs() | Where-Object {
        $_.Name -match 'Quick Share|Condivisione rapida|Condivisione vicina'
    } | Select-Object -First 1

    if ($verb) {
        Write-Host "Apro Quick Share con '$leaf'..."
        $verb.DoIt()
        exit 0
    } else {
        Write-Host "Quick Share non disponibile su questo PC."
        Write-Host "APK pronto in: $abs"
        Write-Host "Trasferiscilo manualmente sul telefono."
        exit 2
    }
} catch {
    Write-Host "ERRORE durante l'invocazione di Quick Share: $($_.Exception.Message)"
    exit 1
}
