# Esercizi da rifare

Lista cumulativa degli slug le cui illustrazioni sono state scartate
in fase di verifica. Quando un esercizio viene rigenerato e supera lo
spot-check, va **rimosso** da questa lista (e il WebP committato in
`assets/exercises/verificate/`) — la sua riga si sposta in "Storico
delle promozioni" sotto.

A fine processo, da questa lista verrà generato `batches/rifare-NN.md`
via `node scripts/exercise-illustrations/generate-rifare.js`.

## In sospeso (round 3)

| Slug | Severità | Round | Storia | Note per prompt rinforzato |
|---|---|---|---|---|
| `spinal-twist` | 🔴 grave | round 3 | Round 1: GPT ha disegnato eagle/tree pose in piedi. Round 2: ancora pose in piedi (variante con gamba sollevata in equilibrio). | Cambio di vista: passare da top-down a LATERALE per rendere geometricamente impossibile confondere con una pose in piedi. Body must be HORIZONTAL on the floor. Rinominare mentalmente come "supine spinal twist". |
| `curl-isometrico-asciugamano` | 🔴 grave | round 3 | Round 1: uomo con asciugamano verticale a due mani davanti al corpo. Round 2: asciugamano laterale lungo il corpo, gomiti dritti. | Vista frontale ravvicinata, descrizione "diagrammatica" passo-passo: piede SU asciugamano + estremità che salgono ai due lati + gomiti a 90° + tensione visibile. Riferimento mentale tipo "boat shape" con asciugamano. |
| `y-t-w-prone` | 🔴 grave | round 3 | Round 1: ordine sbagliato delle 3 forme (W-T-W invece di Y-T-W). Round 2: forme corrette ma persona IN PIEDI vista da dietro, non prone. | Cambio di vista da top-down a LATERALE di profilo. Persona deve essere ORIZZONTALE sul pavimento (a pancia in giù), gambe distese a terra all'indietro, fronte appoggiata. Riferimento mentale: "Superman exercise" come body position, ma con braccia in 3 forme Y/T/W. |

## Storico delle promozioni

### Round 1 (rifare batch del 2026-05-05) — 8 promossi su 11

Round 2 (rifare-01.md di 6 gravi + rifare-02.md di 5) ha promosso:

| Slug | Round superato | Cosa è cambiato vs primo tentativo |
|---|---|---|
| `pull-apart-elastico` | round 2 ✓ | L'elastico ora è disegnato come linea curva arancio (#FF7A1A) ben visibile tra le due mani in entrambi i frame. |
| `twist-seduti` | round 2 ✓ | Rotazione del busto ora marcata 60-70°, spalle visibilmente girate, mani giunte spostate verso il fianco. |
| `russian-twist` | round 2 ✓ | Rotazione del busto netta tra i due frame, differenza inequivocabile a colpo d'occhio. |
| `mountain-climber` | round 2 ✓ | Frame 1 ginocchio destro avanti, frame 2 ginocchio sinistro avanti — alternanza speculare chiara. |
| `hamstring-stretch` | round 2 ✓ | Variante figure-4 corretta: gamba tesa avanti + altra gamba piegata col piede contro l'interno del ginocchio della prima. |
| `shoulder-rolls` | round 2 ✓ | Differenza tra spalle basse (frame 1) e alzate verso le orecchie (frame 2) ora leggibile, anche se non drammatica. |
| `skater-jumps` | round 2 ✓ | Atterraggio laterale con gamba dietro incrociata leggibile, anche se la posizione non è drammaticamente diversa da una corsa. |
| `diamond-push-up` | round 2 ✓ | Mani sotto il petto ravvicinate, anche se il rombo geometrico potrebbe essere più nitido. |
