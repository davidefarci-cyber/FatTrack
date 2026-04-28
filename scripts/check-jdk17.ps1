# Verifica che JDK 17 sia installato e accessibile.
# Exit 0 se la versione e' 17.x.x, exit 1 altrimenti.
# Chiamato da fattrack.bat in :ensure_android_toolchain.
#
# Nota: "java -version" scrive l'output su stderr (caratteristica storica
# di Java). Se usiamo direttamente "(& java -version 2>&1)" PowerShell
# converte gli oggetti dello stream errore in ErrorRecord, e il -join
# successivo a volte non li serializza in modo affidabile (varia tra
# PowerShell 5.1 e 7, varia con $ErrorActionPreference). Risultato: la
# variabile risulta vuota o parziale e il -match fallisce sempre, anche
# con JDK 17 davvero installato.
#
# Soluzione: deleghiamo il merge stdout+stderr a "cmd /c", che restituisce
# a PowerShell solo righe stringa pulite, senza ErrorRecord di mezzo.

$out = (& cmd /c "java -version 2>&1") -join "`n"
if ($out -match 'version "17\.') { exit 0 } else { exit 1 }
