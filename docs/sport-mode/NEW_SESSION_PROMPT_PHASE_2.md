# Prompt per nuova sessione — Sport Mode Fase 2 (Schede allenamento)

> **Pre-requisiti**: Fase 1 mergeata su `main` (PR #51).
> Branch atteso per la Fase 2: `claude/sport-mode-workouts`.
> Riferimento piano completo: `docs/sport-mode/PLAN.md` §2.

---

## Prompt da incollare

```
Sei in /home/user/FatTrack su branch main aggiornato.

Implementa la FASE 2 della modalità Sport: schede allenamento. Crea
le tabelle DB (workouts, workout_exercises, exercises), seedda 3
preset (Full Body Casa, Push Pull Legs Day 1, Mobilità mattina) +
~10 esercizi base che li coprano, e implementa la WorkoutsScreen
con editor di schede. La libreria esercizi completa (~40) e l'avvio
sessione arrivano nelle fasi successive: NON implementarli ora.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md — vincoli stilistici, design system non negoziabile,
   convenzioni DB e codice. Non sono opzionali.
2. docs/sport-mode/PLAN.md §2 — descrizione di alto livello della
   fase (decisioni di schema, scope, file path).
3. docs/TODO.md — solo per riferimento al backlog globale.

API e file disponibili da Fase 1 (NON ricrearli, riusali):

- Hook modalità: `useAppSettings` da @/hooks/useAppSettings.
- Hook tema: `useAppTheme` da @/theme/ThemeContext (ritorna
  `{ mode, accent, accentDark, accentSoft, ring, bgTint }`).
- Palette sport: `sportColors`, `sportPalette` (forza/cardio/
  mobilita/recupero, ognuno con `{ color, bg, label }`),
  `APP_NAME_SPORT` da @/theme (re-export da
  @/theme/sportMode).
- Tipi: `AppMode`, `AppSettings` da @/database. `SportTabParamList`
  da @/types.
- Schermata da riempire: src/screens/sport/WorkoutsScreen.tsx
  (placeholder Fase 1, sostituisci tutto il body mantenendo
  l'export default).
- Pattern editor di riferimento: FavoriteEditorModal in
  src/screens/FavoritesScreen.tsx:203 (struttura modal + lista
  items selezionabili). Usa lo stesso approccio: `BottomSheet`
  per il modal di edit, lista interna scrollabile, bottone
  "Aggiungi esercizio" che apre un sub-picker dalla libreria
  esistente in DB.
- Pattern seed: src/database/seedFoods.ts (DEFAULT_ITALIAN_FOODS +
  seedFoodsIfEmpty + applySeedServings).

Poi:

- Crea il branch claude/sport-mode-workouts da main.
- Esegui i 3 step descritti sotto, una alla volta, con un commit
  separato per ognuno.
- Dopo ogni commit: `npm run typecheck` deve passare. Se la prima
  volta node_modules manca, fai `npm ci`.
- I messaggi di commit seguono il pattern già usato sul repo:
  `feat(sport): …` + body descrittivo + trailer
  https://claude.ai/code/session_<id>.
- Niente PR: alla fine fai solo `git push -u origin
  claude/sport-mode-workouts`. Sarò io a decidere quando aprire
  la PR e mergiare.

────────────────────────────────────────────────────────────────
STEP 2A — Schema DB e migrations
────────────────────────────────────────────────────────────────

In src/database/db.ts (dentro il blocco `db.execAsync` della
funzione `migrate`, dopo `app_settings`) aggiungi tre CREATE TABLE
idempotenti:

```sql
CREATE TABLE IF NOT EXISTS exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  muscle_group TEXT NOT NULL,
  equipment TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('principiante','intermedio','avanzato')),
  description TEXT,
  guide_steps TEXT,
  video_url TEXT,
  met REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(muscle_group);

CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('forza','cardio','mobilita','misto')),
  is_preset INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  estimated_duration_min INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS workout_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL,
  sets INTEGER,
  reps INTEGER,
  duration_sec INTEGER,
  rest_sec INTEGER,
  weight_kg REAL,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout
  ON workout_exercises(workout_id);
```

Aggiungi anche le DROP corrispondenti dentro `resetDatabase()`
per simmetria con le altre tabelle.

Note di design dello schema:
- `guide_steps`: JSON array serializzato (parse con try/catch
  come `favoritesDB.items`). NULL se non disponibile.
- `met`: valore Compendium of Physical Activities (es. squat ~5,
  jumping jacks ~8). Userà il calcolo calorie in Fase 3. NULL
  consentito (in Fase 2 alcuni esercizi non lo avranno).
- `workout_exercises.sets+reps` XOR `duration_sec`: vincolo
  applicativo, NON a livello SQL (per non bloccare schede
  ibride forza+cardio in futuro). Vedi step 2C per la helper
  di validazione.
- `is_preset=1` → la scheda è un preset di sistema: non
  cancellabile, ma duplicabile (vedi step 2C UI).

Commit: `feat(sport): tabelle exercises, workouts, workout_exercises`

────────────────────────────────────────────────────────────────
STEP 2B — Database layer + seed
────────────────────────────────────────────────────────────────

Crea i seguenti file:

1. **src/database/exercisesDB.ts** — API minimale (la libreria
   completa con search/filter arriva in Fase 4):
   ```ts
   export type ExerciseLevel = 'principiante' | 'intermedio' | 'avanzato';
   export type Exercise = {
     id: number; name: string; muscleGroup: string;
     equipment: string; level: ExerciseLevel;
     description: string | null; guideSteps: string[] | null;
     videoUrl: string | null; met: number | null;
   };
   export async function getAllExercises(): Promise<Exercise[]>;
   export async function getExerciseById(id: number): Promise<Exercise | null>;
   export async function getExercisesByIds(ids: number[]): Promise<Exercise[]>;
   ```
   `guideSteps` viene parsato dal TEXT JSON con try/catch (se
   parse fallisce → null, NON crash).

2. **src/database/workoutsDB.ts** — CRUD completo:
   ```ts
   export type WorkoutCategory = 'forza' | 'cardio' | 'mobilita' | 'misto';
   export type WorkoutExercise = {
     id: number; workoutId: number; exerciseId: number;
     position: number;
     sets: number | null; reps: number | null;
     durationSec: number | null; restSec: number | null;
     weightKg: number | null; notes: string | null;
   };
   export type Workout = {
     id: number; name: string; category: WorkoutCategory;
     isPreset: boolean; notes: string | null;
     estimatedDurationMin: number | null;
     createdAt: string; updatedAt: string;
     exercises: WorkoutExercise[];
   };
   export type NewWorkout = Omit<Workout, 'id' | 'createdAt' | 'updatedAt' | 'isPreset' | 'exercises'> & {
     exercises: Array<Omit<WorkoutExercise, 'id' | 'workoutId'>>;
   };
   export async function getAllWorkouts(): Promise<Workout[]>;
   export async function getWorkoutById(id: number): Promise<Workout | null>;
   export async function createWorkout(input: NewWorkout): Promise<Workout>;
   export async function updateWorkout(id: number, patch: NewWorkout): Promise<Workout>;
   export async function deleteWorkout(id: number): Promise<void>;  // rifiuta is_preset=1
   export async function duplicateWorkout(id: number, newName: string): Promise<Workout>;
   ```
   - `createWorkout`/`updateWorkout` aggiornano workout +
     workout_exercises in TRANSAZIONE (`db.withTransactionAsync`).
     Su update: DELETE + INSERT delle righe figlie (più
     semplice della diff manuale).
   - `deleteWorkout` su `is_preset=1`: throw
     `Error('I preset non possono essere eliminati')`.
   - `duplicateWorkout`: crea un nuovo workout con
     `is_preset=0`, copia tutti i workout_exercises. `newName`
     opzionale, default `<originale> (copia)`.
   - Ordinamento `getAllWorkouts`: preset prima, poi user
     workout per `updated_at DESC`.

3. **src/database/seedExercises.ts** — pattern seedFoods,
   inserisce ~10 esercizi solo se la tabella è vuota. NON usare
   `INSERT OR IGNORE` per nome: usa il check `count===0` come in
   `seedFoodsIfEmpty`. Ogni esercizio ha:
   ```ts
   const SEED_EXERCISES = [
     { name: 'Squat', muscleGroup: 'Gambe', equipment: 'Corpo libero',
       level: 'principiante', met: 5,
       description: 'Squat a corpo libero per quadricipiti, glutei.',
       guideSteps: ['Piedi alla larghezza delle spalle','...'],
       videoUrl: null },
     // ... (vedi LISTA SEED in fondo a questo prompt)
   ];
   export async function seedExercisesIfEmpty(db): Promise<void>;
   ```
   Chiamala da `getDatabase()` in db.ts dopo `seedFoodsIfEmpty`.

4. **src/database/seedWorkouts.ts** — analogo, inserisce 3 preset
   solo se nessuna riga `is_preset=1` esiste. I preset
   referenziano gli esercizi seedati via `name` (lookup all'avvio
   per ottenere l'id). Lista in fondo al prompt.
   Chiamala da `getDatabase()` dopo `seedExercisesIfEmpty`.

5. **src/database/index.ts** — re-export:
   ```ts
   export * as exercisesDB from './exercisesDB';
   export * as workoutsDB from './workoutsDB';
   export type { Exercise, ExerciseLevel } from './exercisesDB';
   export type { Workout, WorkoutCategory, WorkoutExercise, NewWorkout } from './workoutsDB';
   export { seedExercisesIfEmpty } from './seedExercises';
   export { seedPresetWorkoutsIfEmpty } from './seedWorkouts';
   ```

LISTA SEED esercizi (10):
- Squat — Gambe / Corpo libero / principiante / met 5
- Affondi — Gambe / Corpo libero / principiante / met 5
- Push-up — Petto / Corpo libero / principiante / met 4
- Plank — Core / Corpo libero / principiante / met 3
- Crunch — Core / Corpo libero / principiante / met 3.5
- Burpees — Full body / Corpo libero / intermedio / met 8
- Mountain climber — Cardio / Corpo libero / intermedio / met 7
- Glute bridge — Glutei / Corpo libero / principiante / met 3
- Bird-dog — Core / Corpo libero / principiante / met 2.5
- Cat-cow — Mobilità / Corpo libero / principiante / met 2
Per ognuno descrizione 1 frase + guideSteps array di 3-4 step.

LISTA SEED preset (3):
1. **Full Body Casa** — categoria 'forza', durata 30 min:
   Squat 3×12 r=60s, Push-up 3×10 r=60s, Affondi 3×10/gamba r=60s,
   Plank 3×30s r=45s.
2. **Push Pull Legs — Day 1 (Push)** — categoria 'forza', 35 min:
   Push-up 4×12 r=75s, Plank 3×40s r=45s, Crunch 3×15 r=45s,
   Mountain climber 3×30s r=60s, Burpees 2×8 r=90s.
3. **Mobilità mattina** — categoria 'mobilita', 15 min:
   Cat-cow 2×60s r=15s, Bird-dog 2×10/lato r=20s,
   Glute bridge 2×12 r=30s, Plank 2×20s r=20s.
Note (`notes` su workouts): "Preset di sistema. Duplicalo per
modificarlo." Per tutti e tre.

Commit: `feat(sport): exercisesDB + workoutsDB + seed preset e libreria base`

────────────────────────────────────────────────────────────────
STEP 2C — UI WorkoutsScreen
────────────────────────────────────────────────────────────────

Sostituisci il body di **src/screens/sport/WorkoutsScreen.tsx**
(mantenendo `export default function WorkoutsScreen`).

Layout:
- `<ScreenHeader title="Schede" subtitle="Le tue routine + preset" />`
- `<ScrollView>` con lista di `<Card>`, una per scheda. Ordinamento
  da `getAllWorkouts()` (preset prima).
- Card della scheda mostra:
  - Riga 1: nome + badge categoria (usa `sportPalette[category]`
    per color/bg/label)
  - Riga 2: caption "{N} esercizi · {durata} min" (durata da
    `estimatedDurationMin`)
  - Note brevi se presenti (max 2 righe, ellipsis)
  - Bottoni inline: "Apri" (apre WorkoutDetailModal),
    "Modifica"/"Duplica" (preset → "Duplica"; user → "Modifica"),
    swipe-to-delete solo per non-preset
- FAB rialzato in basso destra "+" → crea nuova scheda vuota e
  apre l'editor (analogo al "+" in FavoritesScreen).

Componenti nuovi (creali in src/components/sport/):

1. **WorkoutDetailModal.tsx** — usa `BottomSheet`
   (`maxHeightPercent` default OK), mostra:
   - Header con nome + categoria (badge colore da sportPalette)
   - Lista esercizi numerata:
     `{position}. {exerciseName} — {sets}×{reps} (riposo {restSec}s)`
     o `{exerciseName} — {durationSec}s` per quelli a tempo.
   - Pulsante "Inizia allenamento" DISABILITATO con caption
     "Disponibile a breve". (Il flusso reale arriva in Fase 3.)
   - Pulsante "Modifica" (o "Duplica" se preset).

2. **WorkoutEditorModal.tsx** — `BottomSheet`. Form:
   - Input nome (richiesto, min 2 char).
   - SegmentedControl categoria (forza · cardio · mobilita · misto).
   - Input "Durata stimata (min)" — opzionale, numerico.
   - Lista esercizi del workout:
     - Per ognuno: nome (read-only, dal lookup esercizio),
       inputs sets/reps OPPURE durationSec (toggle), restSec.
     - Bottoni "↑"/"↓" per riordinare, "Elimina" per rimuovere.
   - Bottone "Aggiungi esercizio" → apre `ExercisePickerModal`
     (sub-modal) con lista da `exercisesDB.getAllExercises()`,
     filtro nome. Tap su un esercizio lo aggiunge in fondo alla
     lista del workout con campi vuoti (l'utente compila).
   - In fondo: "Salva" (chiama `createWorkout` o `updateWorkout`)
     e "Annulla" (chiude senza salvare).
   - Validazione client: scheda con almeno 1 esercizio, e ogni
     esercizio deve avere `sets+reps` OR `durationSec` (non
     entrambi vuoti). Mostra Toast con messaggio specifico.

3. **ExercisePickerModal.tsx** — `BottomSheet`. Lista esercizi
   filtrabile (Input search). Mostra nome + muscleGroup + level.
   Tap → callback `onPick(exerciseId)` e chiude.

Stili: usa SOLO i token (`colors`, `spacing`, `radii`, `shadows`,
`typography`, `sportPalette`). Niente hex inline. Tutti gli
accenti pulsanti primari usano `useAppTheme().accent`.

Stati di errore: try/catch su `createWorkout`/`updateWorkout`,
mostra Toast d'errore in italiano. Se `deleteWorkout` viene
chiamato su preset (non dovrebbe succedere via UI, swipe nascosto)
mostra Toast "I preset non possono essere eliminati".

Commit: `feat(sport): WorkoutsScreen con editor schede + modali detail/editor/picker`

────────────────────────────────────────────────────────────────
Vincoli operativi
────────────────────────────────────────────────────────────────

- Italiano per tutti i testi UI e label visibili. Inglese per
  nomi di variabili, funzioni, type, file.
- Solo i token/primitives di src/theme + componenti in
  src/components/: niente hex inline, niente librerie UI esterne.
- Alias `@/` per gli import.
- expo-sqlite async API; CREATE TABLE / ALTER idempotenti via
  try/catch nel pattern già presente in src/database/db.ts.
- NON toccare: settings.json, hook git, CI/CD, package.json (a
  meno che il piano non lo richieda esplicitamente — non lo
  richiede per Fase 2).
- NON modificare il theme system, le primitives esistenti, gli
  altri DB layer, gli altri schermi diet/sport (a parte
  WorkoutsScreen che è il target).
- NON aggiungere espressioni di "Fase 3"/"Fase 4" in UI: le
  feature non ancora implementate sono "Disponibile a breve".
- NON aprire PR. Solo push del branch.
- Se trovi una decisione ambigua, fai una AskUserQuestion solo
  se è davvero bloccante. Altrimenti decidi col default più
  semplice e annota nel body del commit.

────────────────────────────────────────────────────────────────
Verifica finale (smoke test, prima del push)
────────────────────────────────────────────────────────────────

1. `npm run typecheck` pulito.
2. Avvia l'app (Expo Go), passa in modalità sport (long-press
   Home), apri tab "Schede": vedi 3 preset, badge categorie con
   colori da sportPalette.
3. Tap "Apri" su un preset → vedi WorkoutDetailModal con la
   lista esercizi + bottone "Inizia allenamento" disabilitato.
4. Tap "Duplica" → si crea una copia editabile, apre l'editor.
   Modifica nome, salva → torna alla lista, vedi la scheda
   nuova in cima alla sezione "Le tue".
5. Crea da zero col "+", aggiungi 2 esercizi dal picker, salva.
6. Swipe-to-delete sulla scheda creata: viene rimossa. Sui
   preset il swipe non c'è.

Procedi.
```

---

## Note operative per chi avvia la sessione

- **Verifica preliminare**: `main` aggiornato deve contenere
  Phase 1 (PR #51 mergeata) — confermalo prima di iniziare con
  `git log --oneline | grep "feat(sport)"`.
- **node_modules**: in ambienti effimeri potrebbe non essere
  installato. Il prompt include `npm ci` come fallback.
- **Tempi attesi**: 3 commit, ogni commit M effort. Stima
  ~3-4h. Il grosso del lavoro è la WorkoutsScreen (modali +
  validazione + interazione).
- **Testing manuale**: la sessione dovrebbe testare a mano via
  Expo Go o APK il flusso editor (creazione, modifica,
  duplicazione preset, delete). Su agente cloud senza device
  questo non è possibile: in tal caso accettare che lo smoke
  test sia solo `typecheck` + ispezione visuale del codice.

## Cosa NON includere nel prompt (volutamente fuori scope di Fase 2)

- Avvio della sessione di allenamento (Fase 3).
- Banner persistente, persistenza background, ActiveSessionContext
  (Fase 3).
- Libreria esercizi completa con filtri (Fase 4) — qui solo
  picker per workout, non una vista a sé stante.
- Calcolo calorie da MET (Fase 3 quando arriva la sessione).
- Modifiche a TimerScreen, SportHomeScreen, SportHistoryScreen,
  ExercisesScreen — restano placeholder.
- Splash/transizione/bounce/callout (Fase 5).
- Asset grafici "FitTrack".
- Modifiche a `app.json`, `package.json`, `eas.json`, `setup.bat`.
- Aggiunta di librerie nuove.
- Apertura di PR / merge / delete branch.
