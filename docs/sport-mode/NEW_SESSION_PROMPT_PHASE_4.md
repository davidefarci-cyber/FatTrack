# Prompt per nuova sessione — Sport Mode Fase 4 (Libreria + dashboard + storico)

> **Pre-requisiti**: Fase 3 mergeata su `main` (PR #54).
> Branch atteso per la Fase 4: `claude/sport-mode-exercises-dashboard`.
> Riferimento piano completo: `docs/sport-mode/PLAN.md` §4.

Fase media: 3 commit, ~3-4h. Riempie tre placeholder rimasti
(Esercizi, Home, Storico) usando dati e API già pronti dalle
fasi 2-3. Niente nuove tabelle, solo nuova UI + hook di
aggregazione.

---

## Prompt da incollare

```
Sei in /home/user/FatTrack su branch main aggiornato.

Implementa la FASE 4 della modalità Sport: libreria esercizi
con filtri e guida, Home dashboard con scheda di oggi /
settimana / ultimo allenamento, Storico sessioni con riepilogo
set-per-set. Niente nuove tabelle DB: sfrutti i dati già scritti
da Fase 3.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md — vincoli stilistici, design system non
   negoziabile, convenzioni DB e codice.
2. docs/sport-mode/PLAN.md §4 — descrizione di alto livello
   della fase.
3. src/database/sessionsDB.ts — getAllSessions, getSessionSets,
   getSessionById sono pronti dall'inizio.
4. src/database/seedExercises.ts — la lista attuale (10
   esercizi base seedati in Fase 2). Va espansa a ~40 in step 4A.
5. src/components/CalorieRing.tsx — accetta già prop `accent`
   e usa useAppTheme(); riusalo per la dashboard sport (NON
   forkare) — vedi step 4B.

API e file disponibili (riusa, NON ricreare):

- DB: workoutsDB.getAllWorkouts/getWorkoutById,
  exercisesDB.getAllExercises/getExerciseById/getExercisesByIds,
  sessionsDB.getAllSessions/getSessionSets/getSessionById.
  Tipi: Exercise, Workout, Session, SessionSet da @/database.
- Profile: useProfile da @/hooks/useProfile (peso per stats).
- Theme: useAppTheme(), sportColors, sportPalette,
  APP_NAME_SPORT da @/theme.
- Active session: useActiveSession da @/contexts/ActiveSessionContext.
  Il bottone "Inizia ora" della Home (step 4B) chiama
  useActiveSession().start(workoutId) ESATTAMENTE come fa
  WorkoutsScreen oggi (vedi src/screens/sport/WorkoutsScreen.tsx
  handleStart). Se è già attiva una sessione, il pulsante deve
  riaprirla (set pendingOpen via context O acknowledge esposto)
  invece di tentare uno start nuovo che farebbe throw.
- Primitives: BottomSheet, Card, Button, Input, ScreenHeader,
  Toast (useToast), SegmentedControl, Icon, FAB, CalorieRing.
- Linking: react-native Linking (già usato nell'app, vedi
  src/utils/updateChecker.ts) per aprire video URL esterni
  (YouTube). NON aggiungere lib di video player.

Poi:

- Crea il branch claude/sport-mode-exercises-dashboard da main.
- Esegui i 3 step descritti sotto, una alla volta, con un
  commit separato per ognuno.
- Dopo ogni commit: `npm run typecheck` deve passare. Se la
  prima volta node_modules manca, fai `npm ci`.
- I messaggi di commit seguono il pattern `feat(sport): …` +
  body descrittivo + trailer
  https://claude.ai/code/session_<id>.
- Niente PR: alla fine fai solo `git push -u origin
  claude/sport-mode-exercises-dashboard`. Sarò io a decidere
  il merge.

────────────────────────────────────────────────────────────────
STEP 4A — Libreria esercizi (ExercisesScreen + ExerciseDetailModal + seed espanso)
────────────────────────────────────────────────────────────────

Espandi **src/database/seedExercises.ts** da 10 a ~40 esercizi.
Mantieni invariati i 10 attuali (Squat, Affondi, Push-up, Plank,
Crunch, Burpees, Mountain climber, Glute bridge, Bird-dog,
Cat-cow) — il check `count===0` resta invariato, ma per gli
utenti che hanno già seedato con la lista vecchia AGGIUNGI un
secondo step in fondo a `seedExercisesIfEmpty` (rinominalo se
serve in `seedExercisesAndTopUp`):

```ts
// Top-up idempotente: se la libreria è stata seedata da una
// versione precedente con N esercizi < lista corrente,
// inseriamo solo quelli mancanti per nome (UNIQUE constraint
// su exercises.name). Niente UPDATE su esistenti — l'utente
// potrebbe averli editati in futuro (anche se in Fase 4 non è
// possibile, lasciamo aperta la porta).
for (const ex of SEED_EXERCISES) {
  await db.runAsync(
    `INSERT OR IGNORE INTO exercises
       (name, muscle_group, equipment, level, description,
        guide_steps, video_url, met)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ex.name, ex.muscleGroup, ex.equipment, ex.level,
    ex.description, JSON.stringify(ex.guideSteps),
    ex.videoUrl, ex.met,
  );
}
```

Lista da seedare (40 totali, 10 vecchi + 30 nuovi). Per ognuno:
descrizione 1 frase + guideSteps array di 3-5 passi + met
realistico. NIENTE videoUrl in questa fase (lascialo NULL — i
link veri li aggiungerai in TODO futuro).

GAMBE/GLUTEI:
- Squat (esistente)
- Affondi (esistente)
- Bulgarian split squat — Gambe / Sedia o panca / intermedio / met 6
- Wall sit — Gambe / Corpo libero / principiante / met 4
- Calf raise — Gambe / Corpo libero / principiante / met 3
- Single-leg deadlift — Glutei/Equilibrio / Corpo libero / intermedio / met 4
- Hip thrust — Glutei / Sedia o panca / principiante / met 4
- Glute bridge (esistente)
- Step-up — Gambe / Sedia o panca / principiante / met 5
- Sumo squat — Gambe / Corpo libero / principiante / met 5

PETTO/SPALLE/TRICIPITI:
- Push-up (esistente)
- Push-up declinati — Petto / Sedia o panca / intermedio / met 5
- Diamond push-up — Tricipiti / Corpo libero / intermedio / met 5
- Pike push-up — Spalle / Corpo libero / intermedio / met 5
- Tricep dip — Tricipiti / Sedia o panca / intermedio / met 5
- Wide push-up — Petto / Corpo libero / principiante / met 4
- Plank to push-up — Petto/Core / Corpo libero / intermedio / met 5

CORE:
- Plank (esistente)
- Side plank — Core obliqui / Corpo libero / principiante / met 3
- Crunch (esistente)
- Russian twist — Core obliqui / Corpo libero / principiante / met 4
- Hollow hold — Core / Corpo libero / intermedio / met 4
- Bird-dog (esistente)
- Dead bug — Core / Corpo libero / principiante / met 3
- Leg raise — Core basso / Corpo libero / principiante / met 4

CARDIO/FULL BODY:
- Burpees (esistente)
- Mountain climber (esistente)
- Jumping jacks — Cardio / Corpo libero / principiante / met 7
- High knees — Cardio / Corpo libero / principiante / met 7
- Skater jumps — Cardio / Corpo libero / intermedio / met 7
- Squat jumps — Gambe/Cardio / Corpo libero / intermedio / met 8

MOBILITÀ:
- Cat-cow (esistente)
- Cobra — Mobilità schiena / Corpo libero / principiante / met 2
- Child pose — Mobilità schiena / Corpo libero / principiante / met 2
- Downward dog — Mobilità full body / Corpo libero / principiante / met 2.5
- Hip circles — Mobilità anche / Corpo libero / principiante / met 2
- Shoulder rolls — Mobilità spalle / Corpo libero / principiante / met 2
- Pigeon pose — Mobilità anche / Corpo libero / intermedio / met 2.5

RECUPERO/STRETCHING:
- Hamstring stretch — Stretching / Corpo libero / principiante / met 2
- Quad stretch — Stretching / Corpo libero / principiante / met 2
- Chest opener — Stretching / Corpo libero / principiante / met 2
- Spinal twist — Stretching / Corpo libero / principiante / met 2

Sostituisci il body di **src/screens/sport/ExercisesScreen.tsx**
mantenendo `export default function ExercisesScreen`.

Layout:
- ScreenHeader "Esercizi" subtitle "Libreria + guida".
- Search bar (Input con placeholder "Cerca esercizio…",
  debounce 250ms).
- Riga di filtri sotto (orizzontale scrollabile via ScrollView
  horizontal, gap sm):
  - Dropdown/SegmentedControl "Gruppo muscolare":
    [Tutti, Gambe, Glutei, Petto, Spalle, Tricipiti, Core,
    Cardio, Mobilità, Stretching]. (NB: il muscleGroup è un
    TEXT free-form, ma il seed di sopra usa label limitati;
    deriva la lista distintiva via DISTINCT a runtime, non
    hardcodare se è facile.)
  - Dropdown "Livello": [Tutti, Principiante, Intermedio,
    Avanzato].
  - Dropdown "Attrezzatura": [Tutti, Corpo libero, Sedia o
    panca, …].
- Lista risultati: `<Card>` per esercizio con nome (bold),
  caption "muscleGroup · equipment · level". Tap → apre
  `ExerciseDetailModal`.
- Empty state: "Nessun esercizio trovato per i filtri attuali."

Scelta UI per i filtri: la più semplice è una SegmentedControl
orizzontale per ogni filtro (3 strisce). Se ti pare troppo
ingombrante visivamente, fai un singolo BottomSheet "Filtri"
con tutti i campi insieme, aperto da un Pressable
"Filtri (N attivi)". Decidi tu, ma NON aggiungere librerie di
dropdown (`react-native-picker` ecc.).

Crea **src/components/sport/ExerciseDetailModal.tsx**:

Props:
```ts
type Props = {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
};
```

Layout (dentro BottomSheet, maxHeightPercent 85):
- Header: nome esercizio (typography.h1) + badge muscleGroup
  con sportPalette se mappabile altrimenti colore neutro.
- Caption con: "{equipment} · {level} · MET {met ?? '—'}"
- Description (typography.body).
- Sezione "Come si fa": ScrollView con guideSteps numerate
  ("1. {step}", "2. {step}", …). Se guideSteps è null
  mostra "Guida non disponibile."
- Pulsante "Guarda video" SOLO se videoUrl != null →
  `Linking.openURL(videoUrl)`. Tutta la fase 4 ha videoUrl
  null per default; il pulsante resta progettato per quando
  arriveranno i link.
- Pulsante "Chiudi" in fondo.

Stile: usa SOLO i token. NIENTE hex inline.

Commit: `feat(sport): ExercisesScreen con filtri + ExerciseDetailModal + seed espanso a 40`

────────────────────────────────────────────────────────────────
STEP 4B — SportHomeScreen dashboard
────────────────────────────────────────────────────────────────

Sostituisci il body di **src/screens/sport/SportHomeScreen.tsx**
mantenendo `export default function SportHomeScreen` e il cog
in alto a destra che già naviga a SportSettings.

Crea **src/hooks/useSportStats.ts**:

```ts
type WeekStats = {
  daysTrained: number;          // count distinct(date(started_at)) sett. corrente
  totalMinutes: number;         // somma duration_sec / 60
  totalCalories: number;        // somma calories_estimated
  weeklyTarget: number;         // hardcoded 4 (configurabile in fase 5)
};

type LastSession = {
  session: Session;
  exerciseCount: number;        // count distinct exercise_id
  setCount: number;             // count session_sets
} | null;

export type SportStats = {
  loading: boolean;
  week: WeekStats;
  last: LastSession;
  reload: () => Promise<void>;
};

export function useSportStats(): SportStats;
```

- "Settimana corrente" = da lunedì 00:00 (locale Europe/Rome
  approx OK con date-fns o calcolo manuale: `new Date()`,
  `getDay()`, sottrai giorni). NON aggiungere date-fns:
  calcola a mano in 5 righe.
- Re-fetch al mount + esposto `reload()` (chiamato dal context
  active session quando una sessione finisce — vedi step 4B
  wiring sotto).

Layout SportHomeScreen:
- ScreenHeader title=APP_NAME_SPORT subtitle="Modalità sport"
  + cog (già esistente).
- ScrollView con 3 Card:

1. **Card "Allenamento di oggi"**:
   - Titolo "Allenamento di oggi" + Icon `bolt` (accent).
   - Logica scheda preselezionata:
     - Se esiste una sessione attiva (`useActiveSession().state
       != null`): mostra "Sessione in corso · {workoutName}"
       e il pulsante diventa "Riprendi" → setta pendingOpen
       (chiamando `useActiveSession()` e modificando lo stato
       o esponendo un metodo dedicato; vedi nota wiring sotto).
     - Altrimenti: scheda = ULTIMA usata (`getAllSessions()[0]?.workoutId`
       se esiste e la scheda non è stata cancellata),
       fallback al primo preset (`getAllWorkouts().find(w => w.isPreset)`).
       Mostra nome + categoria + count esercizi + durata
       stimata. Pulsante primario "Inizia ora" →
       `useActiveSession().start(workoutId)`.
   - Sotto al pulsante: link "Cambia scheda" → apre
     `<WorkoutPickerSheet>` (BottomSheet con lista
     `getAllWorkouts()`, tap → setta scheda di oggi in
     local state della Home, NON persistito in DB; al cold
     start si torna alla logica "ultima usata").

2. **Card "Settimana"**:
   - Titolo "Questa settimana".
   - `<CalorieRing>` (riusa primitive!) con
     `consumed={week.daysTrained}`, `target={week.weeklyTarget}`,
     `accent={useAppTheme().accent}`. Il ring già gestisce
     l'arancio sport via theme. Le label "kcal" del ring
     vanno cambiate? CalorieRing hardcoda "kcal" — vedi NOTA
     RIUSO sotto.
   - Sotto il ring, due righe stat:
     "{totalMinutes} min totali · {totalCalories} kcal bruciate".

3. **Card "Ultimo allenamento"** (solo se `last != null`):
   - Titolo "Ultimo allenamento".
   - Riga: nome scheda + data formattata ("ieri", "2 giorni fa"
     o data completa se > 7gg).
   - Caption: "{exerciseCount} esercizi · {setCount} set ·
     {duration} min".
   - Tap → naviga al SportHistoryScreen (step 4C) e idealmente
     apre il dettaglio della sessione. SOLUZIONE: passa
     `route.params.openSessionId` al tab History; il History
     screen lo legge e apre il modal di dettaglio.

NOTA RIUSO CalorieRing: il componente attualmente hardcoda la
label "kcal" in fondo (`CalorieRing.tsx:62`). Per la dashboard
sport vogliamo "giorni" invece di "kcal". DUE OPZIONI:
- (A) Estendi CalorieRing con prop `unit?: string` (default
  "kcal"). Modifica minimale, retrocompatibile.
- (B) Crea `WorkoutRing.tsx` come piccolo wrapper attorno a
  CalorieRing che passa la unit corretta.

Vai per (A): un solo prop opzionale, niente nuovo file. Aggiungi
anche un'eventuale prop `formatValue?: (n: number) => string`
se serve evitare il "/100" → in realtà no, basta che la
chiamata passi `consumed=daysTrained`, `target=weeklyTarget`,
`unit="giorni"`.

WIRING: il `start()` della session reload-a la dashboard quando
finisce. Decisione: dentro `useSportStats`, sottoscriviti al
context con `useActiveSession()` e re-fetch quando
`state.session.endedAt` cambia (cioè quando la sessione si
chiude). Oppure aggiungi un evento "session ended" nel context
che useSportStats osserva. La via più semplice: useEffect che
guarda `[useActiveSession().state]` e chiama `reload()` quando
state passa da non-null a null (la sessione si è chiusa).

Commit: `feat(sport): SportHomeScreen dashboard con scheda di oggi/settimana/ultima`

────────────────────────────────────────────────────────────────
STEP 4C — SportHistoryScreen
────────────────────────────────────────────────────────────────

Sostituisci il body di
**src/screens/sport/SportHistoryScreen.tsx**.

Layout:
- ScreenHeader "Storico" subtitle "Le tue sessioni".
- SegmentedControl periodo: [7gg, 30gg, Tutto]. Default 30gg.
- Card "Riepilogo periodo" in alto:
  - "{totalSessions} sessioni · {totalMinutes} min · {totalCalories} kcal"
  - Eventuale chart NON obbligatorio in questa fase: l'utente
    ha già il ring settimana nella Home. Se ti pare brutto
    senza chart, mostra una mini barra orizzontale per giorno
    (8 px alta, larga proporzionale ai minuti) come riga sotto
    il riepilogo. Ma NON riusare HistoryChart (è cablato per
    HistoryDay diet con macro). Una semplice barra fatta a
    mano va bene.
- Lista sessioni:
  - Card per ognuna (`getAllSessions()` filtrato per periodo).
  - Riga 1: data (formattata "lun 27 gen") + nome scheda.
  - Riga 2: badge categoria (sportPalette) + caption
    "{duration} min · {calories} kcal".
  - Tap → apre `SessionDetailModal`.
- Empty state: "Nessuna sessione nel periodo."

Crea **src/components/sport/SessionDetailModal.tsx**:

Props:
```ts
type Props = {
  visible: boolean;
  sessionId: number | null;
  onClose: () => void;
};
```

Layout (BottomSheet, maxHeightPercent 90):
- Header: nome scheda + data completa + badge categoria.
- Riga stats: "{duration} min · {calories} kcal · {setCount} set".
- Sezione "Esercizi": per ognuno
  (`getSessionSets(sessionId)` raggruppato per `position`):
  - Nome esercizio (lookup da `exercisesDB.getExercisesByIds`).
  - Lista set: "Set {n}: {repsDone} reps × {weightKg} kg" o
    "{durationSec}s" se a tempo. Niente RPE in UI per ora
    (resta nel DB).
- Note (typography.caption italica) se `session.notes != null`.
- Pulsante "Chiudi".

Wiring tap dalla Home (step 4B link):
- Aggiungi a SportTabParamList un parametro opzionale a History:
  ```ts
  History: { openSessionId?: number } | undefined;
  ```
- In SportHistoryScreen leggi i route.params; se `openSessionId
  != null` apri il modal con quel session.
- Da SportHomeScreen: `navigation.navigate('History',
  { openSessionId: last.session.id })`.

Commit: `feat(sport): SportHistoryScreen + SessionDetailModal con riepilogo set`

────────────────────────────────────────────────────────────────
Vincoli operativi
────────────────────────────────────────────────────────────────

- Italiano per tutti i testi UI e label visibili. Inglese per
  nomi di variabili, funzioni, type, file.
- Solo i token/primitives di src/theme + componenti in
  src/components/: niente hex inline, niente librerie UI
  esterne.
- Alias `@/` per gli import.
- expo-sqlite async API; CREATE TABLE / ALTER idempotenti via
  try/catch nel pattern già presente.
- NIENTE nuove tabelle DB in questa fase (esercizi e sessioni
  sono già pronte). L'unica modifica DB consentita è l'INSERT
  OR IGNORE in seedExercises per il top-up della libreria.
- NON toccare: settings.json, hook git, CI/CD, package.json.
- NON modificare gli altri schermi diet / TimerScreen /
  WorkoutsScreen / ActiveSessionScreen / WorkoutDetailModal
  (a parte CalorieRing per la prop unit, e SportTabParamList
  per il param History).
- NON aprire PR. Solo push del branch.
- Se trovi una decisione ambigua, fai una AskUserQuestion solo
  se è davvero bloccante. Altrimenti decidi col default più
  semplice e annota nel body del commit.

────────────────────────────────────────────────────────────────
Verifica finale (smoke test, prima del push)
────────────────────────────────────────────────────────────────

1. `npm run typecheck` pulito.
2. App in modalità sport. Tab "Esercizi" → vedi ~40 voci nella
   lista, search funziona, filtri muscleGroup/level/equipment
   funzionano. Tap su un esercizio → modal con guida step-by-step.
3. Completa una sessione di allenamento (anche brevissima:
   parti, fai 2 set, termina). Torna in Home sport: vedi la
   card "Settimana" col ring mostrare 1 giorno / 4 target,
   minuti e calorie aggiornati. Vedi card "Ultimo allenamento"
   col nome scheda.
4. Tap "Ultimo allenamento" → atterri su Storico col modal di
   dettaglio già aperto, vedi i 2 set registrati.
5. In Home, tap "Cambia scheda" → bottom sheet con elenco,
   selezioni un'altra → la card "Allenamento di oggi" si
   aggiorna.
6. Avvia una sessione, lasciala attiva, torna alla Home: la
   card "Allenamento di oggi" mostra "Sessione in corso ·
   {nome}" con pulsante "Riprendi" → riapre la
   ActiveSessionScreen.
7. Storico: SegmentedControl 7gg/30gg/Tutto cambia il count e
   la lista. Empty state se nessuna sessione nel periodo.

Procedi.
```

---

## Note operative per chi avvia la sessione

- **Verifica preliminare**: `main` aggiornato con Phase 3
  (PR #54). Verifica con
  `git log --oneline | grep "feat(sport)" | head -3`. Devi
  vedere `TimerScreen reale`, `banner sticky + wiring`,
  `ActiveSessionScreen + RestTimer`.
- **node_modules**: `npm ci` come fallback.
- **Tempi attesi**: 3 commit, ognuno M effort. Stima ~3-4h
  totali. Lo step più tedioso è 4A (espansione seed di 30
  esercizi con descrizione + guideSteps).
- **Testing manuale**: serve almeno una sessione di
  allenamento completata per popolare la dashboard e lo
  storico. Senza device/emulatore, lo smoke test è solo
  `typecheck` + ispezione codice.

## Cosa NON includere nel prompt (volutamente fuori scope di Fase 4)

- Bounce/callout discoverability (Fase 5).
- Splash di transizione (Fase 5).
- Onboarding sport per utenti nuovi (Fase 5).
- Settings sport più ricche (Fase 5: weeklyTarget configurabile,
  preferenze suoni/notifiche). Per ora weeklyTarget = 4
  hardcoded.
- Video URL veri sugli esercizi (TODO futuro: integrazione
  database esterno o link YouTube curati).
- Filtri avanzati (combinazioni AND tra muscleGroup ed
  equipment), preferiti esercizi (TODO futuro).
- Modifica libreria esercizi (creare/eliminare custom): la
  libreria resta read-only utente in questa fase.
- Spotify (out of scope).
- Modifiche a `app.json`, `package.json`, `eas.json`,
  `setup.bat`.
- Aggiunta di librerie nuove (date-fns, react-native-picker,
  ecc.).
- Apertura di PR / merge / delete branch.
