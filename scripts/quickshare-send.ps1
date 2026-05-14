# Invia un file all'app Samsung Quick Share invocando il verb del context
# menu di Windows.
#
# Strategia:
# 1. Se Quick Share è esposto come verb legacy (raro), lo invochiamo
#    direttamente -> si apre Quick Share con il file precaricato.
# 2. Altrimenti invochiamo il verb "Condividi" (Italiano) / "Share"
#    -> si apre lo share picker di Windows, dove Quick Share appare
#    come opzione. Workflow: l'utente fa un tap su Quick Share nel
#    picker, poi sceglie il device e conferma.
#
# Quick Share su Windows 11 è un'app UWP/moderna e il suo verb non è
# enumerato da Shell.Application.Verbs() (che vede solo il context
# menu legacy), quindi nella stragrande maggioranza dei casi siamo
# sullo step 2.
#
# Uso (positional):
#   powershell -File quickshare-send.ps1 "C:\path\to\file.apk"
#
# Exit codes:
#   0 = verb invocato (Quick Share diretto o share picker aperto)
#   1 = errore generico (file non trovato, ParseName fallito, ...)
#   2 = nessun verb di condivisione trovato (fallback grazioso)
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

    # Strategia in due step:
    # 1. Provo a invocare direttamente Quick Share se esposto come verb
    #    legacy (rare — Quick Share di solito è UWP/moderno, non
    #    enumerato da Shell.Application.Verbs).
    # 2. Fallback: invoco il verb "Condividi" (Italiano) / "Share" che
    #    apre lo share picker di sistema. Quick Share appare come
    #    opzione lì dentro — un tap dell'utente. Aggira il limite del
    #    context menu legacy senza dipendere dal nome localizzato di
    #    Quick Share.
    # Normalizziamo togliendo '&' (mnemonico tastiera) prima del match.
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

    # Step 1: Quick Share diretto (probabilmente assente, ma proviamo)
    $direct = $normalized | Where-Object {
        $_.Clean -match 'Quick.?Share' -or
        $_.Clean -match 'Condivisione rapida' -or
        $_.Clean -match 'Condivisione vicina' -or
        $_.Clean -match 'Samsung.*Share' -or
        $_.Clean -match 'Galaxy.*Share'
    } | Select-Object -First 1

    if ($direct) {
        Write-Host ""
        Write-Host "Apro Quick Share con '$leaf'..."
        $direct.Verb.DoIt()
        exit 0
    }

    # Step 2: share picker di sistema ("Condividi" / "Share")
    $picker = $normalized | Where-Object {
        $_.Clean -match '^Condividi$' -or
        $_.Clean -match '^Share$'
    } | Select-Object -First 1

    if ($picker) {
        Write-Host ""
        Write-Host "Apro il menu Condividi di Windows con '$leaf'."
        Write-Host "Scegli 'Quick Share' nel popup."
        $picker.Verb.DoIt()
        exit 0
    }

    Write-Host ""
    Write-Host "Nessun verb di condivisione trovato."
    Write-Host "APK pronto in: $abs"
    Write-Host "Trasferiscilo manualmente sul telefono (tasto destro -> Quick Share)."
    exit 2
} catch {
    Write-Host "ERRORE durante l'invocazione di Quick Share: $($_.Exception.Message)"
    exit 1
}
