# UX Polish — Sessione D (RunningView Tabata + ActiveSessionScreen overhaul)

## Pre-requisiti (verifica prima di lanciare)

- `main` aggiornato con tutto il batch UX Polish A→C3 mergeato
  (PR #58→#65). Verifica: `git log --oneline -10` deve mostrare i
  commit di C3.1 (`1666561`) e C3.2 (`ee911d1`).
- `npm ci` + `npm run typecheck` puliti su main.
- Nessuna sessione operaia in corso.

## Branch da creare nella sessione operaia

`claude/ux-polish-tabata-running-feedback-<id>` (la sessione operaia
genera il suffisso random).

## Scope unificato

Cinque interventi correlati, tutti scope sport mode:

1. **Restyle `RunningView` post-countdown** (chiude TODO [37]):
   allineare il treatment visivo del workout Tabata in esecuzione
   alla brochure premium della home Tabata.
2. **`WheelPicker` con prop `orientation`**: aggiungere
   `'vertical' | 'horizontal'` (default `vertical`, retrocompat).
3. **`RepsPicker` passa a orizzontale**: in `ActiveSessionScreen`
   risolve il bug "scroll picker scrolla la pagina invece" causato
   da gesture conflict con la `<ScrollView>` padre. Comprime anche
   l'altezza del blocco reps.
4. **Sostituzione RPE 1-10 → due pill "Poco" / "Troppo"**: chip-row
   1-10 attuale rimosso, sostituito con due pill mutuamente
   esclusive larghe metà schermo (verde / rosso). Storage `rpe`
   invariato, mappato 3 (Poco) / 9 (Troppo) / null.
5. **Rimozione campo Peso (kg) dalla UI sport**: l'utente fa solo
   allenamento in casa, il peso non serve. Solo UI: il DB resta
   intatto (forward-compat per re-introduzione futura).

---

## Prompt da incollare

````
Sei in /home/user/FatTrack su branch main aggiornato.

Sessione operaia per UX Polish D: restyle della `RunningView` post-countdown
del Tabata + overhaul `ActiveSessionScreen` (WheelPicker orizzontale,
sostituzione RPE 1-10 con feedback Poco/Troppo, rimozione campo Peso).
Tutti questi interventi vivono sul filone sport mode UX e si fanno in
un unico branch + un unico PR per coerenza.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md (vincoli stilistici e architetturali; in particolare la
   tabella "Cosa usare sempre" e la regola "non stilare inline con
   valori magici").
2. src/theme/index.ts (colors, spacing, typography, radii).
3. src/screens/sport/TabataScreen.tsx (in particolare RunningView e
   come è strutturata la home brochure — palette accent saturo, hero
   copy, stat-card; lo stride visivo che devi colmare è qui).
4. src/screens/sport/ActiveSessionScreen.tsx (sessione live, RepsPicker
   esistente alle linee 541-579, RPE chip-row alle linee 463-494,
   campo Peso alle linee 454-460, formatPrescription alla linea 689).
5. src/components/WheelPicker.tsx (primitive verticale che deve
   guadagnare prop `orientation`).
6. src/components/sport/SessionDetailModal.tsx (visualizzazione
   storico, formatSet alle linee 45-54).
7. src/utils/svgArc.ts (helper `describeArc` / `polarToCartesian`
   già usati in HoldToStartButton, RestTimer, RestTimerStandaloneModal,
   CountdownOverlay).

API e file disponibili (NON cambiare):
- `useAppTheme()` da `@/theme/ThemeContext` → `{ accent, accentDark,
  accentSoft, ring, bgTint }`. In modalità sport `accent` è arancio
  saturo (`sportColors.accent`).
- `colors.green` / `colors.red` per i due pill di feedback.
  Conferma in `src/theme/index.ts` che esistano (sono già usati in
  altre schermate).
- `Haptics` via `lightHaptic()` / `successHaptic()` da
  `@/utils/haptics`. Rispettano già il flag `hapticEnabled`.
- `describeArc(cx, cy, r, startAngle, endAngle)` da
  `@/utils/svgArc`: usalo per il pie chart progress della
  RunningView (pattern già rodato in RestTimer e
  CountdownOverlay).

Crea il branch:
```
git checkout -b claude/ux-polish-tabata-running-feedback-<rand>
```
(genera un suffisso random a 5 caratteri).

---

## Step D1 — `WheelPicker` con prop `orientation`

File: `src/components/WheelPicker.tsx`

- Aggiungi prop opzionale `orientation?: 'vertical' | 'horizontal'`,
  default `'vertical'`. Mantieni retrocompat al 100% per i caller
  esistenti (i tre WheelPicker in `TabataConfigModal` restano
  verticali — non li toccare).
- In modalità `'horizontal'`:
  - `FlatList` con prop `horizontal`, `snapToInterval={itemWidth}`
    invece di `itemHeight`.
  - Larghezza item fissa (~64px), altezza item ridotta (~64px) —
    la wheel orizzontale è una riga sottile e larga.
  - Width totale = `width` (nuova prop opzionale, default 240px).
    `height` ignorata in horizontal mode.
  - `paddingHorizontal: (width - itemWidth) / 2` invece di
    `paddingVertical`.
  - Fade overlays sx/dx invece che alto/basso.
  - Center-line: due linee verticali (a sx e a dx dello slot
    centrale) invece che orizzontali.
  - Suffix: NON sovrapposto sopra/sotto il numero. In horizontal
    mode renderizza il suffix in un `<Text>` separato sotto la
    wheel, gestito dal caller — non internamente al picker (più
    flessibile, evita layout magico).
    Alternativa: rendi il suffix opzionale anche in vertical e
    sposta il render fuori dal picker. Decidi tu, basta che il
    risultato sia pulito.
  - `onMomentumScrollEnd`: leggi `e.nativeEvent.contentOffset.x`
    invece di `.y`.
  - `useEffect` di re-allineamento: usa
    `scrollToOffset({ offset: selectedIndex * itemWidth })`.
  - Marker `prescribedValue`: in vertical è un pallino a destra del
    numero. In horizontal mettilo SOPRA il numero (centrato
    orizzontalmente) — più visibile su wheel orizzontale.

- Refactor delle dimensioni: i nomi `itemHeight` / `height` restano
  per vertical, aggiungi `itemWidth?: number` (default 64) e
  `width?: number` (default 240) per horizontal. Non rinominare i
  prop esistenti.

- Accessibilità: `accessibilityRole="adjustable"` e
  `accessibilityActions` restano identici.

Smoke test interno: i tre `<WheelPicker>` di
`TabataConfigModal.tsx` (Lavoro / Recupero / Round) devono
continuare a funzionare in verticale identici a prima.

Commit suggerito:
`feat(sport): aggiungi prop orientation horizontal a WheelPicker`

---

## Step D2 — `RepsPicker` passa a orizzontale

File: `src/screens/sport/ActiveSessionScreen.tsx`

- In `RepsPicker` (linea 541) passa `orientation="horizontal"` al
  `<WheelPicker>` (linea 562).
- Width consigliata: 280px o `'100%'` (verifica che il container
  Card lo permetta — usa `flex: 1` se serve).
- Sposta il suffix "reps" come `<Text>` sotto la wheel (label
  caption, allineata a centro), oppure rimuovi del tutto il suffix
  visivo (la label "Reps fatte" sopra è già esplicativa). Decidi
  tu — basta che resti chiaro.
- L'altezza totale del blocco reps deve scendere di ~80-100px
  rispetto alla wheel verticale (è il punto: stare in viewport
  senza scroll della pagina).
- Verifica che lo `styles.repsBlock` sia coerente: prima
  probabilmente forzava un'altezza fissa pensata per vertical.

Bug risolto: con la wheel orizzontale il gesto orizzontale non
collide più con lo scroll verticale della `<ScrollView>` padre
(linea 391). Verifica manuale post-fix.

Commit suggerito:
`feat(sport): RepsPicker passa a wheel orizzontale (fix gesture conflict)`

---

## Step D3 — Sostituzione RPE 1-10 con feedback Poco/Troppo

File: `src/screens/sport/ActiveSessionScreen.tsx`

- Rimuovi la costante `RPE_OPTIONS` (linea 53-56).
- State `rpe` resta (è `useState<number | null>(null)`, linea 295)
  ma il dominio diventa `null | 3 | 9` invece di `null | 1..10`.
- Sostituisci il blocco RPE (linee 463-494) con:
  - Header label: `"Com'è andato? — opzionale"` (typography.label,
    `marginTop: spacing.md`).
  - Riga con due pill larghe metà schermo, gap `spacing.sm`:
    - **Poco** (verde): `colors.green` background quando attivo,
      `colors.card` + border `colors.border` quando inattivo.
      Testo: bianco se attivo, `colors.textSec` se inattivo.
      `value === 3`.
    - **Troppo** (rosso): `colors.red` background quando attivo,
      `colors.card` + border `colors.border` quando inattivo.
      `value === 9`.
  - Pill: padding `spacing.sm` verticale + `spacing.md`
    orizzontale, `borderRadius: radii.md`, `flex: 1`.
    `flexDirection: row`, `alignItems: center`, `justifyContent:
    center`.
  - Tap su pill già attivo → set `rpe = null` (deselect).
  - Tap su pill inattivo → set `rpe = <valore>` (mutuamente
    esclusivi).
  - `accessibilityRole="button"` + `accessibilityState={{ selected:
    active }}`.
  - `lightHaptic()` su ogni tap (coerente con altri tap della
    schermata).

- Verifica `submit()` (linee 350-351): `if (rpe !== null) data.rpe =
  rpe;` resta identico — funziona uguale con i nuovi valori 3/9.

Stili nuovi (in `styles`):
- `feedbackRow`: `flexDirection: row`, `gap: spacing.sm`,
  `marginTop: spacing.sm`.
- `feedbackPill`: `flex: 1`, `paddingVertical: spacing.sm`,
  `paddingHorizontal: spacing.md`, `borderRadius: radii.md`,
  `borderWidth: 1`, `alignItems: center`, `justifyContent:
  center`.
- Rimuovi gli stili `rpeRow` e `rpeChip` (non più usati).

Commit suggerito:
`feat(sport): sostituisci RPE 1-10 con feedback Poco/Troppo`

---

## Step D4 — Rimozione campo Peso dalla UI sport

Solo UI. Schema DB invariato (`session_sets.weight_kg` resta,
`WorkoutExercise.weightKg` resta nel tipo, `sessionsDB.createSet`
accetta ancora `weightKg` — sarà sempre `null` per le nuove
sessioni). Forward-compat per reintroduzione futura.

File 1: `src/screens/sport/ActiveSessionScreen.tsx`
- Rimuovi `useState<string>('')` weight + `setWeight` (linea 293).
- Rimuovi il blocco `useEffect` che fa prefill di `weight` da
  `ex.weightKg` (linee 301-305 circa, dentro il useEffect che
  prefilla anche reps).
- Rimuovi l'`<Input>` "Peso (kg) — opzionale" (linee 454-460).
- Rimuovi `data.weightKg = w` dal submit (linee 347-348). Il
  campo passato a `completeSet` resta optional con default null.
- In `formatPrescription` (linea 689): rimuovi il segmento
  `${ex.weightKg ? \` · ${ex.weightKg}kg\` : ''}` (linea 700).
  Lascia solo `${currentSet} / ${totalSets} set · ${ex.reps}
  reps`.

File 2: `src/components/sport/SessionDetailModal.tsx`
- In `formatSet` (linee 45-54): rimuovi il branch che mostra
  `${reps} reps × ${set.weightKg} kg`. Lascia solo
  `${reps} reps`.
- Aggiorna il commento alla linea 11-13 per riflettere lo stato
  attuale (RPE → feedback Poco/Troppo, peso temporaneamente non
  visualizzato).

Niente migrazione DB. Niente touch a `WorkoutEditorModal.tsx`
(linee 238/256 passano già `weightKg: null` di default — coerente).

Commit suggerito:
`chore(sport): rimuovi input Peso e visualizzazioni kg dalla UI`

---

## Step D5 — Restyle `RunningView` post-countdown (Tabata)

File: `src/screens/sport/TabataScreen.tsx`

Trova la `RunningView` (sotto-componente / view condizionale che
si attiva post-countdown durante la fase "Lavoro" / "Recupero" /
"Round X"). Il treatment attuale è generico — label + numero
countdown grande. Va allineato alla brochure della home Tabata
(palette accent saturo, tipografia bold, cornici premium).

Layout target (Opzione B concordata col proprietario):

```
┌─────────────────────────────┐
│         Round 3 / 8         │   ← typography.h1, color: accent
│                             │
│    ┌───────────────┐        │
│   ╱  pie chart SVG ╲       │   ← arco accent attorno al numero
│  │       12        │       │      countdown (riempimento durante
│   ╲                ╱       │      la fase, vuoto a inizio fase)
│    └───────────────┘        │
│                             │
│         Lavoro              │   ← typography.value, accent saturo
│                             │      ("Recupero" in fase rest)
│      [Salta] [Pausa]        │
└─────────────────────────────┘
```

Dettagli:

- **"Round X / Y" prominente in alto**: typography.h1 (o display
  se più grande), color `accent`. Stacca dal numero del countdown,
  diventa il primo elemento informativo letto.

- **Pie chart SVG attorno al countdown**: usa `describeArc` da
  `@/utils/svgArc`. Pattern come `RestTimer` o
  `RestTimerStandaloneModal` (vedili come reference):
  - SVG `width=240 height=240` (o quello che ti torna comodo,
    purché tipograficamente coerente).
  - Arco di sfondo: cerchio completo, stroke `theme.bgTint` o
    `colors.border`, `strokeWidth=12`.
  - Arco di progresso: stroke `accent`, `strokeWidth=12`,
    `strokeLinecap=round`. Si riempie da -90° (alto) durante la
    fase. Calcolo: `progress = elapsed / phaseDurationSec` (clamp
    0-1).
  - Numero del countdown al centro del cerchio: typography.value
    (o display), color accent.
  
- **Distinzione fase Lavoro vs Recupero**:
  - Fase "Lavoro": background `colors.bg`, accenti pieni
    (`accent`).
  - Fase "Recupero": background tenue (`theme.bgTint` come
    overlay), accenti più morbidi (`accentSoft`). L'idea è che il
    recupero "respiri" visivamente, non sia un altro full-blast
    accent.
  - Label sotto il pie chart: "Lavoro" / "Recupero" in
    typography.value, in maiuscolo se ti torna meglio
    visivamente.

- **Pulsanti azione invariati** (Salta / Pausa già esistenti).
  Solo allineamento estetico se necessario (no scope creep).

- Mantieni `Haptics` + audio countdown già configurati nei tick,
  non toccarli.

NON toccare la logica di `advanceInterval` né l'audio del
countdown. Restyle puramente visivo della view "in esecuzione".

Commit suggerito:
`feat(sport): restyle RunningView Tabata con pie chart accent`

---

## Vincoli operativi

- **Italiano** in tutti i testi UI / label nuovi (Poco, Troppo,
  Com'è andato?, Round X / Y, Lavoro, Recupero).
- **No nuove librerie**. Usa solo quello che è già in
  `package.json` (react-native-svg, expo-haptics, expo-av,
  WheelPicker primitive).
- **No PR**. Push del branch + stop. L'utente farà il merge.
- **No git push --force**, no hook-skip.
- **Niente touch al theme tokens** (`src/theme/index.ts`) tranne
  che per consultarli. Se mancasse un colore (improbabile,
  controlla prima), parla col proprietario.
- **No restyle dello storico** (SessionDetailModal): solo
  rimozione peso. Il feedback Poco/Troppo NON va mostrato in
  storico in questa sessione (scope futuro se servirà).
- **No touch a WorkoutEditorModal**: l'utente non edita peso lì
  (già passa `weightKg: null`), nessun cambio richiesto.

## Smoke test (verifica manuale dopo l'implementazione)

1. **Typecheck pulito**: `npm run typecheck`.
2. **WheelPicker vertical preservato**: apri tab Tabata → tap
   icona config → i 3 picker (Lavoro / Recupero / Round) sono
   verticali identici a prima, scroll verticale funziona, valori
   selezionabili.
3. **WheelPicker horizontal nuovo**: avvia una sessione di
   allenamento (qualsiasi scheda con esercizi a reps, es. "Full
   Body Casa" preset) → durante un set non-resting vedi la wheel
   reps come riga orizzontale. Scroll orizzontale funziona, scroll
   verticale della pagina NON è più rubato dal picker.
4. **Feedback Poco/Troppo**: stesso schermo → vedi due pill larghe
   "Poco" (verde) e "Troppo" (rosso) sotto label "Com'è andato? —
   opzionale". Tap Poco → si seleziona (background verde). Tap
   Troppo → switcha a Troppo. Ri-tap Troppo → resetta a inattivo.
   Salva il set, verifica nello storico (non mostra nulla in
   merito al feedback — voluto).
5. **Peso rimosso**: nella sessione live non c'è più input peso.
   La prescription line mostra "1 / 3 set · 8 reps" senza
   " · 20kg" (anche se la scheda preset aveva un peso
   prescritto, era già null per i preset). Storico (apri una
   sessione completata da Storico tab) mostra "8 reps" e basta.
6. **RunningView Tabata restyle**: tab Tabata → Hold to start →
   countdown 5→1 fullscreen → entra in "Round 1 / 8 · Lavoro" →
   verifica:
   - "Round 1 / 8" grande in alto, color accent.
   - Pie chart attorno al numero del countdown, si riempie durante
     i 20s di lavoro.
   - Label "Lavoro" sotto, accent saturo.
   - Transizione a "Recupero": background più tenue, label
     "Recupero", arco con `accentSoft`.
   - Cambio round: "Round 2 / 8" si aggiorna correttamente.
   - Audio + haptic countdown 5→1 finali invariati.
7. **Sessione live di nuovo dopo restyle**: avvia una scheda
   normale, completa 1 set con feedback Poco, completa 1 set
   senza feedback, end session, verifica storico → entrambi i set
   visibili, durata e calorie corrette.

## Note finali per la sessione operaia

- Effort stimato totale: ~3-4 ore. Se sfori sostanzialmente,
  fermati e segnala invece di tagliare scope.
- Commit incrementali (uno per step D1-D5) — facilita la review.
- Push del branch con `git push -u origin <branch>` (retry su
  errori network, max 4 tentativi con backoff esponenziale).
- Niente PR (l'utente la crea da sé).
- Trailer commit standard: `https://claude.ai/code/session_<id>`.

Procedi.
````

---

## Note operative per chi avvia la sessione

- Tempo atteso: ~3-4h.
- Branch dedicato: `claude/ux-polish-tabata-running-feedback-<rand>`.
- A merge avvenuto, l'orchestratore:
  - sposta TODO [37] in "✅ Fatto" con data chiusura.
  - aggiorna `docs/ORCHESTRATOR_HANDOFF.md` §6.2 con la nuova riga.
  - cancella questo file `PROMPT_SESSION_D.md` nello stesso commit.
  - parte con sessione E ([14] backup tabelle sport).

## Cosa NON includere (scope creep prevention)

- ❌ Restyle dello storico (`SessionDetailModal` mostra solo
  rimozione peso, niente badge feedback).
- ❌ Touch a `WorkoutEditorModal` o `WorkoutsScreen` (peso già
  null lì).
- ❌ Migrazione DB (schema invariato).
- ❌ Toggle in Settings per riabilitare il peso (nessuna
  configurazione, decisione hardcoded per ora).
- ❌ Animazione di transizione Lavoro→Recupero (cross-fade
  semplice come oggi va bene; l'animazione fancy è scope
  futuro).
- ❌ Secondo arco esterno per il progresso totale dei round
  (sarebbe Opzione C, scartata).
- ❌ Aggiungere voci TODO nuove per i sotto-task (RPE→feedback,
  WheelPicker fix, peso rimosso) — chiusi nello stesso PR via
  commit message dettagliati.
