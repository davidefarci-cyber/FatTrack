# Sport Mode — piano di lavoro a fasi

> Branch di esplorazione: `claude/explore-sports-mode-09wg6`.
> Branch atteso per l'implementazione: `claude/sport-mode-scaffold` (Fase 1).
> Fasi successive: branch separato per ognuna, vedi tabella in fondo.

## Contesto

L'utente vuole una **seconda modalità** dell'app dedicata all'allenamento in
casa. La parte "diet" attuale resta intoccata: la modalità sport è una "faccia"
parallela con tab e schermate diverse, accessibile via long-press sul tab
Home + toggle in Settings, con uno splash di transizione.

Il design system esistente (`src/theme/index.ts` + primitives in
`src/components/`) è il riferimento stilistico assoluto: la modalità sport
**estende** i token (palette accent arancio "energia"), **riusa** i primitives
neutri (`Card`, `Input`, `ScreenHeader`, `BottomSheet`, `SegmentedControl`,
`Toast`) e introduce nuove icone/componenti solo dove serve. Niente
duplicazione, niente librerie nuove.

### Decisioni di prodotto già prese (vedi sessione esplorativa)

| Tema | Scelta |
| --- | --- |
| **Switch tra modalità** | Long-press sul tab Home (~600ms + haptic). Toggle anche in Settings (entrambe le modalità) come fallback. |
| **Discoverability** | Al primo avvio post-update: bounce persistente sul tab Home + callout "Tieni premuto". Entrambi si fermano **dopo il primo ingresso in sport mode** (non al primo trigger del gesto). |
| **Transizione** | Overlay `Animated` cross-fade ~700-900 ms. Splash dedicato (asset fornito dall'utente: variante con logo "FitTrack" e palette arancio). |
| **Nome app** | Resta "FatTrack" lato `app.json`. Internamente il logo/wordmark in sport mode è "FitTrack". Test interni, niente cambio bundle id. Esponiamo un `APP_NAME_SPORT` come costante in `src/theme/sportMode.ts` per aggiornarlo facilmente. |
| **Tab sport mode** | 5 voci con simmetria diet: `Timer · Schede · Home (FAB) · Storico · Esercizi`. |
| **Home sport (FAB)** | Dashboard giornata: scheda di oggi (selezionabile o preimpostata), statistiche settimana, pulsante "Inizia allenamento". |
| **Sessione live** | Schermata full-screen sopra il tab navigator (stack route, non Modal). Banner persistente con timer mentre l'utente naviga in altre tab. **Persistenza**: se l'utente esce dall'app, al rientro la sessione è ancora attiva con tempo aggiornato. |
| **Profilo** | Riusiamo `profileDB` per stimare calorie bruciate (peso, età, sesso, livello attività). Niente nuova tabella profilo. |
| **Schede** | Personali + un set di **preset** seedati (full body / push-pull-legs / mobilità). Stesso pattern di `seedFoods.ts`. |
| **Esercizi** | Libreria con seed JSON locale. Indagare in fase 4 se esistono DB esterni (vedi Open Questions). |
| **Spotify** | Fuori scope. Aggiunta come voce nel TODO globale (`docs/TODO.md`) come idea futura. |

### Vincoli architetturali

1. **Nessun fork del design system**. Si estende `src/theme/index.ts` con un
   nuovo namespace `sport` (palette + accent). I primitives che oggi
   hardcodano `colors.green` (FAB, tab focus tint, `CalorieRing`) diventano
   "theme-aware" via `useAppTheme()` (Fase 1).
2. **Nessun secondo `NavigationContainer`**. `RootNavigator` sceglie quale
   tab navigator montare (`MainTabNavigator` per diet, `SportTabNavigator` per
   sport) in base ad `appMode` letto da `profileDB` o nuova tabella
   `app_settings` (vedi Fase 1).
3. **Una sola `expo-sqlite` instance**. `getDatabase()` resta il singleton.
   Nuove tabelle sport convivono nello stesso DB (con migration ALTER TABLE
   idempotente come da pattern esistente).
4. **Italiano** in tutti i testi UI e label, inglese per nomi codice/funzione.

---

## Riepilogo fasi

| Fase | Scope | Rischio | Branch | Commit attesi |
| --- | --- | --- | --- | --- |
| **1** | Scaffolding: `appMode` + `ThemeContext` + `SportTabNavigator` placeholder + transizione | Medio | `claude/sport-mode-scaffold` | 4-5 |
| **2** | Schede allenamento: DB, preset seed, schermata `Workouts` editabile | Medio | `claude/sport-mode-workouts` | 3-4 |
| **3** | Sessione live + timer: stack route + banner persistente + persistenza background | Alto | `claude/sport-mode-session` | 4-5 |
| **4** | Libreria esercizi + Home dashboard + storico | Medio | `claude/sport-mode-exercises-dashboard` | 3-4 |
| **5** | Polish: discoverability bounce + splash transizione + onboarding sport | Basso | `claude/sport-mode-polish` | 2-3 |

Ogni fase è indipendente: l'app resta funzionante (in modalità diet) anche
fermandosi a Fase 1. Le fasi 2 e 4 si possono parallelizzare tra agenti
diversi se serve.

---

## Fase 1 — Scaffolding e theme provider

Scopo: introdurre il concetto di "modalità", il provider di tema, il
secondo navigator (con 5 schermate **placeholder**), il toggle in Settings,
e il long-press handler con transizione fade-in/out. Niente feature reali:
all'uscita di questa fase l'utente può **vedere** la nuova faccia ma le
schermate sono `<View><Text>Coming soon</Text></View>` stilizzate nel tema.

### 1A. Persistenza `appMode`

**Scelta**: nuova tabella `app_settings` (singleton) invece di sovraccaricare
`daily_settings` (che è specificatamente legato alla giornata calorica). La
tabella ospiterà anche futuri flag globali.

```sql
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  app_mode TEXT NOT NULL DEFAULT 'diet' CHECK (app_mode IN ('diet','sport')),
  sport_mode_seen INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
INSERT OR IGNORE INTO app_settings (id) VALUES (1);
```

- Migration idempotente in `src/database/db.ts` (pattern già usato per
  `user_profile` e `daily_settings`).
- Nuovo file `src/database/appSettingsDB.ts` con API:
  ```ts
  export type AppMode = 'diet' | 'sport';
  export type AppSettings = { appMode: AppMode; sportModeSeen: boolean; updatedAt: string };
  export async function getAppSettings(): Promise<AppSettings>;
  export async function setAppMode(mode: AppMode): Promise<void>;
  export async function markSportModeSeen(): Promise<void>;
  ```
- Re-export in `src/database/index.ts`.

### 1B. Theme provider e palette sport

**File nuovi**:
- `src/theme/sportMode.ts` — palette arancio dedicata (analoga a `colors.ts`):
  `accent`, `accentDark`, `accentSoft`, `bgTint`, `ring`, `success`,
  `warning`. Niente sostituzione del verde diet, solo un set parallelo.
- `src/theme/ThemeContext.tsx` — `<ThemeProvider mode="diet" | "sport">`
  che espone `useAppTheme()` con `{ accent, accentDark, ring, mode }`.
  Il provider si monta in `App.tsx` sopra `RootNavigator` e legge il `mode`
  da `appSettingsDB`.

**Estensione `src/theme/index.ts`**:
- Aggiungere `sportPalette` analogo a `mealPalette` per categorizzare
  esercizi (forza/cardio/mobilità/recupero).
- Nuovi token `colors.sport.*` (alias del file dedicato).
- **Non** rinominare i token esistenti.

**Primitives da rendere theme-aware** (lista chiusa per questa fase):
- `src/components/FAB.tsx` — sostituire `colors.green` con `useAppTheme().accent`.
- `src/components/BottomTabBar.tsx` — `tint` del tab focused diventa
  `useAppTheme().accent`. Logo/icone restano neutri.
- `src/components/CalorieRing.tsx` — accetta prop opzionale `accent?: string`,
  default su `useAppTheme().accent` (così la stessa primitive si riusa per
  un futuro `WorkoutRing` con colore diverso senza duplicare).

> **Non** toccare `Card`, `Input`, `ScreenHeader`, `Toast`, `BottomSheet`,
> `SegmentedControl`: sono già neutri (usano `colors.text*`, `colors.bg*`,
> `colors.border`).

### 1C. Nuovo navigator e schermate placeholder

**File nuovi**:
- `src/navigation/SportTabNavigator.tsx` — clone di `MainTabNavigator` con:
  - 5 `Tab.Screen` (vedi sotto), `initialRouteName="Home"`.
  - `BottomTabBar` riusato. `TAB_CONFIG` viene parametrizzato (vedi sotto).
  - Stesso back-handler hardware Android (incolla la logica, non astrarre
    prematuramente — DRY arriva quando ne avremo 3).
- `src/components/BottomTabBar.tsx` — il `TAB_CONFIG` diventa una funzione
  che riceve `mode: AppMode` e ritorna il config corretto. Le label e le
  icone in modalità sport:
  ```ts
  // mode === 'sport'
  Timer:     { label: 'Timer',    icon: 'timer' }
  Workouts:  { label: 'Schede',   icon: 'list-checks' }
  Home:      { label: 'Home',     icon: 'home' }       // FAB
  History:   { label: 'Storico',  icon: 'chart' }
  Exercises: { label: 'Esercizi', icon: 'dumbbell' }
  ```
- `src/screens/sport/TimerScreen.tsx`,
  `src/screens/sport/WorkoutsScreen.tsx`,
  `src/screens/sport/SportHomeScreen.tsx`,
  `src/screens/sport/SportHistoryScreen.tsx`,
  `src/screens/sport/ExercisesScreen.tsx` —
  tutti placeholder con `<ScreenHeader title="…" />` + `<Card>` con caption
  "In arrivo nella prossima fase". Solo per dimostrare che il tema arancio
  si applica correttamente.

**Icone nuove in `src/components/Icon.tsx`**:
- `timer`, `dumbbell`, `list-checks`, `play`, `pause`, `bolt`, `flame`.
  Tutte SVG inline come le esistenti, niente `react-native-vector-icons`.

**Tipi**:
- `src/types/index.ts` — nuovo `SportTabParamList` con le 5 rotte sport;
  `TabParamList` resta intatto.

### 1D. RootNavigator: scelta del navigator

```tsx
// src/navigation/RootNavigator.tsx
const { profile, loading: pLoading } = useProfile();
const { appMode, loading: mLoading } = useAppSettings();

if (pLoading || mLoading) return null;
if (profile === null) return <OnboardingScreen />;

return (
  <ThemeProvider mode={appMode}>
    {appMode === 'sport' ? <SportTabNavigator /> : <MainTabNavigator />}
  </ThemeProvider>
);
```

- Nuovo hook `src/hooks/useAppSettings.ts` (pattern `useProfile`).
- La transizione **vera** (overlay animato) arriva in Fase 5 — qui basta che
  il rerender del navigator funzioni quando `appMode` cambia.

### 1E. Toggle in Settings (entrambe le modalità)

- In `SettingsScreen` (diet) aggiungere una nuova `<Card>` "Modalità app"
  con `SegmentedControl` `[Dieta · Sport]`. Tap su "Sport" → conferma con
  `Alert` ("Passare alla modalità sport?") → `setAppMode('sport')` →
  `markSportModeSeen()`.
- In `SportSettingsScreen` (placeholder per ora) il toggle inverso. Nota:
  Settings sport può essere semplicemente la stessa schermata diet
  riutilizzata? Decidere in Fase 4 quando arriva il polish; per ora
  mostriamo un placeholder con il solo toggle "Torna a modalità Dieta".

### 1F. Long-press handler sul tab Home

- In `BottomTabBar.tsx` il bottone Home oggi ha solo `onPress`. Aggiungere
  `onLongPress` (~600ms) con `Haptics.selectionAsync()` (già un'utility
  disponibile via `expo-haptics` — verificare se è installata; altrimenti
  rimandare l'haptic a Fase 5 e in Fase 1 fare solo lo switch).
- Long-press → toggle `appMode` → `markSportModeSeen()`.
- Funziona in entrambi i sensi (diet → sport e viceversa).

### Verifica Fase 1

1. Cold start con `appMode='diet'` → app identica a oggi.
2. Tieni premuto Home → app passa in modalità sport, palette arancio,
   tab labels nuove, schermate placeholder.
3. In Settings sport → "Torna a Dieta" → torna alla home diet.
4. Kill + restart → la modalità ultima scelta persiste.
5. `npm run typecheck` pulito.

**Commit attesi**:
- `feat(sport): app_settings table + appMode persistence`
- `feat(sport): theme provider e palette arancio`
- `feat(sport): SportTabNavigator + 5 schermate placeholder`
- `feat(sport): toggle in Settings + long-press su tab Home`
- `chore(theme): primitives theme-aware (FAB, BottomTabBar, CalorieRing)`

---

## Fase 2 — Schede allenamento

Scopo: rendere funzionale il tab `Workouts`. Ogni scheda è un elenco
ordinato di esercizi con prescrizione (serie × reps × peso opzionale, oppure
durata per cardio/mobilità). I preset sono read-only ma duplicabili.

### 2A. Schema DB

```sql
CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('forza','cardio','mobilita','misto')),
  is_preset INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
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
```

Il vincolo `(sets+reps) XOR duration_sec` lo gestiamo a livello applicativo
(zod-light: una helper `validateWorkoutExercise`).

### 2B. Layer database

- `src/database/workoutsDB.ts` — `getWorkouts()`, `getWorkoutById()`,
  `createWorkout()`, `updateWorkout()`, `deleteWorkout()`,
  `duplicateWorkout()`.
- `src/database/seedWorkouts.ts` — pattern `seedFoodsIfEmpty` per inserire
  3 preset:
  - **Full Body Casa** (4 esercizi, 30 min)
  - **Push Pull Legs — Day 1** (5 esercizi)
  - **Mobilità mattina** (6 esercizi, 15 min)
  Tutti con `is_preset=1`. Gli esercizi referenziati sono seedati in Fase 4
  (per ora il seed di Fase 2 inserisce anche un seed minimo di ~10 esercizi
  base, sufficiente per i preset; la libreria completa arriva in Fase 4).

### 2C. UI `WorkoutsScreen`

- Stessa struttura di `FavoritesScreen` (lista + FAB nuovo + edit modal):
  - Lista `<Card>` con nome scheda, badge categoria, count esercizi, durata
    stimata.
  - Tap → apre `WorkoutDetailModal` (riusa `BottomSheet` con
    `maxHeightPercent`).
  - Pulsante "Modifica" → `WorkoutEditorModal` (riusa il pattern di
    `FavoriteEditorModal`).
  - Swipe-to-delete (solo per non-preset; preset hanno opzione "Duplica").
- "Inizia allenamento" diventa attivo dalla Fase 3 — qui mostra solo un
  bottone disabilitato con caption "Disponibile a breve".

**Commit attesi**:
- `feat(sport): tabelle workouts + workout_exercises`
- `feat(sport): seedWorkouts con preset full body / PPL / mobilità`
- `feat(sport): WorkoutsScreen con editor`

---

## Fase 3 — Sessione live + timer

Scopo: la feature di valore. L'utente sceglie una scheda dalla Home, parte
la sessione, esegue esercizio per esercizio, il timer di recupero parte
automaticamente, lo stato sopravvive a background/foreground.

### 3A. Stack route per la sessione

`RootNavigator` (in modalità sport) diventa uno stack:
```
SportStackNavigator
├── Tabs (SportTabNavigator)
└── ActiveSession (full-screen, presentation: 'modal' o 'card')
```

`createNativeStackNavigator` (già usato implicitamente — verificare se
serve aggiungerlo a package.json; se sì, valutare alternative: per ora i
modal RN bastano e non aggiungiamo dipendenze).

**Decisione operativa**: usare un **`Modal` RN nativo full-screen** invece di
un nuovo navigator stack — meno rischio di rompere la nav esistente, stesso
risultato visivo. Lo stato della sessione vive in un context globale
(`<ActiveSessionProvider>` in `App.tsx`), non legato al navigator.

### 3B. Schema DB sessioni

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workout_id INTEGER REFERENCES workouts(id),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  duration_sec INTEGER,
  calories_estimated INTEGER,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS session_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id),
  position INTEGER NOT NULL,
  set_number INTEGER NOT NULL,
  reps_done INTEGER,
  weight_kg REAL,
  duration_sec INTEGER,
  rpe INTEGER
);
```

- Una sessione è **una sola alla volta** (singleton in memoria + persistita).
- `calories_estimated` calcolato a sessione chiusa via formula MET dipendente
  dalla `category` della scheda + peso da `profileDB` (vedi
  `src/utils/calorieCalculator.ts` esistente, da estendere con
  `estimateCaloriesBurned(durationSec, category, weightKg)`).

### 3C. State management e persistenza background

**Problema**: l'utente esce dall'app durante l'allenamento → al rientro la
sessione deve essere ancora "attiva" col timer aggiornato.

**Soluzione**:
- `ActiveSessionContext` con stato `{ sessionId, startedAt, currentExerciseIndex, currentSet, restEndsAt? }`.
- Persistito in **`app_settings`** (nuova colonna `active_session_state TEXT`
  che contiene JSON, oppure tabella `active_session` singleton). Scelta:
  tabella dedicata, più pulita.
- Al cold start, se esiste `active_session` con `ended_at IS NULL`,
  `<ActiveSessionProvider>` ricostruisce lo stato e il timer riparte da
  `now() - startedAt`.
- `AppState.addEventListener('change')` per refreshare il timer al
  foreground (RN ferma `setInterval` quando va in background; al rientro
  ricalcoliamo dal `startedAt` salvato).
- **Niente notifiche local** in questa fase (sarebbero la cosa giusta per
  alert "fine recupero" in background — aggiungere come voce TODO).

### 3D. UI `ActiveSessionScreen`

- Header con nome scheda + pulsante "Termina" (richiede conferma).
- Esercizio corrente (immagine/icona, nome, prescrizione "3×12", note).
- Pulsanti: `[ ✓ Set completato ]` `[ ⏭ Salta ]` `[ Pausa ]`.
- Set completato → registra in `session_sets` → fa partire il `restTimer`
  in basso (countdown grosso) → al termine vibrazione + suono breve.
- Quando il set è l'ultimo dell'ultimo esercizio → "Termina sessione" → DB
  update → schermata riepilogo (durata, esercizi, calorie stimate, note
  opzionali).

### 3E. Banner persistente fuori dalla sessione

- Se `appMode === 'sport'` E sessione attiva, sopra la `BottomTabBar` (o
  sotto lo `SafeArea` top) mostra un banner sticky con:
  `[ 🏋️ Sessione in corso · 12:34 — Riapri ]`
- Tap → riapre `ActiveSessionScreen`.
- Implementato come componente `<ActiveSessionBanner />` montato in
  `SportTabNavigator` sopra il container delle screen.

### 3F. Tab `Timer` standalone

- Indipendente dalla sessione di scheda: timer libero (count-up o count-down
  con preset Tabata 20/10×8, intervalli custom).
- Riusa il timer engine sviluppato per la sessione.

**Commit attesi**:
- `feat(sport): sessions + session_sets tables`
- `feat(sport): ActiveSessionContext con persistenza background`
- `feat(sport): ActiveSessionScreen + banner sticky`
- `feat(sport): Timer standalone (Tabata, intervalli, libero)`
- `feat(sport): stima calorie bruciate da MET + profile`

---

## Fase 4 — Libreria esercizi + Home dashboard + storico

### 4A. Libreria esercizi

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
  met REAL
);
```

- Seed iniziale ~40 esercizi a corpo libero / con elastici / manubri leggeri.
- `ExercisesScreen` con search bar + filtri (gruppo muscolare,
  attrezzatura, livello).
- `ExerciseDetailModal` con guida step-by-step (`guide_steps` come array
  serializzato JSON, parse con try/catch come `favoritesDB.items`).
- `videoUrl` opzionale: se presente, pulsante "Guarda video" → apre via
  `Linking.openURL` (YouTube). Niente embed in-app per non aggiungere lib.

### 4B. Home dashboard sport

- Card "Allenamento di oggi": scheda preselezionata (logica: ultima usata,
  oppure rotazione weekday-based). Tap → apre dettaglio scheda. CTA
  primaria: "Inizia ora" (apre `ActiveSessionScreen`).
- Card "Settimana": `WorkoutRing` (riusa `CalorieRing` con prop `accent`)
  che mostra giorni allenati / target settimanale.
- Card "Ultimo allenamento": riepilogo della sessione più recente.
- Pulsante "Cambia scheda di oggi" → bottom sheet con elenco schede
  disponibili.

### 4C. Storico sessioni

- `SportHistoryScreen` riusa `HistoryChart` (parametrizzato col tema corrente)
  per mostrare durata totale settimanale o numero sessioni/settimana.
- Lista cronologica con tap → riepilogo sessione (set per set).

**Commit attesi**:
- `feat(sport): exercises table + seed libreria base (~40 esercizi)`
- `feat(sport): ExercisesScreen + ExerciseDetailModal con guida`
- `feat(sport): SportHomeScreen dashboard`
- `feat(sport): SportHistoryScreen con chart`

---

## Fase 5 — Polish e onboarding

### 5A. Discoverability bounce + callout

- Flag in `app_settings.sport_mode_seen` (Fase 1) controlla la visibilità.
- `BottomTabBar`: se `appMode === 'diet' && !sportModeSeen` → animazione
  Animated.loop bounce sull'icona Home + tooltip "Tieni premuto" sopra
  l'icona (auto-posizionato, non bloccante). Si ferma definitivamente
  appena l'utente entra in sport mode (`markSportModeSeen()`).
- Al primo cold start con sport mode disponibile mostriamo un **Toast**
  (riusa `useToast`) con: "Nuova: modalità Sport. Tieni premuto Home per
  provarla". Toast persistente fino al primo dismiss o al primo trigger.

### 5B. Splash di transizione

- Asset fornito dall'utente (PNG o SVG); previsto in `assets/sport-splash/`:
  - `logo-fittrack.svg` — wordmark arancio
  - `splash-bg.png` — background eventuale
- Componente `<ModeTransitionOverlay />` montato in `App.tsx` sopra
  `RootNavigator`. Quando `appMode` cambia:
  1. `Animated.timing` opacità 0 → 1 (200ms).
  2. Mantiene 400ms per dare percezione del cambio.
  3. `Animated.timing` opacità 1 → 0 (200ms) dopo che il rerender del
     navigator è completo.
- L'effetto attuale di "rerender pulito senza overlay" in Fase 1 viene
  superato qui.
- **Decisione asset**: l'utente prepara il logo "FitTrack" (SVG o PNG ad
  alta risoluzione + variante per dark/light se serve). Claude in Fase 5
  costruisce solo la logica di transizione e accetta i file finali via
  Edit/Write quando vengono droppati in `assets/`.

### 5C. Onboarding sport

- Se `appMode === 'sport'` E nessuna scheda esiste E nessuna sessione mai
  registrata → schermata `<SportOnboardingCard>` sopra la dashboard:
  "Benvenuto in modalità Sport. Inizia da una scheda preset o crea la tua".
- Niente flusso onboarding completo separato (il profilo utente è già
  configurato dalla parte diet — riuso totale).

**Commit attesi**:
- `feat(sport): bounce + callout su tab Home (one-shot fino a primo ingresso)`
- `feat(sport): ModeTransitionOverlay con splash asset`
- `feat(sport): onboarding card sport per utenti nuovi`

---

## Open questions (da risolvere durante l'implementazione)

| ID | Questione | Default proposto |
| --- | --- | --- |
| Q1 | Esistono DB pubblici di esercizi (con guide, video, MET)? Candidati: [wger.de](https://wger.de) API, [Exercise DB](https://exercisedb.io), Free Exercise DB su GitHub. | Fase 4: usare seed JSON locale curato. Indagare wger come voce TODO se serve espansione massiccia. |
| Q2 | Le **immagini esercizi** vivono nel bundle (asset locali) o si fetchano? | Bundle locale per i preset (limitati), nessun fetch in MVP. |
| Q3 | Notifiche locali per fine recupero in background? | TODO per fase futura: aggiungere `expo-notifications` + permesso, non in scope ora. |
| Q4 | Deep-link Spotify (`spotify:playlist:...`) come MVP della parte musica? | Out of scope (richiesta utente). Voce in `docs/TODO.md`. |
| Q5 | Long-press in fase 1: 600ms troppo o troppo poco? Va testato a mano. | Default 600ms, parametrizzabile via costante in `BottomTabBar.tsx`. |
| Q6 | Asset splash "FitTrack": chi li produce e quando? | Utente li produce. Claude costruisce solo la logica overlay; in attesa dell'asset usa un placeholder testo arancio "FitTrack". |
| Q7 | I 3 preset di Fase 2 hanno bisogno di esercizi che esistono solo in Fase 4. | Seed minimo di ~10 esercizi base in Fase 2; espansione a ~40 in Fase 4. Le FK `workout_exercises.exercise_id` resistono se gli ID restano stabili (sempre INSERT OR IGNORE per nome unique). |
| Q8 | Il toggle in Settings sport: schermata clone della diet o sezione minima? | Fase 1 → minima ("Modalità app" + toggle + reset). Fase 5 valutare se serve di più. |

---

## File toccati / nuovi (mappa di alto livello)

### Nuovi file (da creare nelle fasi indicate)
- `src/theme/sportMode.ts` (1)
- `src/theme/ThemeContext.tsx` (1)
- `src/database/appSettingsDB.ts` (1)
- `src/database/workoutsDB.ts` (2)
- `src/database/seedWorkouts.ts` (2)
- `src/database/sessionsDB.ts` (3)
- `src/database/exercisesDB.ts` (4)
- `src/database/seedExercises.ts` (2 minimo, 4 espanso)
- `src/hooks/useAppSettings.ts` (1)
- `src/hooks/useActiveSession.ts` (3)
- `src/navigation/SportTabNavigator.tsx` (1)
- `src/screens/sport/TimerScreen.tsx` (1 placeholder, 3 reale)
- `src/screens/sport/WorkoutsScreen.tsx` (1 placeholder, 2 reale)
- `src/screens/sport/SportHomeScreen.tsx` (1 placeholder, 4 reale)
- `src/screens/sport/SportHistoryScreen.tsx` (1 placeholder, 4 reale)
- `src/screens/sport/ExercisesScreen.tsx` (1 placeholder, 4 reale)
- `src/screens/sport/ActiveSessionScreen.tsx` (3)
- `src/screens/sport/SportSettingsScreen.tsx` (1)
- `src/components/sport/ActiveSessionBanner.tsx` (3)
- `src/components/sport/RestTimer.tsx` (3)
- `src/components/sport/ModeTransitionOverlay.tsx` (5)
- `src/components/sport/WorkoutRing.tsx` (4) — riusa CalorieRing parametrizzato
- `src/utils/sportCalories.ts` (3) — `estimateCaloriesBurned`
- `assets/sport-splash/` (5) — fornito dall'utente

### File modificati
- `src/database/db.ts` — migrations idempotenti
- `src/database/index.ts` — re-export
- `src/theme/index.ts` — sportPalette, alias colors.sport
- `src/components/BottomTabBar.tsx` — TAB_CONFIG parametrizzato + long-press + bounce
- `src/components/FAB.tsx` — accent dal theme provider
- `src/components/CalorieRing.tsx` — prop `accent` opzionale
- `src/components/Icon.tsx` — nuove icone
- `src/navigation/RootNavigator.tsx` — branching su appMode
- `src/screens/SettingsScreen.tsx` — toggle modalità
- `src/types/index.ts` — `SportTabParamList`, `AppMode`
- `App.tsx` — `<ThemeProvider>` + `<ActiveSessionProvider>` + overlay
- `CLAUDE.md` — sezione modalità sport (estensione, non riscrittura)
- `docs/TODO.md` — voci spostate da open questions (Spotify, notifiche, video lib)

---

## Note operative

- Ogni fase ha il proprio branch con prefisso `claude/sport-mode-…`. Push
  diretto a feature branch, **niente PR aperta automaticamente** (decisione
  del proprietario, come da `NEW_SESSION_PROMPT.md` esistente).
- `npm run typecheck` deve passare a fine di ogni commit.
- I messaggi di commit seguono il pattern `feat(sport): …`,
  `chore(theme): …`, `refactor(nav): …` già in uso nel repo, con trailer
  `https://claude.ai/code/session_<id>`.
- Il `CLAUDE.md` aggiornato per la modalità sport viene committato in
  Fase 1, **dopo** il fix Settings/FoodSearch (commit a sé) — vedi
  `NEW_SESSION_PROMPT.md` per l'ordine.
- Niente PR, niente merge: l'utente decide quando consolidare su `main`.
