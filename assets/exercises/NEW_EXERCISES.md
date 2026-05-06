# Esercizi nuovi — tracking immagini

Lista degli esercizi aggiunti in fase 2 della roadmap "piani di allenamento".
Ognuno richiede una immagine `.webp` da posizionare in
`assets/exercises/<filename>.webp` con lo stesso stile dei esistenti
(figura stilizzata, sfondo neutro, formato quadrato).

Il `filename` qui è il nome con cui l'asset verrà cercato dal seed. Se cambi
il nome del file, aggiorna anche il riferimento in `seedExercises.ts` quando
verrà collegato.

Convenzione naming: kebab-case, ASCII, senza accenti.

---

## Cardio

| Esercizio (nome in app) | Filename | Equipment tags | Note immagine |
| --- | --- | --- | --- |
| Camminata veloce | `camminata-veloce.webp` | `corpo_libero`, `tapis_roulant` | Persona di profilo, passo lungo, braccio in oscillazione |
| Cyclette | `cyclette.webp` | `ciclette` | Posizione seduta su cyclette, tronco eretto |

## Gambe e glutei (con manubri)

| Esercizio | Filename | Equipment tags | Note immagine |
| --- | --- | --- | --- |
| Squat con manubri | `squat-manubri.webp` | `manubri` | Manubri tenuti lungo i fianchi, posizione di squat profondo |
| Goblet squat con manubri | `goblet-squat-manubri.webp` | `manubri` | Un manubrio tenuto verticale al petto a due mani, squat |
| Sumo squat con manubri | `sumo-squat-manubri.webp` | `manubri` | Piedi larghi, punte fuori, manubrio penzolante tra le gambe |
| Affondi con manubri | `affondi-manubri.webp` | `manubri` | Manubri lungo i fianchi, affondo frontale |
| Stacco rumeno con manubri | `stacco-rumeno-manubri.webp` | `manubri` | Manubri davanti alle cosce, schiena dritta, busto inclinato |
| Step-up con manubri | `step-up-manubri.webp` | `manubri`, `sedia_o_panca` | Salita su panca con manubri lungo i fianchi |
| Bulgarian split squat con manubri | `bulgarian-split-squat-manubri.webp` | `manubri`, `sedia_o_panca` | Piede posteriore su panca, manubri lungo i fianchi |

## Petto e spalle (panca / manubri)

| Esercizio | Filename | Equipment tags | Note immagine |
| --- | --- | --- | --- |
| Panca piana con manubri | `panca-piana-manubri.webp` | `manubri`, `panca` | Disteso supino su panca piana, manubri sopra il petto |
| Panca inclinata con manubri | `panca-inclinata-manubri.webp` | `manubri`, `panca_inclinata` | Panca a ~30°, manubri sopra il petto |
| Pullover con manubrio | `pullover-manubrio.webp` | `manubri`, `panca` | Disteso, un manubrio tenuto a due mani sopra la testa |
| Shoulder press con manubri | `shoulder-press-manubri.webp` | `manubri` | Seduto o in piedi, manubri spinti dall'alto delle spalle in alto |
| Arnold press | `arnold-press.webp` | `manubri` | Manubri davanti al viso che ruotano salendo sopra la testa |
| Alzate laterali con manubri | `alzate-laterali-manubri.webp` | `manubri` | Manubri sollevati lateralmente fino all'altezza delle spalle |

## Schiena (con manubri)

| Esercizio | Filename | Equipment tags | Note immagine |
| --- | --- | --- | --- |
| Rematore con manubrio | `rematore-manubrio.webp` | `manubri` | Una mano e un ginocchio appoggiati alla panca, manubrio tirato verso il fianco |

## Braccia (con manubri)

| Esercizio | Filename | Equipment tags | Note immagine |
| --- | --- | --- | --- |
| Curl bicipiti con manubri | `curl-bicipiti-manubri.webp` | `manubri` | In piedi, manubri portati al petto con presa supina |
| Curl martello con manubri | `curl-martello-manubri.webp` | `manubri` | Presa neutra (palmi verso il corpo), curl al petto |
| Estensioni tricipiti con manubrio | `estensioni-tricipiti-manubrio.webp` | `manubri` | Un manubrio tenuto a due mani sopra la testa, abbassato dietro la nuca |
| Kickback tricipiti con manubri | `kickback-tricipiti-manubri.webp` | `manubri` | Busto inclinato in avanti, gomiti fissi, avambracci tesi all'indietro |

## Core

| Esercizio | Filename | Equipment tags | Note immagine |
| --- | --- | --- | --- |
| Bicycle crunch | `bicycle-crunch.webp` | `corpo_libero` | Supino, gomito che incontra il ginocchio opposto |

---

## Convenzioni d'uso (per il seed)

- `equipment` (display string): testo human-readable sintetico, es. "Manubri", "Manubri + panca", "Cyclette".
- `equipment_tags` (JSON array): tag normalizzati dalla lista in
  `src/types/equipment.ts`. Sono questi che il filtro/ranking userà.
- `met`: valori realistici (camminata 5-6 km/h ≈ 4.3, cyclette moderata ≈ 6.8,
  esercizi di forza con manubri 3-5).
- `level`: `principiante` per esercizi di base e cardio, `intermedio` per
  Bulgarian split squat / Arnold press / pullover (richiedono coordinazione
  o stabilità maggiore).

## Quando le immagini saranno pronte

Il binding nome → immagine vive in
`scripts/exercise-illustrations/manifest.js` (canonico) → genera
`src/utils/exerciseImages.ts` con `node scripts/exercise-illustrations/generate-image-map.js`.
Per ognuno di questi esercizi: aggiungere una entry al manifest con `slug`
uguale al filename (senza `.webp`) e poi rigenerare la mappa.
Finché l'asset non c'è, `getExerciseImage(name)` ritorna null e la UI non
mostra l'immagine (nessun crash).
