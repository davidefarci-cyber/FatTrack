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
#
# Nota PowerShell: param block intenzionalmente plain — niente
# [CmdletBinding()] e niente [Parameter(...)]. La combinazione triggava
# AmbiguousParameterSet su PS 5.1 per via dei common parameters
# (-Verbose, -Debug, ...) auto-aggiunti che facevano fallire la
# parameter binding al lancio dello script. Validazione manuale sotto.

param(
    [string]$ApkPath
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ApkPath)) {
    Write-Host "ERRORE: passare il path dell'APK come argomento."
    Write-Host "Uso: powershell -File quickshare-send.ps1 ""C:\path\to\file.apk"""
    exit 1
}

if (-not [System.IO.File]::Exists($ApkPath)) {
    Write-Host "ERRORE: file non trovato: $ApkPath"
    exit 1
}

# .NET path API invece di Resolve-Path / Split-Path: i cmdlet PS 5.1
# hanno parameter set quirks (es. -LiteralPath + -Parent triggera
# AmbiguousParameterSet in certe config). [System.IO.Path] è statico
# .NET, niente parameter binding di mezzo.
$abs  = [System.IO.Path]::GetFullPath($ApkPath)
$dir  = [System.IO.Path]::GetDirectoryName($abs)
$leaf = [System.IO.Path]::GetFileName($abs)

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
    # Su Windows IT con Samsung Quick Share installato è tipicamente
    # "Quick Share" (l'app conserva il nome inglese), ma copriamo anche
    # eventuali traduzioni future. Normalizziamo togliendo '&' (mnemonico
    # da tastiera, es. "&Quick Share") prima del match.
    $allVerbs = @($item.Verbs())
    $normalized = @($allVerbs | ForEach-Object {
        @{
            Verb = $_
            Clean = ($_.Name -replace '&', '').Trim()
        }
    })

    Write-Host "Verbi disponibili per '$leaf':"
    foreach ($n in $normalized) {
        if ($n.Clean) { Write-Host "  - $($n.Clean)" }
    }

    $match = $normalized | Where-Object {
        $_.Clean -match 'Quick.?Share' -or
        $_.Clean -match 'Condivisione rapida' -or
        $_.Clean -match 'Condivisione vicina' -or
        $_.Clean -match 'Samsung.*Share' -or
        $_.Clean -match 'Galaxy.*Share'
    } | Select-Object -First 1

    $verb = if ($match) { $match.Verb } else { $null }

    if ($verb) {
        Write-Host "Apro Quick Share con '$leaf'..."
        $verb.DoIt()
        exit 0
    } else {
        Write-Host ""
        Write-Host "Quick Share non trovato nei verb del context menu legacy."
        Write-Host "Possibile causa: Quick Share usa il context menu 'moderno' di"
        Write-Host "Windows 11 che non viene enumerato da Shell.Application.Verbs()."
        Write-Host "APK pronto in: $abs"
        Write-Host "Trasferiscilo manualmente sul telefono (tasto destro -> Quick Share)."
        exit 2
    }
} catch {
    Write-Host "ERRORE durante l'invocazione di Quick Share: $($_.Exception.Message)"
    exit 1
}
