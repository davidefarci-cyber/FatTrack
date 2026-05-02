# Prompt sessione operaia — UX Polish B (layout esercizi + swipe diet)

> **Pre-requisiti**: branch `main` aggiornato (HEAD `9eafab3` o successivo).
> Branch atteso per questa sessione: `claude/ux-polish-layout-gestures`.
> Voci TODO chiuse al merge: [26], [23].
> Effort stimato: ~2-3h.
> Indipendente da Sessione A: si può lanciare prima, dopo o in parallelo
> (no conflitti di file attesi — A tocca app_settings + screens sport,
> B tocca ExercisesScreen + HomeScreen diet).

Sessione di polish UX raggruppata per tema "navigazione e organizzazione
liste". Due interventi indipendenti tra loro, un commit per intervento.

---

## Prompt da incollare

```
Sei in /home/user/FatTrack su branch main aggiornato.

Implementa la SESSIONE B di "UX Polish": due interventi
indipendenti, un commit ciascuno.

1. [26] Categorizza esercizi: ExercisesScreen passa da
   ScrollView lineare a SectionList raggruppata per
   muscle_group, headers di sezione visibili scrollando.
2. [23] Swipe orizzontale per cambio giorno nella home diet:
   il gesto sx/dx sulla schermata sostituisce/affianca le frecce
   esistenti.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md — vincoli stilistici (design system, no nuove lib UI,
   StyleSheet + tokens, italiano nei testi).
2. docs/TODO.md voci [26] e [23] per il contesto utente.
3. src/screens/sport/ExercisesScreen.tsx — l'attuale
   ScrollView + map degli esercizi. Filtri via BottomSheet già
   funzionanti — vanno preservati.
4. src/database/exercisesDB.ts — espone già `getAll()` /
   `getFiltered()`. Verifica come è ordinata la lista oggi (di
   solito `name ASC` o per id seed). Per la SectionList serve un
   raggruppamento client-side per `muscleGroup`.
5. src/screens/HomeScreen.tsx — la home diet. Cerca dove sono
   gestite le frecce di cambio giorno (ChevronLeft/ChevronRight
   nel header data) per capire quale callback chiamare dal swipe.
6. react-native-gesture-handler è GIÀ presente in
   package.json (verifica con grep). NIENTE lib nuove. Per il
   swipe usa `Gesture.Pan()` di GH v2 oppure `PanGestureHandler`
   v1 (allinea a quello che il resto dell'app già usa).

API e file disponibili (riusa, NON ricreare):

- `exercisesDB.getAll()` o equivalente che ritorna
  `Exercise[]` con campo `muscleGroup`.
- I filtri attuali (BottomSheet) emettono uno stato locale tipo
  `{ muscleGroup, level, equipment }` — la SectionList deve
  applicare gli stessi filtri intra-sezione (sezione vuota →
  sezione nascosta).
- Primitives: Card, Button, Icon, ScreenHeader. Niente lib UI
  nuove.
- Per il swipe diet: useDailyLog/HomeScreen probabilmente già
  espongono `goPrevDay()` / `goNextDay()` o callback simili.
  Riusa esattamente quelli che usano le frecce.

Crea il branch:

  git checkout main
  git pull --ff-only origin main
  git checkout -b claude/ux-polish-layout-gestures

I 2 step sotto, una alla volta, con commit separato per ognuno.
Dopo ogni commit: `npm run typecheck` deve passare. Se la prima
volta `node_modules` manca, fai `npm ci`.

Niente PR: alla fine fai solo `git push -u origin
claude/ux-polish-layout-gestures`. Sarò io a decidere il merge.

────────────────────────────────────────────────────────────────
STEP B1 — [26] Categorizza esercizi (SectionList per muscle_group)
────────────────────────────────────────────────────────────────

Modifica **src/screens/sport/ExercisesScreen.tsx**:

- Sostituisci il `<ScrollView>` + `.map()` corrente con
  `<SectionList>` di react-native (no lib nuove).
- Sezioni: una per ogni `muscleGroup` distinto presente nei dati
  filtrati. Ordine sezioni: lo stesso usato negli altri picker
  (es. `petto, spalle, schiena, braccia, core, gambe, cardio,
  mobilita` — verifica nel codice esistente, di solito è in
  `@/theme` o in un util sport, riusa la fonte canonica).
- Render header sezione: una piccola Pill / Text con label
  italiana (es. "Petto · 6 esercizi") usando `typography.label` +
  `colors.textSec`. Sticky headers attivi (`stickySectionHeadersEnabled`).
- Render item: invariato rispetto a oggi (la card singola
  esercizio resta uguale). Se oggi era inline, estrai in funzione
  `renderItem` per pulizia.
- Filtri: applicabili PRIMA del raggruppamento. Pseudocodice:
  ```ts
  const filtered = applyFilters(allExercises, currentFilters);
  const sections = groupByMuscle(filtered).map(g => ({
    title: muscleLabelIt(g.muscle),
    count: g.items.length,
    data: g.items,
  })).filter(s => s.data.length > 0);
  ```
- Empty state: se `sections.length === 0` (tutti i filtri attivi
  azzerano la lista), mostra il messaggio empty già esistente
  (riusa quello).

Helper `groupByMuscle` + `muscleLabelIt`:
- Se non esistono già in `@/utils` o `@/database`, crea
  `src/utils/exerciseGrouping.ts`. Niente refactor del DB.
- Mantieni le label coerenti col resto dell'app (cerca dove sono
  rese `muscleGroup` in `WorkoutEditorModal` / `ExercisePickerModal`
  per non duplicare).

Smoke test:
- Apri Esercizi → vedi sezioni "Petto · N", "Gambe · N", ecc.
  Headers sticky scrollando.
- Filtra per "petto" → resta solo la sezione "Petto", le altre
  scompaiono.
- Filtra per attrezzo che non hai → empty state.
- Tap su un esercizio → ExerciseDetailModal si apre come prima.

Commit:

  feat(sport): raggruppa esercizi per gruppo muscolare con SectionList

  ExercisesScreen passa da ScrollView lineare a SectionList con
  headers sticky per muscle_group. Migliora la scansionabilità
  della libreria (40 esercizi seedati con nomi simili tipo
  "Push-up / Wide push-up / Diamond push-up" prima difficili da
  distinguere). I filtri esistenti (gruppo / livello / attrezzo)
  funzionano intra-sezione, sezioni vuote sono nascoste.

  Chiude TODO [26].

────────────────────────────────────────────────────────────────
STEP B2 — [23] Swipe orizzontale cambio giorno (home diet)
────────────────────────────────────────────────────────────────

Modifica **src/screens/HomeScreen.tsx**:

- Wrappa il contenuto principale (la ScrollView con
  CalorieRing + lista pasti) in un GestureDetector con un
  Gesture.Pan() configurato per:
  - `activeOffsetX([-15, 15])` (per non interferire con scroll
    verticale; soglia 15px orizzontali).
  - `failOffsetY([-25, 25])` (se il gesto è chiaramente
    verticale fallisce, lascia passare lo scroll).
  - `onEnd((e) => { ... })` con threshold di translationX:
    - se `translationX > 60 && Math.abs(velocityX) > 200` →
      `goPrevDay()` (swipe verso destra = giorno precedente,
      coerente con freccia chevron-left).
    - se `translationX < -60 && Math.abs(velocityX) > 200` →
      `goNextDay()`.
    - altrimenti niente (gesto troppo corto o troppo lento,
      ignora).
- Le frecce nell'header data restano come affordance esplicito
  (NON rimuoverle — il TODO [23] dice "il tasto freccia resta").
- Se i metodi `goPrevDay` / `goNextDay` non esistono ancora
  come callback nominate (oggi sono inline negli onPress delle
  frecce), estraili in due `useCallback` per riusarli sia nelle
  frecce sia nel gesto.
- NON aggiungere animazioni di transizione (parallax/slide)
  oltre al cross-fade dei dati che già avviene al cambio data.
  Lo scope del TODO è "stessa semantica delle frecce".

Considerazioni:
- Verifica che il GestureDetector NON venga montato sopra la
  BottomTabBar o sopra elementi con i loro gesti (es. lo
  ScrollView verticale interno). I `activeOffsetX` /
  `failOffsetY` configurati sopra dovrebbero risolverlo, ma
  testa mentalmente: scroll verticale con dita inclinate non
  deve triggerare il cambio giorno.
- Se HomeScreen ha già un GestureHandlerRootView dell'App.tsx
  globale, NON serve un altro a livello screen.

Smoke test:
- Apri Home diet → swipe sx → vai al giorno successivo.
- Swipe dx → torna a oggi.
- Swipe verticale (scroll della lista pasti) → continua a
  funzionare normalmente.
- Frecce nell'header → continuano a cambiare giorno come prima.

Commit:

  feat(diet): swipe orizzontale per cambio giorno in HomeScreen

  Aggiunto Gesture.Pan() horizontal su HomeScreen: swipe sx
  avanza al giorno successivo, swipe dx torna al precedente.
  Threshold conservativi (60px + velocityX 200) per evitare
  conflitti con scroll verticale (activeOffsetX/failOffsetY
  configurati). Le frecce chevron-left/right nell'header data
  restano come affordance esplicito. Riuso dei callback
  goPrevDay/goNextDay già esistenti.

  Chiude TODO [23].

────────────────────────────────────────────────────────────────
PUSH FINALE
────────────────────────────────────────────────────────────────

  npm run typecheck     # ultima verifica
  git push -u origin claude/ux-polish-layout-gestures

Riepiloga in chat:
- 2 commit sul branch.
- 2 voci TODO da chiudere al merge: [26], [23].
- Cosa ha senso QA-are manualmente sul device dopo il merge
  (lista dai 2 smoke test sopra).

Procedi.
```

---

## Note operative per chi avvia la sessione

- Tempo atteso: ~2-3h, dominato dal fine-tuning dei threshold
  swipe (deve essere "naturale" senza interferire con lo scroll).
- Dipendenze nuove introdotte: NESSUNA. `react-native-gesture-handler`
  è già in package.json.
- Modifiche allo schema DB: NESSUNA.
- Niente provider nuovi in App.tsx.

## Cosa NON includere in questa sessione (scope creep prevention)

- Niente refactor di useDailyLog o del data layer diet.
- Niente animazioni custom sul cambio giorno (cross-fade
  esistente basta — il TODO [23] è esplicito su "niente parallax
  complesso").
- Niente tab orizzontali nel header esercizi (era una versione
  ricca del TODO [26], rimandata a iterazione futura — solo
  SectionList con sticky headers in questa sessione).
- Niente edit ai CLAUDE.md / ORCHESTRATOR_HANDOFF.md.
