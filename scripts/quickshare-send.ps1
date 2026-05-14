# Apre Esplora risorse con l'APK pre-selezionato. L'utente fa
# tasto destro -> Condividi -> Quick Share per inviare al telefono.
#
# Tentavi di auto-invoke (Shell.Application.Verbs().DoIt(), share UI
# moderna via IDataTransferManagerInterop) sono stati scartati: la
# share UI di Win11 non si lascia invocare in modo affidabile da
# console PowerShell. Explorer-pre-select aggiunge 2-3 click ma
# è deterministico.
#
# Uso (positional):
#   powershell -File quickshare-send.ps1 "C:\path\to\file.apk"
#
# Exit codes:
#   0 = Explorer aperto
#   1 = errore (path mancante / file non trovato)
#
# Nota PowerShell: param block intenzionalmente plain. [CmdletBinding()]
# + [Parameter(Mandatory=$true)] triggava AmbiguousParameterSet su
# PS 5.1. Validazione manuale sotto.

param(
    [string]$ApkPath
)

$ErrorActionPreference = 'Stop'

if ([string]::IsNullOrWhiteSpace($ApkPath)) {
    Write-Host "ERRORE: passare il path dell'APK come argomento."
    exit 1
}

if (-not [System.IO.File]::Exists($ApkPath)) {
    Write-Host "ERRORE: file non trovato: $ApkPath"
    exit 1
}

$abs = [System.IO.Path]::GetFullPath($ApkPath)

Write-Host "APK pronto: $abs"
Write-Host "Apro Esplora risorse: tasto destro -> Condividi -> Quick Share."

Start-Process "explorer.exe" -ArgumentList "/select,`"$abs`""
exit 0
