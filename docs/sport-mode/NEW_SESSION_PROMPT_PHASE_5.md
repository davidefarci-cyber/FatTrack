# Prompt per nuova sessione — Sport Mode Fase 5 (Polish + onboarding)

> **Pre-requisiti**: Fase 4 mergeata su `main` (PR #55).
> Branch atteso per la Fase 5: `claude/sport-mode-polish`.
> Riferimento piano completo: `docs/sport-mode/PLAN.md` §5.

Ultima fase del progetto sport mode: 3 commit, ~2-3h. Polish
finale e onboarding. Niente feature nuove di sostanza, solo
discoverability + transizione visiva + un setting configurabile.

---

## Prompt da incollare

```
Sei in /home/user/FatTrack su branch main aggiornato.

Implementa la FASE 5 della modalità Sport: polish e onboarding
finale. Tre cose:
1. Discoverability del long-press Home: bounce + callout +
   toast "Nuova modalità Sport" finché l'utente non entra in
   sport mode almeno una volta.
2. Splash di transizione (overlay Animated cross-fade) quando
   l'utente cambia modalità.
3. Onboarding card sport per nuovi utenti + weeklyTarget
   configurabile dalle SportSettings.

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md — vincoli stilistici, design system non
   negoziabile, convenzioni DB e codice.
2. docs/sport-mode/PLAN.md §5 — descrizione di alto livello.
3. src/database/appSettingsDB.ts — il flag `sportModeSeen` è
   già lì da Fase 1, e `markSportModeSeen()` viene già chiamato
   sia dal long-press di MainTabNavigator/SportTabNavigator sia
   dal toggle in Settings/SportSettings. NON ricablare nulla:
   il polish di Fase 5 si limita a LEGGERE il flag e mostrare
   bounce/callout/toast quando è false.
4. src/hooks/useSportStats.ts — la costante
   WEEKLY_TARGET_DAYS = 4 va sostituita da un valore letto da
   appSettings (vedi step 5C).
5. App.tsx — qui montano i provider; aggiungerai
   ModeTransitionOverlay sopra RootNavigator.

API e file disponibili (riusa, NON ricreare):

- useAppSettings da @/hooks/useAppSettings: già espone
  appMode, sportModeSeen, setAppMode, markSportModeSeen.
- useAppTheme da @/theme/ThemeContext: per la palette
  arancio nel ModeTransitionOverlay.
- APP_NAME_SPORT da @/theme: "FitTrack" wordmark per il
  placeholder dello splash (in attesa dell'asset definitivo
  dell'utente).
- useToast da @/components/Toast: per il toast
  "Nuova modalità Sport".
- Primitives: Card, Button, Icon. Niente lib nuove.

Poi:

- Crea il branch claude/sport-mode-polish da main.
- Esegui i 3 step descritti sotto, una alla volta, con un
  commit separato per ognuno.
- Dopo ogni commit: `npm run typecheck` deve passare. Se la
  prima volta node_modules manca, fai `npm ci`.
- I messaggi di commit seguono il pattern `feat(sport): …` /
  `chore(sport): …` + body descrittivo + trailer
  https://claude.ai/code/session_<id>.
- Niente PR: alla fine fai solo `git push -u origin
  claude/sport-mode-polish`. Sarò io a decidere il merge.

────────────────────────────────────────────────────────────────
STEP 5A — Discoverability (bounce + callout + toast onboarding)
────────────────────────────────────────────────────────────────

Comportamento atteso:
- Utente in modalità diet, `sportModeSeen === false`:
  - L'icona Home della BottomTabBar fa un piccolo bounce
    animato (translateY) in loop, ~800ms periodo, ampiezza ~5px.
  - Sopra l'icona Home appare un piccolo "callout" con freccia
    verso il basso, testo "Tieni premuto", fondo `accent` del
    theme (arancio in modalità sport, ma qui siamo in diet —
    usa SEMPRE arancio sport per richiamare visivamente la
    nuova modalità: importa `sportColors.accent` direttamente
    da @/theme).
  - Al primo cold start dopo che la feature è disponibile (cioè
    quando `appMode === 'diet' && !sportModeSeen`), mostra un
    Toast (useToast.show) **persistente** col messaggio:
    "🏋️ Nuova: modalità Sport. Tieni premuto Home per provarla.".
    Persistente = duration `Infinity` o equivalente (vedi come
    funziona useToast — se non supporta persistenza nativa,
    aggiungi una prop `persistent?: boolean` al Toast e
    cancella il timer di auto-dismiss quando true).
- Tutti e tre (bounce, callout, toast) si fermano /
  scompaiono al primo `markSportModeSeen()`. Il flag persiste,
  quindi rimangono spenti per sempre dopo il primo uso.

Implementazione:

Modifica **src/components/BottomTabBar.tsx**:
- Importa `useAppSettings` e leggi `sportModeSeen` + `appMode`.
- Calcola `showHint = appMode === 'diet' && !sportModeSeen`.
- Per il bounce: dentro il blocco `if (isHome) { … }` (linea
  ~86), wrappa il `<View style={[styles.homeFab, …]}>` in un
  `<Animated.View>` con `transform: [{ translateY: bounceAnim }]`
  dove `bounceAnim` è un `Animated.Value(0)` lanciato in loop
  via `Animated.loop(Animated.sequence([…to: -5, to: 0])).start()`
  dentro un useEffect quando `showHint === true`. STOP del loop
  (`anim.stopAnimation()` + reset a 0) quando `showHint`
  diventa false.
- Per il callout: sopra il bottone Home (cioè PRIMA del
  `<Animated.View>` del FAB ma DENTRO il Pressable), aggiungi
  un `<View style={styles.callout}>` con `<Text>Tieni premuto</Text>`
  + una piccola freccia (View ruotato 45° in basso). Posizione
  absolute, top: -38 (sopra il FAB), centrato. Visibile solo
  se `showHint`.
- Stili nuovi:
  ```ts
  callout: {
    position: 'absolute',
    top: -38,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: sportColors.accent,
    borderRadius: radii.sm,
    zIndex: 10,
  },
  calloutText: {
    color: '#FFFFFF',
    fontSize: 11,
    ...typography.caption,
    fontFamily: typography.bodyBold.fontFamily,
  },
  calloutArrow: {
    position: 'absolute',
    bottom: -4,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    backgroundColor: sportColors.accent,
    transform: [{ rotate: '45deg' }],
  },
  ```

Per il toast persistente:
- Modifica **src/components/Toast.tsx**: aggiungi prop opzionale
  `persistent?: boolean` al `show(message, opts?)`. Se persistent,
  NON setta il setTimeout per auto-dismiss; resta finché qualcuno
  chiama `hide()` (esponi anche un `hide()` se non già esposto).
  Backward compatible: i caller esistenti passano una stringa
  come prima.
- In src/screens/HomeScreen.tsx (modalità diet): all'apertura,
  in un useEffect con dependency `[appMode, sportModeSeen]`,
  se `appMode === 'diet' && !sportModeSeen` chiama
  `toast.show('🏋️ Nuova: modalità Sport. Tieni premuto Home per
  provarla.', { persistent: true })`. Salva il toast id (o usa
  un ref) per chiamare `toast.hide(id)` quando `sportModeSeen`
  diventa true.
- ALTERNATIVA SE useToast non supporta facilmente la
  persistenza: piuttosto che modificare il Toast primitive,
  fai un `<View>` inline in HomeScreen come banner/info card
  dismissible, con CTA "Provala" che chiama
  `setAppMode('sport') + markSportModeSeen()`. Più semplice,
  zero modifiche al primitive. Decidi tu in base a cosa è meno
  invasivo. Se vai per la card inline, posizionala SOTTO il
  ScreenHeader e SOPRA il primo blocco di contenuto della Home.

Commit: `feat(sport): discoverability bounce + callout + onboarding toast su Home`

────────────────────────────────────────────────────────────────
STEP 5B — ModeTransitionOverlay (splash di transizione)
────────────────────────────────────────────────────────────────

Crea **src/components/sport/ModeTransitionOverlay.tsx**:

Comportamento:
- Quando `appMode` cambia (rilevato via useAppSettings), copre
  l'intero schermo con un overlay opaco per ~700ms totali:
  - 200ms fade-in opacity 0 → 1 (background = colore della
    modalità di DESTINAZIONE: bianco diet, sportColors.accent
    sport).
  - 300ms hold con il logo/wordmark al centro.
  - 200ms fade-out opacity 1 → 0.
- Non blocca le interazioni: `pointerEvents="none"` quando
  invisibile, `pointerEvents="auto"` durante l'animazione.

Layout dell'overlay:
- Contenitore Animated.View, fullscreen
  (`StyleSheet.absoluteFillObject`).
- Al centro:
  - Modalità destinazione = sport: testo grande
    `APP_NAME_SPORT` ("FitTrack") in bianco, sotto un
    sottotitolo piccolo "Modalità sport". Eventuale icona
    `bolt` (white) sopra.
  - Modalità destinazione = diet: testo grande "FatTrack"
    in `colors.text`, sotto "Modalità dieta". Background
    `colors.bg`.
- ASSET: l'utente NON ha ancora fornito i loghi definitivi
  (vedi PLAN.md §5B + Q6 di "Open questions"). Per ora usa
  SOLO testo (typography.h1 o display, scale custom 38-44px) +
  icona inline. Quando l'asset arriverà, sarà un piccolo
  refactor.

Implementazione:
```tsx
type Props = { mode: AppMode };

export function ModeTransitionOverlay({ mode }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [renderMode, setRenderMode] = useState<AppMode | null>(null);
  const prevModeRef = useRef<AppMode>(mode);

  useEffect(() => {
    if (mode === prevModeRef.current) return;
    prevModeRef.current = mode;
    setRenderMode(mode); // mostra la "faccia" della destinazione
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setRenderMode(null));
  }, [mode, opacity]);

  if (renderMode === null) return null;

  const isSport = renderMode === 'sport';
  const bg = isSport ? sportColors.accent : colors.bg;
  const txt = isSport ? '#FFFFFF' : colors.text;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        styles.overlay,
        { opacity, backgroundColor: bg },
      ]}
    >
      {isSport ? <Icon name="bolt" size={48} color={txt} /> : null}
      <Text style={[styles.brand, { color: txt }]}>
        {isSport ? APP_NAME_SPORT : 'FatTrack'}
      </Text>
      <Text style={[styles.subtitle, { color: txt }]}>
        {isSport ? 'Modalità sport' : 'Modalità dieta'}
      </Text>
    </Animated.View>
  );
}
```

Monta l'overlay in **App.tsx**, sopra `RootNavigator` MA sotto
`SafeAreaProvider` (così copre anche la status area). Devi
leggere `appMode` da `useAppSettings` qui — il provider lo
permette perché App.tsx è sopra qualsiasi navigator.

```tsx
function AppContent() {
  const { appMode } = useAppSettings();
  return (
    <>
      <RootNavigator />
      <ModeTransitionOverlay mode={appMode} />
    </>
  );
}

export default function App() {
  // ... existing setup
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ToastProvider>
          <ActiveSessionProvider>
            <StatusBar style="dark" />
            <AppContent />
          </ActiveSessionProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

NB: lo StatusBar style="dark" stride col background bianco diet
ma con l'overlay arancio sport (durante 700ms) potrebbe risultare
poco leggibile. È un compromesso accettabile per la Fase 5;
ottimizzazione per il futuro: switchare dynamicamente
`<StatusBar style={isSport ? 'light' : 'dark'} />`. NON farlo
ora: l'overlay è breve e durante il fade non si vede comunque
la status bar.

Commit: `feat(sport): ModeTransitionOverlay con cross-fade e wordmark`

────────────────────────────────────────────────────────────────
STEP 5C — Onboarding sport + weeklyTarget configurabile
────────────────────────────────────────────────────────────────

Due piccole feature finali:

**1) Onboarding card sport** — solo per utenti nuovi (mai
allenato, nessuna scheda non-preset).

Modifica **src/screens/sport/SportHomeScreen.tsx**:
- Aggiungi un fetch per il count: `const [showOnboarding,
  setShowOnboarding] = useState(false);` e nel useEffect
  iniziale chiama:
  ```ts
  Promise.all([
    sessionsDB.getAllSessions(),
    workoutsDB.getAllWorkouts(),
  ]).then(([sessions, workouts]) => {
    const userWorkouts = workouts.filter(w => !w.isPreset);
    setShowOnboarding(sessions.length === 0 && userWorkouts.length === 0);
  });
  ```
- Quando `showOnboarding === true`, renderizza una Card SOPRA
  le 3 card esistenti (Allenamento di oggi / Settimana /
  Ultimo allenamento):
  ```tsx
  <Card>
    <Icon name="dumbbell" /> Benvenuto in modalità Sport
    <Text>Inizia da una scheda preset (Full Body, PPL, Mobilità)
      o crea la tua dal tab Schede.</Text>
    <View row gap>
      <Button label="Esplora preset" onPress={() => navigation.navigate('Workouts')} />
      <Button variant="secondary" label="Esercizi" onPress={() => navigation.navigate('Exercises')} />
    </View>
  </Card>
  ```
- La card scompare automaticamente non appena l'utente
  completa una sessione o crea una scheda (perché il
  controllo è basato su DB count, e useSportStats reload-a
  alla chiusura sessione).

**2) WeeklyTarget configurabile**.

Modifica **src/database/db.ts**: aggiungi colonna
idempotente a `app_settings`:
```sql
ALTER TABLE app_settings ADD COLUMN weekly_target_days INTEGER NOT NULL DEFAULT 4
```
Wrap nel try/catch come gli altri (riga ~127 del db.ts, già
c'è il pattern).

Aggiorna anche il CREATE TABLE inline per consistenza con i
DB nuovi:
```sql
CREATE TABLE IF NOT EXISTS app_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  app_mode TEXT NOT NULL DEFAULT 'diet' CHECK (app_mode IN ('diet','sport')),
  sport_mode_seen INTEGER NOT NULL DEFAULT 0,
  weekly_target_days INTEGER NOT NULL DEFAULT 4,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Modifica **src/database/appSettingsDB.ts**:
- Aggiungi `weeklyTargetDays: number` al type `AppSettings`.
- Aggiorna SELECT columns (`weekly_target_days AS weeklyTargetDays`).
- Aggiungi funzione `setWeeklyTarget(days: number): Promise<AppSettings>`.

Modifica **src/hooks/useAppSettings.ts**:
- Esponi `weeklyTargetDays` e `setWeeklyTarget` nel result type.

Modifica **src/hooks/useSportStats.ts**:
- Sostituisci `WEEKLY_TARGET_DAYS = 4` hardcoded con la lettura
  da `useAppSettings().weeklyTargetDays`. La costante può
  essere rimossa.
- `WeekStats.weeklyTarget` viene popolato dal valore corrente
  del setting.

Modifica **src/screens/sport/SportSettingsScreen.tsx**:
- Aggiungi una nuova Card "Obiettivo settimanale" sopra a
  quella esistente "Modalità app":
  - Label "Giorni di allenamento target".
  - Stepper o segmented control [1, 2, 3, 4, 5, 6, 7].
    Suggerimento: 7 button tondi orizzontali in flex-row,
    selezionato → background accent del theme, altrimenti
    border + testo.
  - Caption sotto: "La dashboard mostrerà i progressi
    rispetto a questo obiettivo.".
- Tap su un valore → `setWeeklyTarget(n)` → la Home si
  aggiorna automaticamente al prossimo render (perché
  useAppSettings è uno store condiviso).

Commit: `feat(sport): onboarding card per nuovi utenti + weeklyTarget configurabile`

────────────────────────────────────────────────────────────────
Vincoli operativi
────────────────────────────────────────────────────────────────

- Italiano per tutti i testi UI e label visibili. Inglese per
  nomi di variabili, funzioni, type, file.
- Solo i token/primitives di src/theme + componenti in
  src/components/: niente hex inline (a parte i `#FFFFFF` per
  il testo bianco sull'overlay arancio, accettabile come
  costante di leggibilità su accent fisso), niente librerie
  UI esterne.
- Alias `@/` per gli import.
- expo-sqlite async API; ALTER TABLE idempotente via try/catch.
- NIENTE notifiche locali / suoni / haptic / lib di
  animazione esterne (Reanimated non è necessaria, Animated
  della stdlib è sufficiente per bounce e fade).
- NON toccare: settings.json, hook git, CI/CD, package.json.
- NON modificare gli altri schermi (a parte HomeScreen diet
  per il toast/banner onboarding, SportHomeScreen per la card
  benvenuto, SportSettingsScreen per il target). NON toccare
  i flussi sessione/workouts.
- NON aprire PR. Solo push del branch.
- Se trovi una decisione ambigua, fai una AskUserQuestion solo
  se è davvero bloccante. Altrimenti decidi col default più
  semplice e annota nel body del commit.

────────────────────────────────────────────────────────────────
Verifica finale (smoke test, prima del push)
────────────────────────────────────────────────────────────────

1. `npm run typecheck` pulito.
2. Reset DB (Settings diet → "Reset DB"). Cold start: la Home
   diet mostra il toast/banner "Nuova modalità Sport · Tieni
   premuto Home"; l'icona Home della tab bar bouncia in loop
   con callout "Tieni premuto" sopra. Quando tieni premuto
   Home → l'overlay di transizione fade-in con wordmark
   "FitTrack" arancio + sottotitolo "Modalità sport" → fade-out
   → atterri nella Home sport. Bounce, callout e toast sono
   spariti. Ritorni a diet (long-press Home) → vedi overlay
   "FatTrack · Modalità dieta" → atterri in diet. Niente più
   bounce/callout/toast (sportModeSeen è ora true).
3. Reset DB di nuovo. Cold start sport mode (long-press subito):
   nella Home sport vedi la card "Benvenuto in modalità Sport"
   con i due bottoni. Tap "Esplora preset" → atterri su Schede.
4. Avvia + completa una sessione di allenamento. Torna in
   Home: la card "Benvenuto" è SCOMPARSA (perché ora hai
   sessioni > 0).
5. SportSettings → "Obiettivo settimanale" → cambi target da 4
   a 6. Torna in Home: il ring "Settimana" mostra ora target 6
   (consumed/6 invece di consumed/4).

Procedi.
```

---

## Note operative per chi avvia la sessione

- **Verifica preliminare**: `main` con Phase 4 (PR #55).
  Verifica con
  `git log --oneline | grep "feat(sport)" | head -3`. Devi
  vedere `SportHistoryScreen + SessionDetailModal`,
  `SportHomeScreen dashboard`, `ExercisesScreen con filtri`.
- **node_modules**: `npm ci` come fallback.
- **Tempi attesi**: 3 commit, ognuno S-M effort. Stima ~2-3h
  totali. Step 5A potenzialmente più tedioso (decisione
  toast persistente vs banner inline + animazione bounce con
  cleanup corretto del loop).
- **Testing manuale**: critico per validare timing dell'overlay
  e visibility del bounce. Senza device, lo smoke test è solo
  `typecheck` + ispezione codice.

## Cosa NON includere nel prompt (volutamente fuori scope di Fase 5)

- Asset grafici "FitTrack" definitivi (li fornirà l'utente
  separatamente, dopo il merge di questa fase). Lo step 5B usa
  un placeholder testuale; quando arrivano gli asset SVG/PNG,
  sarà un piccolo Edit point.
- Notifiche locali / suoni di fine recupero (TODO futuro).
- Spotify (out of scope dichiarato).
- Database esterni di esercizi (TODO futuro).
- Backup/restore esteso al sport mode (i preferiti sport e le
  sessioni dovrebbero essere inclusi nel backup di
  `dbBackup.ts` — TODO da aggiungere alla fine della fase).
- Modifiche a `app.json`, `package.json`, `eas.json`,
  `setup.bat`.
- Aggiunta di librerie nuove (Reanimated, expo-haptics, ecc.).
- Apertura di PR / merge / delete branch.
- Refactor del CLAUDE.md per documentare l'intera modalità
  sport (verrà fatto in un commit separato dopo il merge di
  Fase 5, quando l'API completa è stabile).

## Dopo Fase 5 (post-progetto sport mode)

Una volta mergeata Fase 5, due commit di follow-up restano da
fare separatamente (NON inclusi in questo prompt):

1. **`docs(claude): documenta modalità Sport nel CLAUDE.md`** —
   estensione della sezione 2 con l'architettura sport
   (ThemeContext, due navigator, ActiveSessionProvider, lista
   tabelle DB sport). Lo farà l'owner o in una sessione
   esplorativa dedicata.

2. **`chore(todo): aggiungi voci backlog post-sport mode`** —
   le voci promosse da "Open questions" del PLAN.md a TODO
   reale: video URL veri, notifiche locali, suoni, Spotify,
   DB esterni esercizi, backup/restore con tabelle sport,
   asset wordmark FitTrack, weeklyTarget bounds (1-7
   validation), eventuali bounds simili.
