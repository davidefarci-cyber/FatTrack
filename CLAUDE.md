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
| Card bianche | `<Card>` da `@/components/Card` |
| Input di form | `<Input>` da `@/components/Input` |
| Header schermata | `<ScreenHeader>` da `@/components/ScreenHeader` |
| Ring calorico | `<CalorieRing>` da `@/components/CalorieRing` |
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
├── theme/index.ts              # ← design tokens (SINGLE SOURCE OF TRUTH stilistica)
├── components/                 # primitives condivisi (Icon, Card, Input, ScreenHeader, CalorieRing, BottomTabBar)
├── screens/                    # schermate: BarcodeScreen, FavoritesScreen, HomeScreen, HistoryScreen, SettingsScreen
├── database/                   # SQLite layer (foodsDB, mealsDB, favoritesDB, settingsDB, profileDB) + db.ts + seedFoods
├── hooks/                      # useFonts, useProfile, usePreferences
├── utils/                      # calorieCalculator (Mifflin-St Jeor, TDEE, target)
└── types/                      # TabParamList, UserPreferences
```

- **Alias TS**: `@/` → `src/`. Usa sempre gli alias, non i path relativi.
- **Navigazione**: singolo `createBottomTabNavigator` in `App.tsx`. Ordine dei tab (dal design): `Barcode` · `Favorites` · `Home` (FAB centrale) · `History` · `Settings`. `initialRouteName="Home"`.
- **DB**: `getDatabase()` è singleton e idempotente. Usa `foodsDB` / `mealsDB` / `favoritesDB` / `settingsDB` / `profileDB` (namespace) da `@/database`.

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
- **SQLite profile**: riga singleton con `CHECK (id = 1)`.
- **Favorites**: campo `items` serializzato in JSON (parse con try/catch).
- **Ordine pasti**: `colazione → pranzo → cena → spuntino` (gestito con CASE in `mealsDB`).
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
