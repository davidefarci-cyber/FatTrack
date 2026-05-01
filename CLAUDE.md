# FatTrack — istruzioni per Claude

Questo file è letto automaticamente da Claude Code all'inizio di ogni sessione.
Contiene le regole non negoziabili del progetto. **Leggerle prima di qualsiasi
modifica al codice.**

---

## 1. Regola #1 — Priorità stilistica assoluta

L'app ha un design system già consegnato e integrato. **Ogni nuova schermata,
componente o modifica UI deve essere coerente con quel sistema.** Non inventare
nuovi stili, non usare colori/spaziature/font arbitrari.

- **Fonte di verità stilistica**: `src/theme/index.ts` + componenti primitives
  in `src/components/`.
- **Handoff originale**: `design/fattrack/project/FatTrack.html` +
  `fattrack-ui.jsx` + `fattrack-screens.jsx`. Vedi `design/README.md` per come
  il design è mappato in codice.
- Se qualcosa manca dai token o dai primitives e serve per una feature,
  **estendi** il theme (aggiungi un token, un nuovo componente condiviso) —
  **non** stilare inline con valori magici.

### Cosa usare sempre

| Bisogno | Import |
| --- | --- |
| Colori | `import { colors } from '@/theme'` |
| Spaziature | `import { spacing } from '@/theme'` (scala `xxs`/`xs`/`sm`/`md`/`lg`/`xl`/`xxl`/`xxxl`/`screen`) |
| Raggi | `import { radii } from '@/theme'` |
| Ombre | `import { shadows } from '@/theme'` (solo `sm` e `md`) |
| Tipografia | `import { typography } from '@/theme'` (`h1`/`display`/`value`/`body`/`bodyRegular`/`bodyBold`/`caption`/`label`/`micro`) |
| Palette pasti | `import { mealPalette } from '@/theme'` (colazione/pranzo/cena/spuntino) |
| Palette sport | `import { sportPalette, sportColors, APP_NAME_SPORT } from '@/theme'` (forza/cardio/mobilita/misto/recupero) |
| Card bianche | `<Card>` da `@/components/Card` |
| Input di form | `<Input>` da `@/components/Input` |
| Header schermata | `<ScreenHeader>` da `@/components/ScreenHeader` |
| Ring calorico | `<CalorieRing>` da `@/components/CalorieRing` (accetta prop `accent` + `unit`, riusato anche dalla dashboard sport) |
| Accent corrente | `useAppTheme()` da `@/theme/ThemeContext` → `{ mode, accent, accentDark, accentSoft, ring, bgTint }`. **I primitives FAB / BottomTabBar / CalorieRing leggono l'accent da qui.** |
| Icone | `<Icon name="…" />` da `@/components/Icon` (vedi lista `IconName`) |

### Cosa NON fare

- ❌ Stili inline con hex colors (`'#ff5500'`) o pixel magici fuori dalla scala `spacing`.
- ❌ Usare font diversi da Plus Jakarta Sans (già caricato da `useFonts`).
- ❌ Aggiungere nuove librerie di UI (non serve NativeWind, styled-components, Paper, ecc. — il sistema è StyleSheet + tokens).
- ❌ Modificare `src/theme/index.ts` o i primitives "al volo" per una sola schermata. Se un nuovo caso lo richiede, estendi il sistema in modo generale.

---

## 2. Struttura del progetto

```
src/
├── theme/                      # design tokens + ThemeContext (mode-aware accent)
│   ├── index.ts                # ← SINGLE SOURCE OF TRUTH stilistica (colors, spacing, typography, mealPalette, sportPalette)
│   ├── sportMode.ts            # palette arancio "energia" + APP_NAME_SPORT="FitTrack"
│   └── ThemeContext.tsx        # ThemeProvider + useAppTheme() (accent dipendente da appMode)
├── components/                 # primitives condivisi (Icon, Card, Input, ScreenHeader, CalorieRing, BottomTabBar, …)
│   └── sport/                  # primitives sport-specifici (ActiveSessionBanner, RestTimer, ModeTransitionOverlay, *Modal sport, …)
├── contexts/                   # ActiveSessionContext (stato globale sessione di allenamento attiva)
├── navigation/                 # RootNavigator + MainTabNavigator (diet) + SportTabNavigator (sport)
├── screens/                    # schermate diet: BarcodeScreen, FavoritesScreen, HomeScreen, HistoryScreen, FoodSearchScreen, SettingsScreen, ProfileScreen
│   └── sport/                  # schermate sport: SportHomeScreen, WorkoutsScreen, ExercisesScreen, SportHistoryScreen, TimerScreen, ActiveSessionScreen, SportSettingsScreen
├── database/                   # SQLite layer condiviso diet+sport (vedi sezione DB sotto) + db.ts + seed*
├── hooks/                      # useFonts, useProfile, useAppSettings, useSportStats, …
├── utils/                      # calorieCalculator, sportCalories (MET-based), dbBackup, updateChecker
└── types/                      # TabParamList (diet), SportTabParamList, UserPreferences
```

- **Alias TS**: `@/` → `src/`. Usa sempre gli alias, non i path relativi.
- **Navigazione (due modalità)**: `RootNavigator` sceglie quale tab navigator montare in base ad `appMode` (letto da `useAppSettings`). Diet → `MainTabNavigator`, Sport → `SportTabNavigator`. Entrambi usano lo stesso primitive `BottomTabBar` con `getTabConfig(mode)` per le label/icone. `initialRouteName="Home"` in entrambi.
  - **Tab bar visibile diet**: `Barcode` · `Favorites` · `Home` (FAB centrale) · `History` · `FoodSearch`. `Settings` e `Profile` restano registrati come Tab.Screen ma NASCOSTI dalla bar (raggiungibili dalle icone in alto a destra di `HomeScreen`: `cog` → Settings, `user` → Profile). **Settings NON è una voce della tab bar — sessioni precedenti hanno sbagliato a documentarlo, non ripetere l'errore.**
  - **Tab bar visibile sport**: `Timer` · `Workouts` (Schede) · `Home` (FAB) · `History` (Storico) · `Exercises` (Esercizi). `SportSettings` è nascosto, raggiungibile dal `cog` in alto a destra di `SportHomeScreen`.
- **Switch modalità**: long-press (~600ms) sul tab Home in entrambi i sensi, oppure toggle in Settings/SportSettings. Entrambi chiamano `setAppMode()` + `markSportModeSeen()`. Il flag `sportModeSeen` controlla la discoverability (bounce + callout + banner one-shot in HomeScreen diet finché non si entra in sport almeno una volta).
- **Transizione**: `<ModeTransitionOverlay>` in `App.tsx` fa cross-fade ~700ms quando `appMode` cambia (wordmark "FitTrack"/"FatTrack" + sottotitolo). Asset definitivi TBD (vedi TODO).
- **Sessione di allenamento attiva**: `<ActiveSessionProvider>` in `App.tsx` (sopra `RootNavigator`) gestisce stato + persistenza DB + AppState (background/foreground). Il banner sticky `<ActiveSessionBanner>` in `SportTabNavigator` mostra la sessione live mentre l'utente naviga in altre tab. Una sola sessione attiva alla volta (singleton tabella `active_session`).
- **DB**: `getDatabase()` singleton condiviso diet+sport. Namespace da `@/database`:
  - **Diet**: `foodsDB` / `foodServingsDB` / `mealsDB` / `mealsStore` / `favoritesDB` / `quickAddonsDB` / `settingsDB` / `profileDB`. Nota: `settingsDB` contiene **solo** `side_dish_calories` — i dati personali (peso/altezza/età/sesso/livello attività/obiettivo) e i valori derivati (BMR/TDEE/target) vivono in `user_profile` via `profileDB`.
  - **Sport**: `appSettingsDB` (singleton: `appMode` + `sportModeSeen` + `weeklyTargetDays`) / `exercisesDB` (libreria) / `workoutsDB` (schede + workout_exercises) / `sessionsDB` (sessions + session_sets + active_session singleton).
  - **Tabelle nuove sport**: `app_settings`, `exercises`, `workouts`, `workout_exercises`, `sessions`, `session_sets`, `active_session`. Tutte create idempotenti in `migrate()` di `db.ts`.

---

## 3. Stack tecnico (non cambiare senza motivo)

- Expo SDK 51, React Native 0.74, TypeScript strict
- React Navigation v6 (`@react-navigation/bottom-tabs`)
- `expo-sqlite` (API async: `openDatabaseAsync`, `execAsync`, ecc.)
- `expo-camera` con `<CameraView onBarcodeScanned>` per la scansione barcode (in `BarcodeScreen`)
- `@react-native-async-storage/async-storage` (preferenze)
- `react-native-svg` (icone + `CalorieRing`)
- `@expo-google-fonts/plus-jakarta-sans` + `expo-font` + `expo-splash-screen`

---

## 4. Convenzioni di codice

- **Italiano** nei testi UI, nomi delle label e commenti. Nomi delle funzioni/variabili in inglese.
- **DB**: tabelle `snake_case`, TS `camelCase`. Mappatura via `AS` negli `SELECT`.
- **SQLite singleton** (profile / app_settings / daily_settings / active_session): riga singola con `CHECK (id = 1)`.
- **Favorites/guideSteps**: campi serializzati in JSON (`favorites.items`, `exercises.guide_steps`) — parse con try/catch, ritorna null su errore (mai crash).
- **Ordine pasti**: `colazione → pranzo → cena → spuntino` (gestito con CASE in `mealsDB`).
- **Ordine schede sport**: `is_preset DESC, updated_at DESC` (preset prima, poi user workout più recenti in cima).
- **Snapshot a inizio sessione**: `sessions.workout_name` e `sessions.category` sono salvati alla `startSession`, NON join-ati a runtime, così lo storico resta leggibile anche se l'utente rinomina/cancella la scheda.
- **MET-based calorie**: `src/utils/sportCalories.ts` calcola `kcal = MET × peso × ore`. Esercizi con `met=null` contribuiscono 0 (no fallback invasivi).
- Commenti brevi, solo dove il WHY non è ovvio.

---

## 5. Git & deploy

- **Branch di sviluppo**: `main` (default). Push diretto autorizzato.
- **Workflow Windows**: tutto passa da `fattrack.bat` (menu unico) — aggiorna repo, dev server Expo Go, build APK rapido, release completa (bump + APK + GitHub Release per update auto), gestione dipendenze.
- **Aggiornamenti utente**: solo via APK nativo (prompt in-app gestito da `src/utils/updateChecker.ts`). Niente OTA / EAS Update.
- **Bootstrap pre-clone**: `setup.bat` (winget → Git + Node LTS + EAS + clone/pull). A fine setup propone di lanciare `fattrack.bat`.
- **Build APK** alternative dirette: `npm run build:android:preview` (cloud EAS) oppure `scripts\build-android-local.bat <abi> <output.apk>` (locale Gradle).
- Mai `git push --force` o hook-skip senza chiederlo.

---

## 6. Workflow consigliato per prompt futuri

1. Il prompt chiede una feature (es. "implementa lo scanner barcode").
2. Leggere questo file + `design/README.md` + i token in `src/theme/index.ts`.
3. Verificare se lo schermo/componente target esiste già come placeholder in `src/screens/` — in quel caso **sostituire il contenuto** mantenendo l'intelaiatura (`ScreenHeader` + `Card`, ecc.).
4. Se servono interazioni nuove, preferire componenti in `src/components/` riusabili.
5. Collegare al layer dati esistente (`@/database`, `@/hooks`) invece di crearne altri.
6. Testare a mente: import, tipi, alias, coerenza con il design.

---

## 7. Backlog operativo — `docs/TODO.md`

`docs/TODO.md` è il **file ufficiale** delle cose da fare (debiti tecnici,
idee future, bug minori non bloccanti). **Leggerlo all'inizio di ogni
sessione** insieme a questo CLAUDE.md.

Quando l'utente:
- chiede _"cosa c'è da fare?"_, _"propostami qualcosa da implementare"_,
  _"cosa hai in backlog?"_ → rispondere usando le voci di `docs/TODO.md`,
  in ordine: 🔴 → 🟡 → 🟢, e a parità di priorità le più vecchie prima.
- dice _"aggiungi al TODO che ..."_ / _"segna debito su X"_ / _"ricordati
  di Y"_ → editare `docs/TODO.md` aggiungendo una voce nella sezione
  giusta col formato standard documentato in cima al file. Sempre
  committare in modo separato dal resto del lavoro (commit di tipo
  `chore(todo): ...`).
- chiude un task → spostare la voce nella sezione "✅ Fatto" col campo
  `Chiusa: YYYY-MM-DD`, NON cancellarla.
