# Prompt sessione operaia — UX Polish C1 (WheelPicker primitive + reps + timer)

> **Pre-requisiti**: branch `main` aggiornato (HEAD `fb23231` o successivo,
> dopo merge UX Polish A+B).
> Branch atteso per questa sessione: `claude/ux-polish-wheelpicker`.
> Voci TODO chiuse al merge: [31], [24].
> Effort stimato: ~3-4h.

Sessione di polish UX raggruppata sul tema "input numerici a scorrimento".
Costruiamo un primitive `<WheelPicker>` riusabile e lo applichiamo in 2
punti dell'app: il campo "reps fatte" durante una sessione live e i
campi work/rest/round del TimerScreen. Tre commit, in ordine logico
(primitive prima, applicazioni dopo).

---

## Prompt da incollare

```
Sei in /home/user/FatTrack su branch main aggiornato.

Implementa la SESSIONE C1 di "UX Polish": un primitive nuovo + 2
applicazioni. Tre commit, uno per step.

1. Nuovo primitive src/components/WheelPicker.tsx — selettore
   numerico a scorrimento verticale, snap-to-interval, niente lib
   nuove.
2. [31] Applica WheelPicker a TimerScreen (work/rest/round).
3. [24] Applica WheelPicker al campo "reps fatte" in
   ActiveSessionScreen.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md — vincoli stilistici (design system, no nuove lib UI,
   StyleSheet + tokens, italiano nei testi).
2. docs/TODO.md voci [31] e [24] per il contesto utente.
3. src/screens/sport/TimerScreen.tsx — la schermata da modificare
   per [31]. Oggi usa 3 `<Input>` numerici per workSec/restSec/rounds
   nelle modalità Tabata e Intervalli (cerca le righe che gestiscono
   `tabataConfig.workSec`, `restSec`, `rounds`).
4. src/screens/sport/ActiveSessionScreen.tsx — schermata da
   modificare per [24]. Linee 281, 290, 415-417: lo stato `reps`,
   l'inizializzazione dal valore prescritto `ex.reps`, e l'`<Input>`
   numerico da sostituire.
5. src/components/Input.tsx — per coerenza stilistica del nuovo
   primitive.
6. src/components/CalorieRing.tsx — pattern di SVG-based primitive
   (utile come riferimento di stile, non per copia funzionale).

API e file disponibili (riusa, NON ricreare):

- @/theme: colors, spacing, radii, typography. Usa SEMPRE questi
  per il primitive nuovo, niente magic numbers.
- @/theme/ThemeContext useAppTheme(): per `accent` (arancio sport).
  Il WheelPicker deve avere il valore selezionato evidenziato in
  accent del theme corrente.
- Primitives: Card, Icon. NIENTE lib UI nuove. Niente
  react-native-wheel-pick / picker / simili — il primitive è
  basato su FlatList di react-native (built-in).

Crea il branch:

  git checkout main
  git pull --ff-only origin main
  git checkout -b claude/ux-polish-wheelpicker

I 3 step sotto, una alla volta, con commit separato per ognuno.
Dopo ogni commit: `npm run typecheck` deve passare. Se la prima
volta `node_modules` manca, fai `npm ci`.

Niente PR: alla fine fai solo `git push -u origin
claude/ux-polish-wheelpicker`. Sarò io a decidere il merge.

────────────────────────────────────────────────────────────────
STEP C1.1 — Primitive src/components/WheelPicker.tsx
────────────────────────────────────────────────────────────────

Crea **src/components/WheelPicker.tsx** con questa firma pubblica:

```ts
type WheelPickerProps = {
  value: number;                 // valore corrente
  onChange: (next: number) => void;
  min: number;                   // estremo inferiore inclusivo
  max: number;                   // estremo superiore inclusivo
  step?: number;                 // default 1
  suffix?: string;               // es "reps", "sec", "round"
  prescribedValue?: number;      // se fornito, mostrato come marker
                                 // tenue accanto al valore (per [24])
  height?: number;               // altezza area visibile, default 180
  itemHeight?: number;           // altezza singola riga, default 44
  accent?: string;               // override colore evidenziazione
                                 // (default: colors.text)
};
```

Implementazione:

- `FlatList` verticale con `data = range(min, max, step)`.
- `snapToInterval = itemHeight`, `decelerationRate="fast"`,
  `showsVerticalScrollIndicator={false}`,
  `getItemLayout` per scroll iniziale immediato.
- Centrare il selected item: padding verticale di
  `(height - itemHeight) / 2` sopra/sotto la lista (`contentContainerStyle`).
- Calcolo del valore corrente da scroll: `onMomentumScrollEnd` →
  `nearestIndex = Math.round(offsetY / itemHeight)` →
  `nextValue = min + nearestIndex * step` → chiama `onChange(nextValue)`
  SOLO se diverso da `value` (evita loop di re-render).
- Quando il prop `value` cambia da fuori (controlled), scroll
  programmatico a `(value - min) / step * itemHeight` con
  `scrollToOffset({ animated: false })`. NON scrollare se l'utente
  sta già trascinando (usa un ref `isUserScrollingRef`).
- Render dei singoli item:
  - Item selezionato (centrato): `typography.value` (numero grosso)
    + colore `accent`. Sotto: `suffix` in `typography.caption`
    (se fornito).
  - Item non selezionato (sopra/sotto): `typography.body` con opacity
    decrescente verso i bordi (es. ±1 → 0.5, ±2 → 0.25). Calcola
    l'opacity per riga via `Math.abs(itemIndex - selectedIndex)`
    (nel render — usa `useMemo` per evitare ricalcolo eccessivo).
- Indicatore di centro: due `<View>` di 1px con `colors.border` in
  posizione absolute alle coordinate `centerY ± itemHeight/2`. Sottile
  ma visibile, dà l'effetto "selezione locked".
- Fade overlays: due `<View>` absolute in cima e in fondo (height ~30%)
  con linear gradient finto via opacity layered (niente lib gradient
  — uno strato `colors.bg` con opacity scalata in 3-4 step va bene).
  Stop se rende il rendering troppo costoso, è polish opzionale.
- Marker `prescribedValue`: piccolo punto/triangolo a destra dell'item
  corrispondente al valore prescritto, opacity 0.5. Solo se
  `prescribedValue !== undefined`.
- Accessibility: `accessibilityRole="adjustable"`,
  `accessibilityValue={{ min, max, now: value, text: \`${value} ${suffix ?? ''}\` }}`.
  `onAccessibilityAction` con increment/decrement che chiama
  `onChange(value ± step)` con clamp [min, max].

NB: il primitive NON deve dipendere da nulla di sport-specific — va
in `src/components/`, NON in `src/components/sport/`.

Dimensioni di default ragionevoli: `height = 180`, `itemHeight = 44`,
mostra 5 valori contemporaneamente (centro + 2 sopra + 2 sotto).

Smoke test mentale:
- Rendering con `value=12, min=0, max=30, step=1, suffix="reps"`:
  numero "12" centrato, sopra 11/10, sotto 13/14, opacity decrescente.
- Drag verso l'alto → numeri scorrono giù, snap al successivo,
  `onChange(13)` chiamato.
- Cambio del prop `value` da fuori (es. da 12 a 8) → la lista
  si riposiziona programmaticamente.
- `min=5, max=300, step=5` per i campi timer → range corretto, snap
  ogni 5.

Commit:

  feat(components): aggiungi primitive WheelPicker per input numerici a scorrimento

  Selettore numerico verticale snap-to-interval basato su FlatList
  built-in (zero dep nuove). Layout: 5 valori visibili, centrato,
  evidenziato in accent, fade overlays sopra/sotto. Range
  configurabile via min/max/step, suffix opzionale (es "reps",
  "sec"), marker prescribedValue per evidenziare il valore di
  default. Pieno supporto a value controlled da fuori +
  accessibilityRole="adjustable" per gli increment/decrement
  da screen reader. Nessuna dipendenza sport — vive in
  src/components/, riusabile in qualsiasi schermata.

────────────────────────────────────────────────────────────────
STEP C1.2 — [31] WheelPicker in TimerScreen (Tabata + Intervalli)
────────────────────────────────────────────────────────────────

Modifica **src/screens/sport/TimerScreen.tsx**:

- Identifica i 3 `<Input>` numerici per `workSec`, `restSec`,
  `rounds` (presenti nelle modalità Tabata + Intervalli, non
  Libero).
- Sostituiscili con 3 `<WheelPicker>` affiancati orizzontalmente
  in una Card (label sopra, picker sotto, suffix appropriato).
  Layout suggerito: una `<View>` con `flexDirection: 'row',
  gap: spacing.md, justifyContent: 'space-around'`.
- Range:
  - workSec: min 5, max 300, step 5 — suffix "sec".
  - restSec: min 5, max 300, step 5 — suffix "sec".
  - rounds: min 1, max 30, step 1 — suffix "round" (concorda al
    plurale solo se vuoi, "round" italiano è invariabile).
- Default Tabata: `TABATA_DEFAULT = { workSec: 20, restSec: 10,
  rounds: 8 }`. WheelPicker iniziale centrato su questi valori.
- Stato: tieni l'attuale `useState` per la config e passa
  `value`/`onChange` ai picker.
- Modalità Libero: nessun WheelPicker (è un cronometro count-up,
  non ha campi configurabili). Lasciare invariata.

Considerazioni:
- I `<Input>` numerici esistenti mostravano la tastiera virtuale.
  Eliminandoli, la tastiera non sarà più necessaria — verifica che
  non ci siano `keyboardAvoidingView` orfani o handler inutili.
- Il pulsante "Avvia" deve continuare a funzionare con i nuovi
  valori. Nessuna logica nel timer cambia, solo l'UI di input.

Smoke test mentale:
- Apri Timer → modalità Tabata → vedi 3 wheel picker centrati su
  20/10/8 → scrolli il primo → il valore cambia → tap "Avvia" →
  parte il countdown col nuovo workSec.
- Switch a Intervalli → stessi 3 picker, valori liberi.
- Switch a Libero → niente picker.

Commit:

  feat(sport): WheelPicker per work/rest/round in TimerScreen

  Sostituisce i 3 Input numerici con WheelPicker affiancati per
  Tabata e Intervalli. Range: workSec/restSec 5-300 step 5,
  rounds 1-30 step 1. Niente più tastiera virtuale per
  configurare un timer — selezione 1-2 swipe. Modalità Libero
  invariata (count-up, senza config).

  Chiude TODO [31].

────────────────────────────────────────────────────────────────
STEP C1.3 — [24] WheelPicker per "reps fatte" in ActiveSessionScreen
────────────────────────────────────────────────────────────────

Modifica **src/screens/sport/ActiveSessionScreen.tsx**:

- Linea ~415-417: rimuovi l'`<Input>` per "reps fatte".
- Sostituisci con un `<WheelPicker>`:
  - `value`: convertito da `parseInt(reps) || ex.reps || 0`. Tieni
    `reps` come stato `string` in salvataggio finale (la logica DB
    a linea ~319-321 si aspetta `Number(reps)`), ma esponi un
    `repsNumber` derivato per il picker.
  - `min`: 0
  - `max`: `Math.max(50, (ex.reps ?? 12) + 20)` (range generoso ma
    centrato sul prescritto).
  - `step`: 1
  - `suffix`: "reps"
  - `prescribedValue`: `ex.reps ?? undefined`
  - `accent`: il color `accent` del theme sport.
- Sotto il picker: una piccola `<Text>` di 1 riga in
  `typography.caption` che mostra il delta vs prescritto:
  - Se `repsNumber === ex.reps`: "Come prescritto" (color textSec).
  - Se `repsNumber > ex.reps`: "+N rispetto a {ex.reps} prescritte"
    (color colors.success o accent).
  - Se `repsNumber < ex.reps`: "−N rispetto a {ex.reps} prescritte"
    (color textSec).
  - Se `ex.reps === null`: niente label (l'utente sta facendo un
    esercizio senza reps prescritte, es. plank in tempo).
- Refactor di `setReps`: chiama `setReps(String(next))` quando il
  picker cambia.
- Esercizi a "tempo" (`ex.reps === null && ex.durationSec !== null`):
  niente WheelPicker per reps. Lascia il flow invariato (oggi mostra
  un timer, non un input reps — verifica che la branch giusta sia
  preservata).

Considerazioni:
- Su tap "Set completato" (linea ~315 circa): la logica esistente
  salva `repsDone = Number(reps) || ex.reps`. Continua a funzionare
  perché `reps` è ancora in stato `string`.
- Il bottone "Inizia ora" / "Pausa" / "Reprendi" / "Salta" non
  cambia.

Smoke test mentale:
- Inizia una sessione con un esercizio prescritto a 12 reps →
  WheelPicker centrato su 12 → label "Come prescritto".
- Scrolli a 15 → label "+3 rispetto a 12 prescritte".
- Tap "Set completato" → riga salvata con repsDone=15.
- Esercizio prescritto a tempo (es. plank 30s) → niente picker,
  flow invariato.
- Esercizio senza reps prescritte (`ex.reps === null`, ma con
  reps modificabili a piacere): WheelPicker da 0 a 50, niente
  label di delta.

Commit:

  feat(sport): WheelPicker per "reps fatte" in ActiveSessionScreen

  Sostituisce l'Input numerico testuale con WheelPicker centrato
  sul valore prescritto. Selezione 1-2 swipe invece di
  digitazione (mani sudate, telefono appoggiato). Label sotto il
  picker mostra il delta vs prescritto ("+N", "−N" o "Come
  prescritto"). Esercizi a tempo o senza reps prescritte
  preservano il flow esistente. Niente più tastiera virtuale
  durante una sessione live.

  Chiude TODO [24].

────────────────────────────────────────────────────────────────
PUSH FINALE
────────────────────────────────────────────────────────────────

  npm run typecheck     # ultima verifica
  git push -u origin claude/ux-polish-wheelpicker

Riepiloga in chat:
- 3 commit sul branch (1 primitive + 2 applicazioni).
- 2 voci TODO da chiudere al merge: [31], [24].
- Cosa ha senso QA-are manualmente sul device dopo il merge:
  - configura un Tabata da 25/15/6 con il picker → start →
    countdown corretto;
  - durante una sessione live, un esercizio prescritto a 12
    reps → completa 1 set lasciando 12 (verifica salvataggio) →
    completa 1 set scrollando a 10 (delta "−2") → verifica
    salvataggio e storico.

Procedi.
```

---

## Note operative per chi avvia la sessione

- Tempo atteso: ~3-4h. Il primitive WheelPicker è ~1h se l'agente è
  preciso, gli step di applicazione sono ~30-45min ciascuno.
- Dipendenze nuove introdotte: NESSUNA. FlatList è built-in di
  react-native.
- Modifiche allo schema DB: NESSUNA.
- Niente provider nuovi in App.tsx.
- Il primitive WheelPicker resta disponibile per usi futuri (peso,
  durata, qualsiasi input numerico ranged).

## Cosa NON includere in questa sessione (scope creep prevention)

- Niente refactor del campo "peso" in ActiveSessionScreen — il TODO
  [24] menziona "stesso pattern utile per il peso (kg) e la durata
  (sec) — generalizzare o lasciare reps come MVP iniziale". Ci
  fermiamo all'MVP reps. Peso/durata può seguire in iterazione
  futura.
- Niente cambio di logica di salvataggio del set (DB layer
  invariato).
- Niente modifiche a RestTimer (è scope di Sessione C2).
- Niente notifiche locali (Sessione C2).
- Niente edit a CLAUDE.md / ORCHESTRATOR_HANDOFF.md.
