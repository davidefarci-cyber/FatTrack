# Verifica che JDK 17 sia installato e accessibile.
# Exit 0 se la versione e' 17.x.x, exit 1 altrimenti.
# Chiamato da fattrack.bat in :ensure_android_toolchain — separato in
# un file dedicato per evitare di gestire quoting CMD/PowerShell quando
# il comando vive dentro un blocco "if (...) else (...)" del .bat.

$ErrorActionPreference = 'SilentlyContinue'
$out = (& java -version 2>&1) -join "`n"
if ($LASTEXITCODE -ne 0) { exit 1 }
if ($out -match 'version "17\.') { exit 0 } else { exit 1 }
