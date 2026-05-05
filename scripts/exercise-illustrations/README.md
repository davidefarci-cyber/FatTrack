# Generazione illustrazioni esercizi

Pipeline per produrre i 67 PNG di `assets/exercises/` da incollare poi nel `ExerciseDetailModal`.

Voce TODO collegata: `[27] Immagini illustrate per esercizi` in `docs/TODO.md`.

## File

- `manifest.js` — lista canonica dei 67 esercizi con strategia frame, vista, personaggio M/F, descrizioni dei frame. **Fonte di verità**.
- `template.js` — funzione che costruisce il prompt auto-contenuto da una entry del manifest.
- `generate-batches.js` — script Node che genera i file batch nella cartella `batches/`.
- `batches/batch-NN.md` — output: 10 file markdown, ciascuno con istruzioni per GPT + prompt di N esercizi + richiesta finale di ZIP con filename corretti.
- `optimize.js` — converte i PNG verificati in WebP (qualità 85, max 1080 px sul lato lungo) e cancella i PNG originali. Saving tipico ~98% (17.5 MB di PNG → ~0.4 MB di WebP).
- `da-rifare.md` — lista cumulativa degli esercizi scartati in fase di verifica, con severità e note per il prompt rinforzato. Fonte di verità per la rigenerazione.
- `generate-rifare.js` — script Node che genera i file batch di rigenerazione (`batches/rifare-NN.md`) con prompt rinforzati per ogni esercizio in `da-rifare.md`.

## Flusso operativo

1. **Apri il file `batches/batch-01.md`**, copia tutto il contenuto.
2. **Apri una nuova chat** in ChatGPT (consigliato: una chat per batch — il prompt è auto-contenuto, niente dipendenza da memoria di sessione).
3. Incolla il batch nella chat. GPT genererà le ~7 immagini in sequenza, poi le impacchetterà in un singolo ZIP `fattrack-exercises-batch-NN.zip` con i nomi file già corretti (es. `squat.png`, `affondi.png`, …).
4. Scarica lo ZIP, **estrai i PNG dentro `assets/exercises/`** della repo.
5. Ripeti per `batch-02.md`, `batch-03.md`, …, `batch-10.md`.

Tempo stimato: ~3-5 min di generazione per batch + scaricamento. Totale ~45-60 min spalmabili nel tempo.

## Promozione e ottimizzazione

Dopo lo spot-check di un batch:
1. Sposta i PNG promossi in `assets/exercises/verificate/`.
2. Lancia l'ottimizzazione: `node scripts/exercise-illustrations/optimize.js`.
   - Converte tutti i PNG di `verificate/` in WebP (~98% di saving).
   - Cancella i PNG originali una volta convertiti.
3. Commit dei `.webp` risultanti.

I PNG NON vanno committati nella branch finale: l'app legge i WebP. Il render userà `require('@/assets/exercises/verificate/<slug>.webp')`.

## Quality check per batch

Quando estrai uno ZIP, verifica al volo:
- I file si chiamano esattamente come nel manifest (`<slug>.png`, lowercase, hyphenated).
- Le immagini non hanno testo bruciato dentro.
- La palette è rispettata (nessun blu/verde/viola/rosso).
- I dual/triple mostrano la **stessa persona** in tutti i frame.

Se un'immagine è da rifare: nella stessa chat, dì a GPT "rifai l'immagine X usando lo stesso prompt". Se invece la chat ha "perso" lo stile (succede su chat lunghe), apri una nuova chat e incolla solo il prompt singolo dell'esercizio da rigenerare.

## Rigenerazione dei batch

Se modifichi il manifest (es. cambi la vista di un esercizio, o aggiungi/togli entry), rigenera tutti i batch:

```bash
node scripts/exercise-illustrations/generate-batches.js
```

Lo script stampa un report con la distribuzione di strategy/character/view e verifica che gli slug siano unici e validi.

## Note di design

- **Slug**: lowercase + hyphens, niente accenti/spazi/caratteri speciali. È il nome file finale e la chiave del lookup nella mappa statica `EXERCISE_IMAGES` lato app.
- **Strategy**:
  - `single` (16 esercizi): tenute isometriche, stretching statici, pose di mobilità "fisse". Format quadrato 1024x1024.
  - `dual` (49 esercizi): movimenti con due fasi distinte (alto/basso, neutro/contratto). Format 4:3 landscape 1600x1200.
  - `triple` (2 esercizi): Burpees (squat→plank→salto) e Y-T-W prone (3 posizioni nominate). Format 16:9 landscape 1920x1080.
- **Character**: bilanciamento ~F36/M31, alternato per varietà visiva.
- **View**: lateral (44) come default, frontal (11) per esercizi simmetrici/aperture, three-quarter (9) per rotazioni/aperture laterali, top-down (3) per esercizi proni (snow angel, spinal twist, Y-T-W).
- **Coerenza personaggio**: per dual/triple il prompt forza esplicitamente "stessa persona, stesso outfit, stesse proporzioni". È il vincolo principale per evitare che GPT generi due persone diverse nei due frame.

## Step successivo (post-asset)

Quando `assets/exercises/` è popolato:
1. Aggiungere `EXERCISE_IMAGES: Record<string, ImageSourcePropType>` con `require()` statici per ogni slug (Metro non supporta require dinamici).
2. Helper `getExerciseImage(name: string)` che deriva lo slug dal name e fa il lookup, ritorna `null` per fallback graceful.
3. Render condizionale dell'`<Image>` nell'`ExerciseDetailModal` sopra i guideSteps, con `aspectRatio` adattato (quadrato per single, 4:3 per dual, 16:9 per triple — ricavabile dallo slug del manifest).
