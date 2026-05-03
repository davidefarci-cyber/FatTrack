# Prompt sessione operaia — UX Polish C3.1 (redesign tab Timer → Tabata)

> **Pre-requisiti**: branch `main` aggiornato (HEAD `2389151` o successivo,
> dopo merge C1+C2 + apertura voci [35] [36] [37]).
> Branch atteso per questa sessione: `claude/ux-polish-tabata-redesign`.
> Voci TODO chiuse al merge: [35].
> Effort stimato: ~5-7h.
>
> **Pre-requisito esterno proprietario**: file
> `assets/sounds/countdown-tick.mp3` deve esistere PRIMA del lancio
> (durata ~100-200ms, suono "tick"/"beep" sintetico CC0). L'audio è
> requisito hard del countdown 5→1 (decisione di prodotto già presa,
> niente fallback solo-haptic). Se il file manca al lancio, la
> sessione si ferma con messaggio chiaro all'utente.

Trasformazione del tab `Timer` in `Tabata`: da utility generica
multi-modalità a esperienza dedicata al protocollo HIIT con treatment
"brochure premium". Output del brainstorming
`docs/ux-polish/BRAINSTORM_C3_TABATA.md` (decisioni di prodotto già
prese — l'operaia esegue, non rimette in discussione).

---

## Prompt da incollare

```
Sei in /home/user/FatTrack su branch main aggiornato.

Implementa la SESSIONE C3.1 di "UX Polish": redesign del tab
Timer → Tabata. Sette commit logici, in ordine.

PRIMA DI INIZIARE:

a) Verifica che `assets/sounds/countdown-tick.mp3` esista. Se
   manca → STOP, segnala all'utente che è prerequisito hard e
   che la sessione si ferma. NON tentare di crearlo o cercare
   alternative (audio è requisito esplicito del proprietario,
   senza solo-haptic non basta).
b) Leggi nell'ordine:
   1. CLAUDE.md — vincoli stilistici (design system, no nuove
      lib UI, StyleSheet + tokens, italiano nei testi).
   2. docs/ux-polish/BRAINSTORM_C3_TABATA.md — IL DOCUMENTO
      SORGENTE. Le decisioni nelle sezioni 2 e 3 sono PRESE.
      Le sezioni 4 ("Domande aperte") sono già state dirimite
      qui sotto, non rimetterle in discussione.
   3. docs/TODO.md voce [35] per il contesto utente.
   4. src/screens/sport/TimerScreen.tsx (491 righe) — la
      schermata corrente. Va sostanzialmente riscritta.
      RIUSA però la logica runtime di avanzamento intervalli
      (`advanceInterval`, `RunningView`, `formatSeconds`,
      gestione di pausa/reset, `useEffect` di tick) —
      copia-incolla nei nuovi file dove servono. NON
      ridisegnare la logica di esecuzione del workout (lo
      scope di [37], non di questa).
   5. src/components/WheelPicker.tsx — primitive disponibile
      da C1 per la schermata di config.
   6. src/database/db.ts (linee 122 e 247) — pattern di CREATE
      TABLE + ALTER TABLE idempotente per `weekly_target_days`.
      Copialo per le 3 colonne tabata_*.
   7. src/database/appSettingsDB.ts (linee 21, 85) — pattern di
      mapping AS + setter dedicato.
   8. src/utils/haptics.ts — già espone successHaptic,
      lightHaptic. Usali.
   9. src/components/sport/RestTimer.tsx — pattern di
      `describeArc` SVG (helper riusabile per il glow del
      pulsante hold-to-start).

API e file disponibili (riusa, NON ricreare):

- @/components/WheelPicker (da C1).
- @/utils/haptics: lightHaptic / successHaptic.
- @/database/appSettingsDB: pattern get/set + cache.
- react-native-svg: già presente, usato per CalorieRing e
  RestTimer.
- @/theme: colors, spacing, radii, typography. Niente magic
  numbers.
- useAppTheme(): per `accent` (arancio sport).

Crea il branch:

  git checkout main
  git pull --ff-only origin main
  git checkout -b claude/ux-polish-tabata-redesign

I 7 step sotto, una alla volta, con commit separato per
ognuno. Dopo ogni commit: `npm run typecheck` deve passare.
Se la prima volta `node_modules` manca, fai `npm ci`.

Dipendenza nuova autorizzata: `expo-av` (solo step C3.1.4 per
audio countdown). Niente altre lib.

Niente PR: alla fine fai solo `git push -u origin
claude/ux-polish-tabata-redesign`. Sarò io a decidere il merge.

────────────────────────────────────────────────────────────────
STEP C3.1.1 — DB schema: 3 colonne app_settings.tabata_*
────────────────────────────────────────────────────────────────

Modifica **src/database/db.ts**:

- CREATE TABLE app_settings (cerca linea ~122): aggiungi 3
  righe dopo `weekly_target_days`:
  ```sql
  tabata_work_sec INTEGER NOT NULL DEFAULT 20,
  tabata_rest_sec INTEGER NOT NULL DEFAULT 10,
  tabata_rounds INTEGER NOT NULL DEFAULT 8,
  ```
- Migrate idempotente (cerca linea ~247): aggiungi 3 ALTER
  TABLE nel try/catch, stesso pattern di `weekly_target_days`:
  ```ts
  `ALTER TABLE app_settings ADD COLUMN tabata_work_sec INTEGER NOT NULL DEFAULT 20`,
  `ALTER TABLE app_settings ADD COLUMN tabata_rest_sec INTEGER NOT NULL DEFAULT 10`,
  `ALTER TABLE app_settings ADD COLUMN tabata_rounds INTEGER NOT NULL DEFAULT 8`,
  ```

Modifica **src/database/appSettingsDB.ts**:

- Aggiungi al SELECT (linea ~21) le mapping:
  ```sql
  tabata_work_sec AS tabataWorkSec,
  tabata_rest_sec AS tabataRestSec,
  tabata_rounds AS tabataRounds,
  ```
- Aggiorna il tipo `AppSettings` con `tabataWorkSec: number`,
  `tabataRestSec: number`, `tabataRounds: number`.
- Aggiungi setter:
  ```ts
  export async function setTabataConfig(config: {
    workSec: number;
    restSec: number;
    rounds: number;
  }): Promise<AppSettings> { ... }
  ```
  che fa un singolo UPDATE con i 3 campi + `updated_at = datetime('now')`.

Modifica **src/hooks/useAppSettings.ts**:

- Espone `tabataWorkSec`, `tabataRestSec`, `tabataRounds`,
  `setTabataConfig`.

Smoke test mentale:
- Clean install → primo accesso → app_settings ha
  tabata_work_sec=20, tabata_rest_sec=10, tabata_rounds=8 di
  default.
- Upgrade da versione vecchia → ALTER TABLE applica le 3
  colonne con default, niente perdita dati.
- `setTabataConfig({ workSec: 25, restSec: 15, rounds: 6 })` →
  riavvio app → valori persistiti.

Commit:

  feat(sport): app_settings.tabata_work_sec/rest_sec/rounds (config Tabata persistita)

  Aggiunge 3 colonne nel singleton app_settings per persistere
  la config Tabata personalizzata dell'utente. Default
  20/10/8 (protocollo Tabata classico). ALTER TABLE
  idempotenti con stesso pattern di weekly_target_days.
  appSettingsDB espone setTabataConfig come singolo UPDATE
  atomico. useAppSettings espone i 3 valori + il setter.

  Parte di TODO [35].

────────────────────────────────────────────────────────────────
STEP C3.1.2 — Primitive HoldToStartButton
────────────────────────────────────────────────────────────────

Crea **src/components/sport/HoldToStartButton.tsx**:

```ts
type HoldToStartButtonProps = {
  onConfirm: () => void;
  holdDurationMs?: number;     // default 2000
  label?: string;              // default "Avvia"
  size?: number;               // default 160 diametro
  accent: string;
  disabled?: boolean;
};
```

Comportamento:
- Pressable circolare (borderRadius = size/2), background
  `accent`, label centrale in `typography.h1` o `value` color
  `colors.bg` (testo bianco su accent).
- onPressIn:
  - Avvia un'animazione di "fill" SVG: arco che cresce dal top
    (-90°) in senso orario fino a 360° in `holdDurationMs`.
    Usa l'helper `describeArc` (copialo da RestTimer.tsx
    inline qui o estraine uno utility shared in `src/utils/svgArc.ts`
    se ti pare cleaner — entrambe vanno bene).
  - Avvia un setTimeout di `holdDurationMs` che chiama
    `onConfirm()` + `successHaptic()`.
  - Tick haptic light ogni 500ms come feedback "sta caricando"
    (lightHaptic). Stop al completamento o all'annullamento.
- onPressOut:
  - Se prima di `holdDurationMs` → cancella il setTimeout,
    reset dell'animazione a 0, NIENTE chiamata a `onConfirm`.
  - Se già confermato → no-op.

Layout SVG:
- `<Svg>` overlay sopra il bottone, dimensione = size+8 (per
  contenere lo strokeWidth fuori dal cerchio).
- Path arc di stroke `accent` ma più chiaro (es. opacity 0.6)
  + glow effect via `shadowColor: accent` + `shadowOpacity`
  che cresce con la progressione.
- Strokewidth ~6px.

Tipografia: la label scala leggermente (transform.scale 1.0 →
0.95 quando held) per dare feedback "premi più forte".

Accessibility:
- `accessibilityRole="button"`,
  `accessibilityLabel={\`${label} — tieni premuto per ${holdDurationMs/1000} secondi\`}`,
- `accessibilityHint="Tieni premuto per confermare l'avvio."`.
- Per screen reader, supporta anche tap singolo come fallback?
  NO: il proprietario vuole esplicitamente hold-to-confirm. Lo
  screen reader vede comunque la label che spiega il pattern.

Smoke test mentale:
- Tap rapido → niente succede (rilascio prima dei 2s).
- Hold 2s → arco si riempie, glow cresce, haptic ogni 500ms,
  a 2s exact: success haptic + onConfirm.
- Hold 1.5s poi rilascio → arco torna a 0, niente onConfirm.

Commit:

  feat(sport): nuovo primitive HoldToStartButton (hold-to-confirm 2s con glow)

  Pulsante circolare con animazione di conferma "tieni
  premuto": arco SVG che si riempie da -90° fino a 360° in
  holdDurationMs (default 2000), glow accent crescente,
  haptic tick ogni 500ms + success haptic alla conferma.
  Rilascio prematuro annulla. Vive in src/components/sport/
  perché il use case è specifico Tabata; se altri tab lo
  riusano in futuro lo promuoveremo a src/components/.

  Parte di TODO [35].

────────────────────────────────────────────────────────────────
STEP C3.1.3 — Primitive CountdownOverlay
────────────────────────────────────────────────────────────────

Crea **src/components/sport/CountdownOverlay.tsx**:

```ts
type CountdownOverlayProps = {
  visible: boolean;
  from?: number;          // default 5 → conta 5,4,3,2,1
  onComplete: () => void;
  accent: string;
  onTick?: (n: number) => void; // chiamato a inizio di ogni
                                // numero (per audio + haptic)
};
```

Comportamento:
- Modal fullscreen (`<Modal animationType="fade" transparent={false} visible={visible}>`).
- Background: `accent` saturo (color sport).
- Numero centrale in `typography.display` (xxxl) o più grande
  ancora (custom 120-180px), color `colors.bg` (bianco su
  accent).
- Animazione per ogni numero (1 secondo per ciclo):
  - 0-200ms: scale 0.3 → 1.5, opacity 0 → 1 (fade in espansivo)
  - 200-900ms: hold scale 1.5 → 1.0, opacity 1 (lieve compressione)
  - 900-1000ms: scale 1.0 → 1.7, opacity 1 → 0 (fade out espansivo)
- A inizio di ogni numero (t=0 del ciclo), chiama
  `onTick(currentNumber)` PRIMA dell'animazione. Il consumer
  userà questo per audio + haptic.
- Sequenza: 5 → 4 → 3 → 2 → 1 → poi `onComplete()`. NON mostra
  "0" o "GO" (decisione di prodotto: il countdown finisce a 1
  e poi parte direttamente la fase work).
- Total durata: 5 secondi (5 cicli da 1s).
- Usa `Animated.Value` + `Animated.parallel` + `Animated.sequence`
  built-in (niente reanimated).
- Su `visible=false` durante un countdown in corso: cancel del
  loop + reset a 0. Non chiamare `onComplete`.

Smoke test mentale:
- visible toggla a true → "5" appare con animazione, dopo 1s
  scompare e appare "4", e così via fino a "1", poi
  onComplete.
- onTick chiamato all'apertura di ognuno dei 5 numeri.
- Toggle a false a metà → cancellazione pulita.

Commit:

  feat(sport): nuovo primitive CountdownOverlay (5→1 fullscreen accent)

  Modal fullscreen con sequenza animata 5→4→3→2→1 (1s ciascuno),
  numero centrale che scala da 0.3 a 1.5 a 1.0 a 1.7 con fade,
  background accent saturo. Prop onTick chiamato all'inizio di
  ogni numero per audio + haptic gestiti dal consumer. Built su
  Animated.Value built-in, niente reanimated.

  Parte di TODO [35].

────────────────────────────────────────────────────────────────
STEP C3.1.4 — expo-av + utility audio countdown
────────────────────────────────────────────────────────────────

Aggiungi expo-av:

  npm install expo-av

In **app.json**:
- Niente plugin necessario (expo-av non ha config plugin
  obbligatoria). Verifica però che sound playback funzioni
  con il volume "media" Android (di default sì).

Crea **src/utils/countdownSound.ts**:

```ts
import { Audio } from 'expo-av';

let cachedSound: Audio.Sound | null = null;

async function getSound(): Promise<Audio.Sound | null> {
  if (cachedSound) return cachedSound;
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('../../assets/sounds/countdown-tick.mp3'),
    );
    cachedSound = sound;
    return sound;
  } catch (err) {
    console.warn('countdown-tick.mp3 not found or unplayable', err);
    return null;
  }
}

export async function playCountdownTick(): Promise<void> {
  const sound = await getSound();
  if (!sound) return;
  try {
    await sound.replayAsync();
  } catch {
    // ignore
  }
}

export async function unloadCountdownSound(): Promise<void> {
  if (cachedSound) {
    await cachedSound.unloadAsync().catch(() => {});
    cachedSound = null;
  }
}
```

Note implementative:
- `replayAsync` riavvia il file dall'inizio anche se è già in
  riproduzione → permette di triggerare 5 tick consecutivi.
- Cache globale: il sound viene caricato una volta e tenuto
  in memoria per tutta la durata della app. È piccolo (~5KB).
- `unloadCountdownSound` è opzionale: chiama prima di
  destrurre il TabataScreen se vuoi liberare memoria. Per ora
  NON chiamarlo: tenere in cache è ok.

Commit:

  feat(sport): aggiungi expo-av + utility audio per countdown Tabata

  Nuova dipendenza expo-av per riproduzione audio. Helper
  src/utils/countdownSound.ts che carica
  assets/sounds/countdown-tick.mp3 con cache globale e espone
  playCountdownTick (riproducibile in serie veloce). Audio è
  requisito esplicito del proprietario per il countdown 5→1
  (decisione di prodotto, niente fallback solo-haptic).

  Parte di TODO [35].

────────────────────────────────────────────────────────────────
STEP C3.1.5 — Schermata config Tabata (modal con WheelPicker)
────────────────────────────────────────────────────────────────

Crea **src/components/sport/TabataConfigModal.tsx**:

Pattern: Modal fullscreen-ish (90% altezza tipo BottomSheet
alto), header con titolo + back/save, 3 WheelPicker con label.
Coerente con altri Modal sport (es. WorkoutEditorModal).

Props:
```ts
type TabataConfigModalProps = {
  visible: boolean;
  onClose: () => void;
  initialConfig: { workSec: number; restSec: number; rounds: number };
  onSave: (config: { workSec: number; restSec: number; rounds: number }) => void;
};
```

Layout:
- Header: titolo "Personalizza il tuo Tabata" in
  `typography.h1`, sotto sottotesto in `typography.caption`:
  "I valori vengono salvati per le prossime sessioni."
- 3 WheelPicker affiancati:
  - workSec: min 5, max 300, step 5, suffix "sec"
  - restSec: min 5, max 300, step 5, suffix "sec"
  - rounds: min 1, max 30, step 1, suffix "round"
- Sopra ogni picker: label `typography.label` ("Lavoro",
  "Recupero", "Round").
- Sotto i picker: una piccola Card riassuntiva che mostra il
  totale: "Durata totale: {(workSec+restSec)*rounds}/60} min
  {(...) % 60} sec". Riassume al volo cosa viene fuori dalla
  config.
- Bottone "Salva" prominente in fondo, color accent. onPress:
  chiama `onSave(config)` poi `onClose()`. La persistenza DB
  la fa il consumer (TabataHome) chiamando `setTabataConfig`.
- Bottone "Annulla" o icona X in alto a sx: chiude senza
  salvare.

Stato interno: 3 useState per workSec/restSec/rounds
inizializzati da `initialConfig`. Su apertura nuova del modal,
resync con `initialConfig` (props change effect).

Smoke test mentale:
- Apri modal con config 20/10/8 → 3 picker centrati su quei
  valori, riepilogo "Durata totale: 4 min 0 sec".
- Sposto rounds a 10 → riepilogo aggiorna a "5 min 0 sec".
- Tap "Salva" → onSave chiamato, modal si chiude.
- Riapri → di nuovo 20/10/8 (perché useEffect resync con
  initialConfig).

Commit:

  feat(sport): TabataConfigModal con WheelPicker e durata totale

  Modal di personalizzazione del Tabata: 3 WheelPicker
  (Lavoro / Recupero / Round) con range coerenti a quanto
  fatto in C1, riepilogo durata totale calcolato in tempo
  reale. Bottone Salva chiama onSave + onClose. La
  persistenza DB la fa il consumer (TabataHome).

  Parte di TODO [35].

────────────────────────────────────────────────────────────────
STEP C3.1.6 — Riscrittura TimerScreen → TabataScreen + InfoSheet
────────────────────────────────────────────────────────────────

Riscrivi **src/screens/sport/TimerScreen.tsx** trasformandolo
in **TabataScreen** (puoi rinominare il file in
`TabataScreen.tsx` e aggiornare gli import; oppure tenere il
nome file e cambiare solo il default export name — entrambe
ok, scegli quella che lascia diff più puliti. Suggerimento:
RINOMINA il file per chiarezza, è un cambio semantico grosso).

Layout della home (top to bottom):

a) **ScreenHeader**:
   - title: "Tabata"
   - left slot: icona `cog` → apre `TabataConfigModal`.
   - right slot: icona `info` → apre `TabataInfoSheet` (nuovo
     componente, sotto).

b) **Hero** (Card o View senza Card per leggerezza):
   - Titolo grande in `typography.h1` color `colors.text`:
     "Benvenuto nel circuito Tabata"
   - Sottotitolo (max 3 righe) in `typography.body` color
     `colors.textSec`:
     «4 minuti di allenamento ad alta intensità che valgono
     come 30 di cardio. Otto round di lavoro esplosivo
     intervallati da brevi recuperi: tra i protocolli più
     efficienti per fitness cardiorespiratorio e capacità
     anaerobica.»
   - Margine inferiore generoso prima delle stat-card.

c) **Stat-card row** (3 card affiancate, 33% larghezza
    ciascuna, gap spacing.sm):
    - Card 1: numero grosso "4 min" + label sotto "totali"
    - Card 2: numero grosso "+28%" + label sotto "capacità anaerobica*"
    - Card 3: numero grosso "+14%" + label sotto "VO₂max*"
    - Numeri in `typography.value` color `accent`.
    - Footnote piccola in `typography.micro` sotto le card:
      "*Studio Tabata et al., 1996 — 5 sessioni/sett. per 6
      settimane"

d) **Riepilogo configurazione corrente** (Card piccola):
    - "La tua config: {workSec}s lavoro · {restSec}s recupero
      · {rounds} round" — `typography.caption`
    - "Durata totale: {minutes}m {seconds}s" — accent
    - Tap → apre TabataConfigModal (alternativa al cog header)

e) **HoldToStartButton** centrato in basso, label "Avvia".

Logica del flow di start:

```ts
const [overlayVisible, setOverlayVisible] = useState(false);
const [running, setRunning] = useState(false); // diventa true
                                               // dopo countdown
const [intervalState, setIntervalState] = useState<...>(null);

const handleConfirmStart = () => {
  setOverlayVisible(true);
};

const handleCountdownComplete = () => {
  setOverlayVisible(false);
  // Inizia il workout: imposta intervalState al primo round
  // di "work", tick parte, ecc. (RIUSA la logica esistente).
  setRunning(true);
  setIntervalState({
    phase: 'work',
    round: 1,
    endsAt: Date.now() + workSec * 1000,
  });
};

const handleTick = (n: number) => {
  void playCountdownTick();
  void lightHaptic();
};
```

Quando `running === true` → mostra la `RunningView` (la stessa
funzione/JSX che oggi vive dentro TimerScreen, copiala
inalterata). Niente restyle qui (vedi TODO [37]).

Crea anche **src/components/sport/TabataInfoSheet.tsx**:

Modal/BottomSheet con il contenuto educativo. Suggerimento di
copy (worker può lievemente raffinare):

> # Cos'è il Tabata
>
> Il Tabata è un protocollo di allenamento HIIT (High-Intensity
> Interval Training) sviluppato dal Dr. Izumi Tabata negli
> anni '90 per la nazionale giapponese di pattinaggio di
> velocità.
>
> Il formato è semplice: **8 round da 20 secondi di lavoro
> all'intensità massima, intervallati da 10 secondi di
> recupero**. In totale, 4 minuti di allenamento.
>
> # Perché funziona
>
> Lo studio originale di Tabata et al. (1996, *Medicine and
> Science in Sports and Exercise*) ha confrontato due gruppi
> di atleti su 6 settimane di allenamento:
> - **Gruppo A**: 60 minuti di cardio steady-state (70% VO₂max),
>   5 volte a settimana.
> - **Gruppo B**: 4 minuti di Tabata, 5 volte a settimana.
>
> Il gruppo B ha mostrato:
> - **+28%** capacità anaerobica
> - **+14%** VO₂max (capacità aerobica)
>
> Il gruppo A ha migliorato l'aerobica ma non l'anaerobica.
>
> # Tabata vero vs HIIT generico
>
> Molti chiamano "Tabata" qualunque allenamento intervallato.
> Il vero Tabata richiede **intensità massimale** (~170% VO₂max,
> al limite del possibile) per ogni round. Senza quella
> intensità, è un HIIT efficace ma non è "Tabata".

Layout: titoli in `typography.h1`/`bodyBold`, paragrafi in
`typography.body`. Pulsante "Chiudi" o swipe-down per chiudere.

Smoke test mentale:
- Apri tab Tabata → vedo brochure + stat card + config
  attuale + bottone Avvia.
- Tap cog → si apre config modal, modifico, salvo → torno e
  riepilogo aggiornato.
- Tap info → si apre InfoSheet con contenuto educativo.
- Hold-to-start 2s → countdown overlay 5,4,3,2,1 con audio +
  haptic per ognuno → al termine parte il workout.
- Pause/resume/reset → comportamento invariato dalla logica
  copiata.

Commit:

  feat(sport): rinomina TimerScreen → TabataScreen con treatment brochure

  Riscrittura completa del tab. Nuovo layout: hero copy +
  stat-card (4 min / +28% capacità anaerobica / +14% VO₂max
  con footnote Tabata 1996), riepilogo config corrente,
  HoldToStartButton centrale. Cog header → TabataConfigModal,
  Info header → TabataInfoSheet con contenuto educativo
  (Izumi Tabata, studio 1996, distinzione vero Tabata vs
  HIIT). Modalità "Libero" e "Intervalli" rimosse dal tab
  (Libero diventa voce TODO [36], Intervalli è ora la config
  persistita). Logica runtime di workout (advanceInterval,
  RunningView) preservata invariata — il restyle è scope di
  TODO [37].

  Chiude TODO [35].

────────────────────────────────────────────────────────────────
STEP C3.1.7 — Wiring tab navigator: rename label "Timer" → "Tabata"
────────────────────────────────────────────────────────────────

Modifica **src/navigation/SportTabNavigator.tsx**:

- Cerca dove viene registrata la Tab.Screen "Timer" e il
  componente associato. Aggiorna:
  - Il `name` della Tab.Screen NON va cambiato (è una
    costante interna che potrebbe essere referenziata da altre
    schermate via `navigation.navigate('Timer')`). Ma verifica
    se quel name è esposto come tipo in
    `src/types/SportTabParamList.ts`:
    - Se `Timer` è il nome del param, rinominalo in `Tabata` e
      cerca tutti i consumer (pochissimi: probabilmente solo
      il navigator stesso).
    - Aggiorna il default export di `TimerScreen.tsx` → ora
      `TabataScreen.tsx`.
- La label visibile in `BottomTabBar.tsx` (cerca `getTabConfig`
  o equivalente — vedi CLAUDE.md riferimento): cambia "Timer"
  → "Tabata".
- L'icona resta `timer`.

Verifica che dopo il rename:
- L'app builda (`npm run typecheck`).
- Aprendo l'app da SportHome → tab "Tabata" è visibile con
  icona invariata.
- Niente reference a "TimerScreen" o stringa "Timer" rimaste
  vagando (`grep -rn "TimerScreen\|'Timer'" src/`).

Smoke test mentale:
- Lancia app in modalità sport → tab bar mostra Timer · Schede
  · Home · Storico · Esercizi → diventa Tabata · Schede ·
  Home · Storico · Esercizi.
- Tap su Tabata → apre la nuova schermata brochure.

Commit:

  feat(sport): rinomina tab Timer → Tabata in SportTabNavigator

  Aggiorna BottomTabBar label, SportTabParamList tipo, default
  export del file ex-TimerScreen (ora TabataScreen). Icona
  invariata (timer è semanticamente coerente con Tabata).

  Parte di TODO [35], pezzo finale.

────────────────────────────────────────────────────────────────
PUSH FINALE
────────────────────────────────────────────────────────────────

  npm run typecheck     # ultima verifica
  git push -u origin claude/ux-polish-tabata-redesign

Riepiloga in chat:
- 7 commit sul branch.
- 1 voce TODO da chiudere al merge: [35].
- Cosa ha senso QA-are manualmente sul device dopo il merge:
  - clean install APK → tab "Tabata" visibile;
  - apri Tabata → vedi brochure;
  - tap cog → modal config → modifico a 25/15/6 → salvo →
    riavvio app → valori persistiti;
  - tap info → InfoSheet con contenuto educativo;
  - hold-to-start 2s → countdown 5,4,3,2,1 con audio+haptic →
    workout parte;
  - hold-to-start 1s poi rilascio → niente succede;
  - pausa/resume/reset durante workout → invariato.

Procedi.
```

---

## Note operative per chi avvia la sessione

- Tempo atteso: ~5-7h. Lo step 6 (riscrittura TimerScreen) è il
  più grosso (~2h da solo).
- Dipendenze nuove introdotte: `expo-av`. Niente lib UI.
- Modifiche allo schema DB: 3 colonne aggiunte a `app_settings`.
  Idempotenti, non rompono backup esistenti.
- Asset richiesto: `assets/sounds/countdown-tick.mp3` (~100-200ms,
  beep). Se manca, la sessione si ferma allo step preliminare.
- Niente provider nuovi in App.tsx.

## Cosa NON includere in questa sessione (scope creep prevention)

- Niente restyle del `RunningView` post-countdown (è scope
  esplicito di TODO [37]).
- Niente modifiche al `BottomTabBar.tsx` oltre alla riga della
  label.
- Niente "Libero" preservato come modalità in TabataScreen — il
  timer pausa standalone è scope di TODO [36] / Sessione C3.2.
- Niente "Intervalli" preservato come segmented option — la
  config è ora il modal dedicato.
- Niente "0" o "GO" finale nel countdown (decisione di prodotto:
  finisce a 1 e parte direttamente il workout).
- Niente migrazione a `react-native-reanimated`.
- Niente edit a CLAUDE.md / ORCHESTRATOR_HANDOFF.md / TODO.md
  (sono dell'orchestratrice).
- Niente nuove icone in `Icon.tsx` se non strettamente necessarie
  (prova prima a riusare `timer`, `cog`, `info`, `play` esistenti).
