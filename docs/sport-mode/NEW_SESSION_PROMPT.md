# Prompt per nuova sessione — Sport Mode (Fase 1: scaffolding)

Copia il blocco qui sotto come primo messaggio in una sessione pulita di
Claude Code, in cwd `/home/user/FatTrack`, partendo dal branch `main`
aggiornato.

> **Importante**: questa sessione implementa **solo la Fase 1** (scaffolding).
> Le fasi 2-5 hanno il proprio prompt — generato dopo che la Fase 1 è
> mergeata su `main`. Vedi `docs/sport-mode/PLAN.md` per il piano completo.

---

## Prompt da incollare

```
Sei in /home/user/FatTrack su branch main aggiornato.

Implementa la FASE 1 della modalità Sport: scaffolding completo della
seconda "faccia" dell'app (toggle modalità, theme provider arancio,
SportTabNavigator con 5 schermate placeholder, long-press su Home).
Le feature reali (schede, sessione, esercizi, polish) arrivano nelle
fasi successive: NON implementarle ora.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md — vincoli stilistici, design system non negoziabile,
   convenzioni DB e codice. Non sono opzionali. NB: la sezione 2
   elenca i tab visibili come "Barcode · Favorites · Home · History
   · FoodSearch" (NON Settings — è raggiungibile solo dal cog icon
   in HomeScreen header). Verifica in src/components/BottomTabBar.tsx
   se hai dubbi.
2. docs/sport-mode/PLAN.md — il piano completo a 5 fasi: contesto,
   decisioni di prodotto, schema DB, file path, sequenza commit per
   ogni fase. La Fase 1 è descritta nei §1A-1F.
3. docs/TODO.md — backlog operativo. Solo per riferimento.

Poi:

- Crea il branch claude/sport-mode-scaffold da main.
- Esegui le 6 sezioni della Fase 1 (1A → 1F) descritte nel piano,
  una alla volta, con un commit separato per ognuna laddove ha
  senso (vedi "Commit attesi" in fondo alla Fase 1).
- Dopo ogni commit: `npm run typecheck` deve passare. Se la prima
  volta node_modules manca, fai `npm ci`.
- I messaggi di commit seguono il pattern già usato sul repo:
  `feat(sport): …` / `chore(theme): …` + body descrittivo + trailer
  https://claude.ai/code/session_<id>.
- Niente PR: alla fine fai solo `git push -u origin
  claude/sport-mode-scaffold`. Sarò io a decidere quando aprire la
  PR e mergiare.

Specifiche tecniche di Fase 1 (riassunto del piano — leggi comunque
PLAN.md per i dettagli):

- Nuova tabella `app_settings` (singleton con CHECK id=1) con
  colonne `app_mode`, `sport_mode_seen`, `updated_at`. Migration
  idempotente in src/database/db.ts come da pattern esistente.
- Nuovo modulo `src/database/appSettingsDB.ts` (API: getAppSettings,
  setAppMode, markSportModeSeen) + re-export in
  src/database/index.ts.
- Nuovo `src/theme/sportMode.ts` (palette arancio: accent, accentDark,
  accentSoft, bgTint, ring, success, warning). NON sostituire i token
  esistenti. Aggiungere `sportPalette` (categorie: forza/cardio/
  mobilita/recupero) in `src/theme/index.ts` analogo a `mealPalette`.
- Nuovo `src/theme/ThemeContext.tsx` con `<ThemeProvider mode>` e
  `useAppTheme()` che ritorna `{ accent, accentDark, ring, mode }`.
  Montato in App.tsx sopra RootNavigator.
- Primitives da rendere theme-aware: src/components/FAB.tsx (sostituire
  colors.green con useAppTheme().accent), src/components/BottomTabBar.tsx
  (tint del tab focused), src/components/CalorieRing.tsx (prop opzionale
  `accent` con default su useAppTheme().accent). NON toccare Card, Input,
  ScreenHeader, Toast, BottomSheet, SegmentedControl.
- Nuovo `src/navigation/SportTabNavigator.tsx` clone di MainTabNavigator
  con 5 Tab.Screen: Timer, Workouts, Home (FAB), History, Exercises +
  SportSettings nascosto. initialRouteName="Home". Stesso back-handler
  hardware Android (incolla la logica, non astrarre prematuramente).
- `BottomTabBar.tsx`: TAB_CONFIG diventa funzione `getTabConfig(mode:
  AppMode)` che ritorna config diet o sport. Nuove label sport: Timer
  · Schede · Home · Storico · Esercizi (in italiano).
- Nuove icone in src/components/Icon.tsx: timer, dumbbell, list-checks,
  play, pause, bolt, flame. SVG inline come le esistenti, niente lib
  esterne.
- 5 schermate placeholder in src/screens/sport/ (TimerScreen,
  WorkoutsScreen, SportHomeScreen, SportHistoryScreen, ExercisesScreen)
  + SportSettingsScreen. Ognuna ha solo `<ScreenHeader>` + `<Card>` con
  caption "In arrivo nella prossima fase". Servono solo per dimostrare
  che il tema arancio si applica correttamente — NIENTE feature reali.
- src/types/index.ts: nuovo `SportTabParamList`. `TabParamList` resta
  intatto. Nuovo type `AppMode = 'diet' | 'sport'` se non c'è già in
  appSettingsDB.
- src/navigation/RootNavigator.tsx: monta ThemeProvider con appMode
  letto da useAppSettings (nuovo hook in src/hooks/useAppSettings.ts,
  pattern useProfile). Sceglie SportTabNavigator se mode === 'sport',
  altrimenti MainTabNavigator. Resta il gating onboarding (profile
  null → OnboardingScreen).
- SettingsScreen (diet): nuova `<Card>` "Modalità app" con
  SegmentedControl [Dieta · Sport]. Tap "Sport" → Alert di conferma →
  setAppMode('sport') + markSportModeSeen().
- SportSettingsScreen: placeholder con bottone "Torna a modalità
  Dieta" che fa setAppMode('diet').
- BottomTabBar long-press sul tab Home: ~600ms (costante
  LONG_PRESS_MS in cima al file). Toggle appMode + markSportModeSeen.
  Funziona in entrambi i sensi. NIENTE haptic feedback in Fase 1
  (rimandato a Fase 5 per non aggiungere expo-haptics se non già
  presente — verifica package.json prima di importarlo).
- NIENTE overlay di transizione visibile in Fase 1: il rerender del
  navigator è "secco". L'overlay arriva in Fase 5.
- NIENTE bounce/callout in Fase 1: arrivano in Fase 5 quando lo
  splash di transizione è pronto.

Vincoli operativi:

- Italiano per tutti i testi UI e label visibili. Inglese per nomi
  di variabili, funzioni, type, file.
- Solo i token/primitives di src/theme: niente hex inline, niente
  librerie UI esterne.
- Alias `@/` per gli import.
- expo-sqlite async API; ALTER TABLE / CREATE TABLE idempotenti
  via try/catch nel pattern già presente in src/database/db.ts.
- NON toccare: settings.json, hook git, CI/CD, package.json (a
  meno che il piano non lo richieda esplicitamente — non lo richiede
  per Fase 1).
- NON creare file di documentazione aggiuntivi non richiesti dal
  piano.
- NON aprire PR. Solo push del branch.
- Se trovi una decisione ambigua, leggi prima la sezione "Open
  questions" del piano (decisioni di default già prese); fai una
  AskUserQuestion solo se rimane davvero un dubbio bloccante.

Verifica finale (smoke test, prima del push):
1. Cold start con appMode='diet' → app identica a oggi (palette
   verde, tab diet).
2. Tieni premuto Home → app passa in modalità sport, palette
   arancio, tab labels nuove (Timer/Schede/Home/Storico/Esercizi),
   schermate placeholder.
3. In SportSettingsScreen → "Torna a Dieta" → torna alla home diet.
4. Kill + restart → la modalità ultima scelta persiste.
5. `npm run typecheck` pulito.

Procedi.
```

---

## Note operative per chi avvia la sessione

- **Verifica preliminare**: il branch `main` deve contenere
  `docs/sport-mode/PLAN.md` (questo prompt accompagna). Se non c'è,
  la PR del lavoro esplorativo non è stata mergeata — chiedi al
  proprietario di fare il merge prima di avviare la sessione.
- **node_modules**: in ambienti effimeri potrebbe non essere installato.
  Il prompt include `npm ci` come fallback.
- **Tempi attesi**: 4-5 commit, ogni commit S/M effort. Stima ~2-3h.
  Il grosso del lavoro è la duplicazione (consapevole, non astratta) di
  `MainTabNavigator` + i 6 nuovi schermi placeholder.
- **Testing manuale**: la sessione dovrebbe testare a mano via Expo Go o
  APK il long-press e il toggle Settings. Su agente cloud senza device
  questo non è possibile: in tal caso accettare che lo smoke test sia
  solo `typecheck` + ispezione visuale del codice.

## Cosa NON includere nel prompt (volutamente fuori scope di Fase 1)

- Schede allenamento reali, sessione live, libreria esercizi (Fasi 2-4).
- Splash di transizione, bounce/callout, onboarding sport (Fase 5).
- Asset grafici "FitTrack" — fornisce l'utente prima di Fase 5.
- Modifiche a `app.json`, `package.json`, `eas.json`, `setup.bat`.
- Aggiunta di librerie nuove (expo-haptics, expo-notifications, ecc.).
- Apertura di PR / merge / delete branch — operazioni di review umana.
- Modifiche al design system esistente al di fuori dell'aggiunta di
  `colors.sport`, `sportPalette`, e delle nuove icone elencate sopra.

## Prompt per le fasi successive

I prompt per Fase 2-5 verranno scritti **dopo** il merge della Fase 1 su
`main`, una volta verificato che lo scaffolding funziona davvero come
atteso. La struttura di ogni prompt sarà identica a questo (riferimento
a CLAUDE.md, riferimento a PLAN.md sezione corrispondente, vincoli
operativi, smoke test, "Procedi.").

Path previsti:
- `docs/sport-mode/NEW_SESSION_PROMPT_PHASE_2.md` — Schede allenamento
- `docs/sport-mode/NEW_SESSION_PROMPT_PHASE_3.md` — Sessione live
- `docs/sport-mode/NEW_SESSION_PROMPT_PHASE_4.md` — Libreria + dashboard
- `docs/sport-mode/NEW_SESSION_PROMPT_PHASE_5.md` — Polish + onboarding
