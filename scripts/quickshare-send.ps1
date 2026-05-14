# Invia un file all'app Samsung Quick Share.
#
# Strategia:
# 1. Se Quick Share è esposto come verb legacy (Win32, raro), lo
#    invochiamo direttamente con un HWND host -> si apre Quick Share
#    con il file precaricato.
# 2. Fallback (caso normale Win11): apro Esplora risorse con l'APK
#    pre-selezionato. L'utente fa tasto destro -> Condividi -> Quick
#    Share per inviare al telefono.
#
# Perché non invochiamo direttamente il verb "Condividi" dal context
# menu legacy: il verb funziona, ma su Windows 11 apre la share UI
# moderna che richiede un HWND parent fornito via
# IDataTransferManagerInterop::ShowShareUIForWindow + callback
# DataRequested settati via WinRT projection. Da console PowerShell
# (anche con WinForms host) la share UI rifiuta l'HWND e fallisce
# con "Handle di finestra non valido". L'approccio Explorer-pre-select
# delega il setup HWND a Explorer.exe (che lo fa correttamente) e
# aggiunge solo 2-3 click in più al workflow.
#
# Uso (positional):
#   powershell -File quickshare-send.ps1 "C:\path\to\file.apk"
#
# Exit codes:
#   0 = OK (Quick Share aperto direttamente OR Explorer aperto sul file)
#   1 = errore generico (file non trovato, ParseName fallito, ...)
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

# Add-Type per WinForms solo se serve (path Quick Share legacy diretto)
Add-Type -AssemblyName System.Windows.Forms | Out-Null
Add-Type -AssemblyName System.Drawing | Out-Null

function Invoke-VerbWithHostWindow {
    param($Verb)

    # Form 1x1 px, opacity 0, fuori schermo. Fornisce HWND parent.
    # Funziona per verb legacy (Quick Share Win32). NON funziona per
    # la share UI moderna di Win11 — quella va invocata da Explorer.
    $form = New-Object System.Windows.Forms.Form
    $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
    $form.ShowInTaskbar = $false
    $form.Opacity = 0
    $form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
    $form.Location = New-Object System.Drawing.Point(-5000, -5000)
    $form.Size = New-Object System.Drawing.Size(1, 1)
    $form.TopMost = $true

    try {
        $form.Show()
        $form.Activate()
        [System.Windows.Forms.Application]::DoEvents()
        Start-Sleep -Milliseconds 200

        $Verb.DoIt()

        $deadline = [DateTime]::Now.AddMilliseconds(1500)
        while ([DateTime]::Now -lt $deadline) {
            [System.Windows.Forms.Application]::DoEvents()
            Start-Sleep -Milliseconds 50
        }
    } finally {
        $form.Close()
        $form.Dispose()
    }
}

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

# Step 1: Quick Share come verb legacy (best effort, raro su Win11).
try {
    $shell  = New-Object -ComObject Shell.Application
    $folder = $shell.Namespace($dir)
    if ($folder) {
        $item = $folder.ParseName($leaf)
        if ($item) {
            $allVerbs = @($item.Verbs())
            $direct = $allVerbs | ForEach-Object {
                $clean = ($_.Name -replace '&', '').Trim()
                if ($clean -match 'Quick.?Share' -or
                    $clean -match 'Condivisione rapida' -or
                    $clean -match 'Condivisione vicina' -or
                    $clean -match 'Samsung.*Share' -or
                    $clean -match 'Galaxy.*Share') {
                    $_
                }
            } | Select-Object -First 1

            if ($direct) {
                Write-Host "Apro Quick Share con '$leaf'..."
                Invoke-VerbWithHostWindow -Verb $direct
                exit 0
            }
        }
    }
} catch {
    # Best-effort: se il path legacy fallisce per qualsiasi motivo,
    # cadiamo silenziosamente sullo step 2 (Explorer fallback).
}

# Step 2: fallback Explorer pre-select. Funziona sempre.
Write-Host "APK pronto: $abs"
Write-Host ""
Write-Host "Apro Esplora risorse sul file."
Write-Host "Tasto destro -> Condividi -> Quick Share per inviare al telefono."

Start-Process "explorer.exe" -ArgumentList "/select,`"$abs`""
exit 0
