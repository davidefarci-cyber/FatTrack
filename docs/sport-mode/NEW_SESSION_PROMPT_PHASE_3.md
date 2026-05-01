# Prompt per nuova sessione — Sport Mode Fase 3 (Sessione live + timer)

> **Pre-requisiti**: Fase 2 mergeata su `main` (PR #53).
> Branch atteso per la Fase 3: `claude/sport-mode-session`.
> Riferimento piano completo: `docs/sport-mode/PLAN.md` §3.

Fase più grossa del progetto: 5 commit, ~4-6h. Coinvolge state
management persistente, background/foreground via `AppState`,
Modal RN full-screen + banner sticky. Leggi tutto prima di
iniziare.

---

## Prompt da incollare

```
Sei in /home/user/FatTrack su branch main aggiornato.

Implementa la FASE 3 della modalità Sport: sessione live di
allenamento. L'utente parte da una scheda (WorkoutDetailModal),
preme "Inizia allenamento", si apre una schermata full-screen
con timer e tracking set-per-set; lo stato sopravvive a
background/foreground (AppState) e a kill+restart (DB
persistente). Quando l'utente naviga in altre tab, un banner
sticky sopra la BottomTabBar mostra la sessione in corso.
Aggiungi anche il tab "Timer" standalone (Tabata + intervalli +
libero), che riusa lo stesso timer engine.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md — vincoli stilistici, design system non
   negoziabile, convenzioni DB e codice.
2. docs/sport-mode/PLAN.md §3 — descrizione di alto livello
   della fase (decisioni architetturali, scope, file path).
3. src/components/sport/WorkoutDetailModal.tsx — il bottone
   "Inizia allenamento" è alla linea 145 disabilitato; lo
   abiliterai in step 3D wirando una nuova prop onStart.
4. src/database/db.ts — vedi pattern delle migrations
   idempotenti (ALTER nel try/catch, CREATE IF NOT EXISTS,
   INSERT OR IGNORE per i singleton).
5. App.tsx — qui montano i provider; aggiungerai
   ActiveSessionProvider tra ToastProvider e RootNavigator.

API e file disponibili da fasi precedenti (riusa, NON ricreare):

- DB: workoutsDB.getWorkoutById, exercisesDB.getExercisesByIds.
  Tipi: Workout, WorkoutExercise, Exercise da @/database.
- Theme: useAppTheme() → { mode, accent, accentDark, accentSoft,
  ring, bgTint }. sportColors, sportPalette, APP_NAME_SPORT da
  @/theme.
- Hook modalità: useAppSettings da @/hooks/useAppSettings.
- Profile: useProfile da @/hooks/useProfile (per peso utente,
  necessario al calcolo calorie).
- Primitives: BottomSheet, Card, Button, Input, ScreenHeader,
  Toast (useToast), SegmentedControl, Icon. Niente lib UI
  esterne.
- Icone disponibili (vedi src/components/Icon.tsx:5):
  timer, dumbbell, list-checks, play, pause, bolt, flame, plus,
  check, close, chevron-*, ecc. Se ti servono icone NUOVE
  (es. forward, skip, x-circle) aggiungile come gli altri SVG
  inline e aggiorna il type IconName.

Poi:

- Crea il branch claude/sport-mode-session da main.
- Esegui i 5 step descritti sotto, una alla volta, con un
  commit separato per ognuno.
- Dopo ogni commit: `npm run typecheck` deve passare. Se la
  prima volta node_modules manca, fai `npm ci`.
- I messaggi di commit seguono il pattern `feat(sport): …` +
  body descrittivo + trailer
  https://claude.ai/code/session_<id>.
- Niente PR: alla fine fai solo `git push -u origin
  claude/sport-mode-session`. Sarò io a decidere il merge.

────────────────────────────────────────────────────────────────
STEP 3A — Schema DB sessioni + sessionsDB layer
────────────────────────────────────────────────────────────────

In src/database/db.ts (dentro `db.execAsync` di `migrate`,
dopo le tabelle workout) aggiungi tre tabelle:

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER REFERENCES workouts(id) ON DELETE SET NULL,
  workout_name TEXT NOT NULL,
  category TEXT NOT NULL,
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_sec INTEGER,
  calories_estimated INTEGER,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_sessions_started
  ON sessions(started_at DESC);

CREATE TABLE IF NOT EXISTS session_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  reps_done INTEGER,
  weight_kg REAL,
  duration_sec INTEGER,
  rpe INTEGER,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_session_sets_session
  ON session_sets(session_id);

CREATE TABLE IF NOT EXISTS active_session (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  current_exercise_index INTEGER NOT NULL DEFAULT 0,
  current_set_number INTEGER NOT NULL DEFAULT 1,
  rest_ends_at TEXT,
  paused_at TEXT,
  paused_total_sec INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Note di design:
- `workout_name` e `category` sono SNAPSHOT a inizio sessione:
  se l'utente in seguito rinomina/cancella la scheda, lo
  storico resta leggibile.
- `ended_at IS NULL` distingue le sessioni attive da quelle
  chiuse.
- `active_session` è un SINGLETON (id=1, max 1 riga). Una sola
  sessione attiva alla volta. NON inserire un INSERT OR IGNORE
  con id=1: la riga esiste solo durante una sessione.
- `paused_at` + `paused_total_sec` per gestire il tempo in
  pausa: a `pause` setti `paused_at = now()`; a `resume`
  fai `paused_total_sec += now() - paused_at` poi
  `paused_at = NULL`. Tempo trascorso = `(now - started_at) -
  paused_total_sec - (paused_at ? now - paused_at : 0)`.

Aggiungi anche le DROP corrispondenti dentro `resetDatabase()`
(prima di sessions per il vincolo FK, anche se ON DELETE CASCADE
copre, esplicito è meglio):

```ts
DROP TABLE IF EXISTS active_session;
DROP TABLE IF EXISTS session_sets;
DROP TABLE IF EXISTS sessions;
```

Crea **src/database/sessionsDB.ts**:

```ts
export type Session = {
  id: number;
  workoutId: number | null;
  workoutName: string;
  category: string;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  caloriesEstimated: number | null;
  notes: string | null;
};

export type SessionSet = {
  id: number;
  sessionId: number;
  exerciseId: number;
  position: number;
  setNumber: number;
  repsDone: number | null;
  weightKg: number | null;
  durationSec: number | null;
  rpe: number | null;
  completedAt: string;
};

export type ActiveSessionRow = {
  sessionId: number;
  currentExerciseIndex: number;
  currentSetNumber: number;
  restEndsAt: string | null;
  pausedAt: string | null;
  pausedTotalSec: number;
  updatedAt: string;
};

export type NewSessionSet = Omit<
  SessionSet,
  'id' | 'sessionId' | 'completedAt'
>;

export async function startSession(
  workout: { id: number; name: string; category: string },
): Promise<Session>;
// Crea riga in sessions (ended_at NULL) + active_session (id=1).
// Se già esiste un active_session: throw "Sessione già attiva".

export async function getActiveSession(): Promise<{
  session: Session;
  active: ActiveSessionRow;
} | null>;
// Join tra sessions e active_session. NULL se nessuna attiva.

export async function recordSet(
  sessionId: number,
  set: NewSessionSet,
): Promise<SessionSet>;

export async function advanceActive(patch: {
  currentExerciseIndex?: number;
  currentSetNumber?: number;
  restEndsAt?: string | null;
  pausedAt?: string | null;
  pausedTotalSec?: number;
}): Promise<ActiveSessionRow>;
// UPDATE active_session WHERE id = 1.

export async function endSession(
  sessionId: number,
  data: {
    durationSec: number;
    caloriesEstimated: number;
    notes: string | null;
  },
): Promise<Session>;
// UPDATE sessions SET ended_at, duration_sec, calories_estimated, notes
// + DELETE FROM active_session WHERE id = 1 (in transazione).

export async function cancelSession(sessionId: number): Promise<void>;
// DELETE FROM sessions WHERE id = ? (cascade su session_sets +
// active_session).

export async function getAllSessions(): Promise<Session[]>;
// Solo chiuse (ended_at NOT NULL), ORDER BY started_at DESC.

export async function getSessionById(id: number): Promise<Session | null>;

export async function getSessionSets(sessionId: number): Promise<SessionSet[]>;
// ORDER BY position ASC, set_number ASC.
```

Re-export in src/database/index.ts:
```ts
export * as sessionsDB from './sessionsDB';
export type { Session, SessionSet, ActiveSessionRow, NewSessionSet }
  from './sessionsDB';
```

Commit: `feat(sport): tabelle sessions/session_sets/active_session + sessionsDB layer`

────────────────────────────────────────────────────────────────
STEP 3B — ActiveSessionProvider + util sportCalories
────────────────────────────────────────────────────────────────

Crea **src/utils/sportCalories.ts**:

```ts
// Calcolo calorie bruciate dalle sessioni: kcal = MET × peso × ore.
// Source: Compendium of Physical Activities (~5 MET squat,
// ~8 MET burpees, ecc., già seedati in exercises.met).
//
// Per una sessione mixed, si itera per esercizio e si somma il
// contributo di OGNI set:
//   contrib_set = met × peso_kg × (durata_set_sec / 3600)
// Per gli esercizi senza durata esplicita (sets×reps), stimiamo
// 30s per set (ragionevole per a corpo libero); il riposo NON
// conta come energia spesa.
// Esercizi con MET NULL: skip (contributo 0). Niente fallback
// invasivi tipo MET medio.

export function estimateSetCalories(input: {
  met: number | null;
  weightKg: number;
  durationSec: number;
}): number;

export function estimateSessionCalories(input: {
  weightKg: number;
  sets: Array<{ met: number | null; durationSec: number | null }>;
}): number;
// Round all'intero, kcal mai negativo.
```

Crea **src/contexts/ActiveSessionContext.tsx**:

```ts
type ActiveSessionState = {
  session: Session;
  workout: Workout;
  exerciseMap: Map<number, Exercise>;  // lookup per id → nome+MET
  currentExerciseIndex: number;
  currentSetNumber: number;
  restEndsAt: number | null;            // timestamp ms
  isPaused: boolean;
  pausedTotalSec: number;
};

type ContextValue = {
  state: ActiveSessionState | null;
  loading: boolean;
  start: (workoutId: number) => Promise<void>;
  completeSet: (data: {
    repsDone?: number;
    weightKg?: number;
    durationSec?: number;
    rpe?: number;
  }) => Promise<void>;
  skipSet: () => Promise<void>;          // marca completato senza dati
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  endSession: (notes?: string) => Promise<{ session: Session; calories: number }>;
  cancelSession: () => Promise<void>;
};

export const ActiveSessionContext = createContext<ContextValue>(/* default no-op */);

export function ActiveSessionProvider({ children }: { children: ReactNode });
// Al mount: chiama getActiveSession() e ricostruisce lo state.
// Sottoscrive AppState.addEventListener('change'): al ritorno in
// foreground, ricalcola elapsedSec da started_at salvato (NON
// usa setInterval per il timer in background — lo ferma e lo
// riavvia al foreground).
//
// Quando completeSet → record_set → advance_active → set
// restEndsAt = now + restSec. Se è l'ultimo set → resta in
// attesa di endSession().
//
// IMPORTANTE: la logica di "qual è il prossimo set/esercizio"
// vive nel provider (state machine semplice, non in DB).

export function useActiveSession(): ContextValue;
```

Logica di avanzamento dentro il provider:
1. `completeSet(data)`:
   - INSERT in session_sets via `recordSet`.
   - Determina prossimo set: se `currentSetNumber < exercises[currentExerciseIndex].sets`,
     incrementa setNumber. Altrimenti reset a 1 e
     incrementa currentExerciseIndex.
   - Se currentExerciseIndex >= exercises.length → ultimo
     completato, niente recupero, restEndsAt resta null,
     UI mostra "Termina sessione".
   - Altrimenti setta `restEndsAt = now + restSec` (se
     prescrizione lo prevede; altrimenti null).
   - `advanceActive({ currentExerciseIndex, currentSetNumber, restEndsAt })`.
2. `skipSet`: come completeSet ma senza INSERT in
   session_sets.
3. `pause`/`resume`: aggiorna paused_at/paused_total_sec via
   advanceActive. Mentre in pausa, lo state.isPaused è true,
   il timer UI freeza.
4. `endSession(notes)`:
   - elapsedSec calcolato da started_at e paused_total_sec.
   - calories = estimateSessionCalories con i set INSERTati
     fin qui (recupera via getSessionSets).
   - `endSession(sessionId, { durationSec, calories, notes })`.
   - Reset state a null.
   - Ritorna { session aggiornata, calories } per l'UI di
     riepilogo.

Monta il provider in **App.tsx** tra `<ToastProvider>` e
`<RootNavigator />`:

```tsx
<ToastProvider>
  <ActiveSessionProvider>
    <StatusBar style="dark" />
    <RootNavigator />
  </ActiveSessionProvider>
</ToastProvider>
```

(Il provider è "dentro" ToastProvider perché potrebbe usare
useToast per errori; e fuori da RootNavigator perché lo
useActiveSession deve essere disponibile a tutto il
NavigationContainer.)

Commit: `feat(sport): ActiveSessionProvider con persistenza DB e AppState`

────────────────────────────────────────────────────────────────
STEP 3C — ActiveSessionScreen + RestTimer
────────────────────────────────────────────────────────────────

Crea **src/components/sport/RestTimer.tsx**:

```ts
type Props = {
  endsAt: number;            // timestamp ms
  paused?: boolean;
  onComplete?: () => void;   // chiamato quando rimaining <= 0
};
```

Layout: countdown grosso al centro (`typography.display` o un
size custom 56-72px), label "Recupero" sopra, accent color del
theme. Sotto: barra di progresso lineare (View + width animato).
Setinterval 200ms per aggiornare; freeza se `paused`. NON
usare Animated complex; è OK un re-render ogni 200ms.

Crea **src/screens/sport/ActiveSessionScreen.tsx**:

NON è un Tab.Screen. È un componente Modal RN full-screen
montato in src/navigation/SportTabNavigator.tsx come SIBLING
del Tab.Navigator (vedi step 3D per il wiring).

Props:
```ts
type Props = { visible: boolean; onClose: () => void };
```

Layout (dall'alto):
- Header con `<ScreenHeader title="{workoutName}"
  subtitle="{categoria}" />` + pulsante "Termina" in alto a
  destra (Pressable con icona close, colore textSec).
- Body scrollabile:
  - Card "Esercizio corrente" con:
    - Numero "Esercizio {idx+1} / {total}"
    - Nome esercizio (typography.h1)
    - Prescrizione: "Set {currentSetNumber} / {totalSets}" o
      "{durationSec}s"
    - Note dell'esercizio se presenti
  - Inputs per il set corrente:
    - Se prescrizione sets+reps: input "Reps fatte" (default:
      reps prescritte), input "Peso (kg)" opzionale,
      SegmentedControl RPE 1-10 opzionale.
    - Se prescrizione duration_sec: input "Durata (sec)"
      (default: duration_sec prescritto), niente reps/peso.
  - Pulsanti azione:
    - "Set completato" (primary, accent del theme) → completeSet
    - "Salta" (secondary) → skipSet
    - "Pausa" / "Riprendi" (ghost) → pause/resume
- Se `state.restEndsAt` è valorizzato:
  - Mostra `<RestTimer>` SOPRA gli inputs (sostituendoli
    finché il timer non finisce).
  - "Salta recupero" pulsante per sbloccare gli inputs subito.

Quando l'ultimo set dell'ultimo esercizio è completato:
- Mostra schermata di RIEPILOGO (stesso Modal, body diverso):
  - "Sessione completata"
  - Durata totale formattata (mm:ss)
  - N esercizi · N set
  - Calorie stimate
  - Input "Note" opzionale (multiline)
  - Pulsante "Salva e chiudi" → endSession + onClose
  - Pulsante "Annulla sessione" → Alert "Cancellare la
    sessione? I set registrati andranno persi" →
    cancelSession + onClose

Pulsante "Termina" in alto: Alert "Terminare allenamento?
Verrà salvato con i set fatti finora" → vai al riepilogo.

Stili: usa SOLO i token. Colore primario = accent del theme
(arancio). State vuoto/loading: mostra "Caricamento sessione…".

Commit: `feat(sport): ActiveSessionScreen + RestTimer`

────────────────────────────────────────────────────────────────
STEP 3D — Banner persistente + wiring "Inizia allenamento"
────────────────────────────────────────────────────────────────

Crea **src/components/sport/ActiveSessionBanner.tsx**:

Layout: barra orizzontale flat, padding sm, sticky sopra la
BottomTabBar (NON sopra la SafeArea). Fondo `accentSoft`,
testo: "🏋️ Sessione: {workoutName} · {elapsed}" + pulsante
"Riapri" → apre la ActiveSessionScreen.
Mostra il timer aggiornato live (re-render ogni 1s).

Modifica **src/navigation/SportTabNavigator.tsx**:
- Aggiungi state: `const [sessionVisible, setSessionVisible] =
  useState(false);`
- Importa `useActiveSession` e leggilo:
  `const { state } = useActiveSession();`
- Wrappa il Tab.Navigator in un `<View style={{ flex: 1 }}>`:
  ```tsx
  <View style={{ flex: 1 }}>
    <Tab.Navigator …>…</Tab.Navigator>
    {state ? (
      <ActiveSessionBanner
        workoutName={state.workout.name}
        elapsedSec={…}
        onPress={() => setSessionVisible(true)}
      />
    ) : null}
    <ActiveSessionScreen
      visible={sessionVisible}
      onClose={() => setSessionVisible(false)}
    />
  </View>
  ```
- Il banner si posiziona via `position: 'absolute', bottom:
  <altezza tab bar + insets.bottom>` per stare sopra la
  BottomTabBar. Layout esatto: provalo a mano sull'emulatore,
  meglio una piccola ombra (shadows.sm) sopra la bar per
  staccarlo.

Modifica **src/components/sport/WorkoutDetailModal.tsx**:
- Aggiungi prop `onStart?: () => void`.
- Sostituisci `<Button label="Inizia allenamento" disabled />`
  alla linea 145 con:
  ```tsx
  <Button
    label="Inizia allenamento"
    onPress={onStart}
    disabled={!onStart}
  />
  ```
- Rimuovi la caption "Disponibile a breve." (le righe 146-148).

Modifica **src/screens/sport/WorkoutsScreen.tsx**:
- Importa `useActiveSession`.
- Crea handler `handleStart(workout)`:
  ```ts
  async function handleStart(workout: Workout) {
    if (state) {
      Alert.alert(
        'Sessione già attiva',
        'Termina la sessione corrente prima di iniziarne una nuova.',
      );
      return;
    }
    try {
      await start(workout.id);
      setOpenDetail(null);  // chiude il dettaglio
      // Apre la ActiveSessionScreen tramite il SportTabNavigator —
      // potresti dover sollevare uno stato condiviso. SOLUZIONE
      // SEMPLICE: aggiungi nel context una flag `requestOpen`
      // che SportTabNavigator osserva e apre il modal.
      // ALTERNATIVA: imperativo via navigationRef.
      // Decidi tu, ma l'apertura DEVE avvenire automaticamente
      // quando una sessione parte.
    } catch (err) {
      toast.show(err instanceof Error ? err.message : 'Errore avvio');
    }
  }
  ```
- Passa `onStart={() => handleStart(openDetail)}` al
  `WorkoutDetailModal`.

Per l'auto-apertura del Modal alla partenza di una sessione: la
strada più pulita è aggiungere nel context un flag
`pendingOpen: boolean` che `start()` setta a `true`, e che
SportTabNavigator legge in un useEffect per chiamare
`setSessionVisible(true)`. Dopo l'apertura, il provider azzera
il flag.

Commit: `feat(sport): banner sticky + wiring start workout`

────────────────────────────────────────────────────────────────
STEP 3E — TimerScreen reale (Tabata + intervalli + libero)
────────────────────────────────────────────────────────────────

Sostituisci il body di **src/screens/sport/TimerScreen.tsx**
mantenendo `export default function TimerScreen`.

Layout:
- ScreenHeader "Timer" subtitle "Tabata, intervalli, libero".
- SegmentedControl in alto: [Tabata · Intervalli · Libero].
- Body cambia in base alla scelta:
  - **Tabata**: preset 20s lavoro / 10s recupero / 8 round.
    Mostra preview "8 × (20s lavoro + 10s recupero) = 4 min".
    Input modificabili (numero round).
  - **Intervalli**: tre input numerici (lavoro sec, recupero
    sec, round). Stesso preview totale.
  - **Libero**: niente preset, count-up dal momento dello
    "Start".
- Pulsante grosso "Avvia" al centro (accent del theme) →
  passa a una vista timer:
  - Display grosso del tempo rimanente / trascorso.
  - Label dello step corrente: "Lavoro" / "Recupero" / "Round
    {n}/{total}".
  - Pulsanti "Pausa", "Reset", "Termina".
  - Quando finisce (Tabata/Intervalli): Toast "Allenamento
    completato".

NON deve interferire con la sessione live (sono indipendenti).
Il Timer standalone NON usa `active_session` né
`ActiveSessionContext`: vive solo nello state della schermata.

Riusa la logica di countdown di RestTimer se conviene, ma è
ammissibile duplicarla se rendere riusabile costa troppo.
Pragmatismo prima di DRY.

Commit: `feat(sport): TimerScreen reale (Tabata + intervalli + libero)`

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
  try/catch nel pattern già presente in src/database/db.ts.
- NIENTE notifiche locali / suoni / vibrazioni in questa fase
  — il piano le rimanda. NON aggiungere expo-notifications né
  expo-haptics se non sono già in package.json (controllalo).
- NON toccare: settings.json, hook git, CI/CD, package.json.
- NON modificare gli altri schermi diet/sport (a parte
  WorkoutDetailModal/WorkoutsScreen/SportTabNavigator/TimerScreen
  che sono il target esplicito).
- NON aprire PR. Solo push del branch.
- Se trovi una decisione ambigua, fai una AskUserQuestion solo
  se è davvero bloccante. Altrimenti decidi col default più
  semplice e annota nel body del commit.

────────────────────────────────────────────────────────────────
Verifica finale (smoke test, prima del push)
────────────────────────────────────────────────────────────────

1. `npm run typecheck` pulito.
2. App in modalità sport. Tab "Schede" → tap "Apri" su un
   preset → Modal dettaglio → "Inizia allenamento" è ABILITATO
   → tap → Modal dettaglio si chiude, si apre
   ActiveSessionScreen full-screen con il primo esercizio
   visibile.
3. Compila reps + peso per il set 1 → "Set completato" → parte
   il timer di recupero (RestTimer). Aspetta che finisca →
   torna agli inputs per il set 2.
4. Premi "Pausa" durante il recupero → il timer freeza.
   "Riprendi" → riprende. Il calcolo del tempo trascorso a
   fine sessione è coerente (NON include il tempo in pausa).
5. Tap "Termina" in alto → Alert → arrivi al riepilogo:
   durata, calorie, input note, "Salva e chiudi". Salva → la
   sessione è in storico (verifica via SQL: `ended_at NOT
   NULL`, `calories_estimated > 0`).
6. Avvia di nuovo una sessione, esci dal Modal (dovrebbe
   restare attivo). Tab "Storico" → vedi il banner sticky in
   basso. Tap "Riapri" → torna alla session screen al punto
   esatto.
7. Kill l'app + rilancia: la sessione attiva deve essere
   ancora viva, banner visibile, ActiveSessionScreen
   ricostruita.
8. Tab "Timer" → Tabata default 8×(20+10) → Avvia → countdown
   parte. Pausa → freeza. Reset → torna a Tabata config.

Procedi.
```

---

## Note operative per chi avvia la sessione

- **Verifica preliminare**: `main` aggiornato deve contenere
  Phase 2 (PR #53 mergeata) — confermalo con
  `git log --oneline | grep "feat(sport)" | head -3`. Devi
  vedere `WorkoutsScreen con editor`, `exercisesDB + workoutsDB`,
  `tabelle exercises…`.
- **node_modules**: `npm ci` come fallback.
- **Tempi attesi**: 5 commit, ognuno M-L effort. Stima
  ~5-7h totali. Lo step 3B (ActiveSessionProvider) è il più
  complesso (state machine + AppState + persistenza). Lo step
  3C (ActiveSessionScreen) è il più voluminoso (~400-500 righe).
- **Testing manuale**: critico. Senza device/emulatore non si
  può verificare il flusso completo (background/foreground,
  banner sticky, kill+restart). Su agente cloud accettare
  smoke test = solo `typecheck` + ispezione codice.

## Cosa NON includere nel prompt (volutamente fuori scope di Fase 3)

- Libreria esercizi completa con filtri e dettaglio (Fase 4).
- SportHomeScreen dashboard con scheda di oggi/settimana
  (Fase 4).
- SportHistoryScreen con chart e elenco sessioni dettagliato
  (Fase 4 — nota: Fase 3 SCRIVE la storia ma non la legge in UI
  oltre al banner).
- Bounce/callout discoverability (Fase 5).
- Splash di transizione (Fase 5).
- Notifiche locali per fine recupero (TODO futuro).
- Suoni / vibrazioni / haptic feedback (TODO futuro).
- Spotify (out of scope).
- Modifiche a `app.json`, `package.json`, `eas.json`,
  `setup.bat`.
- Aggiunta di librerie nuove (expo-haptics,
  expo-notifications, expo-av, …).
- Apertura di PR / merge / delete branch.
