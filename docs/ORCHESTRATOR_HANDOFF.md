# FatTrack — Orchestrator Session Handoff

> **Per la sessione orchestratore in arrivo**: questo file è il tuo
> punto di partenza. Leggi prima questo, poi `CLAUDE.md`, poi
> `docs/TODO.md`. Dopodiché sei pronto a operare.
>
> **Ruolo**: tu non implementi feature. Tu **orchestri**: ricevi richieste
> dall'utente, fai review del lavoro fatto da sessioni "operaie" precedenti,
> scrivi i prompt per le prossime sessioni operaie, e tieni allineata la
> documentazione (CLAUDE.md, TODO.md, eventuali piani in `docs/`).
>
> Eccezioni alla regola: piccoli fix ai .md (max ~50 righe), correzione di
> typo nel codice, fix unaria di una riga (es. errorino in fattrack.bat).
> Per qualsiasi cosa più grossa, **scrivi un prompt e fai partire una
> sessione operaia**.

---

## 0. Cosa fare quando l'utente apre questa sessione

1. `git pull --ff-only origin main` per essere sicuro di partire dallo stato
   corrente.
2. Leggi questo file per intero.
3. Leggi `CLAUDE.md` per i vincoli stilistici e architetturali.
4. Scorri `docs/TODO.md` per sapere cosa è schedulato.
5. Saluta l'utente con un breve recap dello **stato corrente** del progetto
   (tipo "Sport mode completato, 8 voci TODO pendenti — la prossima
   logica è [14]") e attendi istruzioni.

---

## 1. Stato del progetto (data handoff: 2026-05-02)

### 1.1 Cosa è in produzione su `main`

- **Diet mode** completo: onboarding, dashboard giornaliera con
  CalorieRing, scanner barcode, libreria food (locale + OpenFoodFacts),
  preferiti, storico settimana/mese, profilo personale separato in
  `ProfileScreen`, backup/restore JSON.
- **Sport mode** completo (Fasi 1-5, 19 commit, ~8270 linee, PR #51-#56):
  - Switch tra modalità via long-press tab Home (~600ms) o toggle Settings.
  - ThemeContext con accent arancio dedicato (`useAppTheme()`).
  - SportTabNavigator con 5 tab: Timer · Schede · Home · Storico · Esercizi.
  - 40 esercizi seedati + 3 schede preset (Full Body Casa / PPL Day 1 /
    Mobilità mattina).
  - Sessione live full-screen con persistenza DB + AppState
    (background/foreground) + banner sticky.
  - Calorie bruciate stimate via MET × peso × ore.
  - Timer standalone (Tabata 20/10×8, intervalli, libero).
  - Dashboard sport con scheda di oggi, settimana (CalorieRing riusato),
    ultimo allenamento.
  - Storico sessioni con SessionDetailModal set-per-set.
  - Polish: bounce + callout + banner "Nuova modalità Sport" su Home diet
    finché `sportModeSeen=false`; ModeTransitionOverlay cross-fade ~700ms;
    onboarding card sport per utenti nuovi; weeklyTarget configurabile.

### 1.2 Tabelle DB attualmente esistenti

**Diet** (vecchie):
- `foods`, `food_servings`, `meals`, `favorites`, `quick_addons`,
  `daily_settings`, `user_profile`

**Sport** (Fasi 1-5):
- `app_settings` (singleton: `appMode`, `sportModeSeen`,
  `weeklyTargetDays`)
- `exercises` (libreria, 40 seedati, libreria custom non ancora editabile
  dall'utente)
- `workouts` + `workout_exercises`
- `sessions` + `session_sets`
- `active_session` (singleton: stato runtime sessione attiva)

### 1.3 Provider montati in `App.tsx`

```
GestureHandlerRootView
└── SafeAreaProvider
    └── ToastProvider
        └── ActiveSessionProvider
            ├── RootNavigator
            │   └── (ThemeProvider mode=appMode)
            │       └── (MainTabNavigator | SportTabNavigator | OnboardingScreen)
            └── ModeTransitionOverlay
```

### 1.4 File chiave per orientarsi

| Argomento | File |
| --- | --- |
| Tema globale | `src/theme/index.ts`, `src/theme/sportMode.ts`, `src/theme/ThemeContext.tsx` |
| Modalità app | `src/database/appSettingsDB.ts`, `src/hooks/useAppSettings.ts` |
| Sessione attiva | `src/contexts/ActiveSessionContext.tsx`, `src/database/sessionsDB.ts` |
| Calorie sport | `src/utils/sportCalories.ts` |
| Backup DB | `src/utils/dbBackup.ts` (⚠️ NON include tabelle sport — vedi TODO [14]) |
| Migrations | `src/database/db.ts` (CREATE TABLE IF NOT EXISTS + ALTER nel try/catch) |
| Piano storico sport | `docs/sport-mode/PLAN.md` |
| Prompt fasi sport | `docs/sport-mode/NEW_SESSION_PROMPT.md` (Fase 1) e `..._PHASE_2.md` … `_PHASE_5.md` |

---

## 2. Workflow standard dell'orchestratore

### 2.1 Pattern: "Fase X completata, passa alla Y"

Caso tipico: l'utente ha fatto partire una sessione operaia con un prompt
che hai scritto, la sessione ha pushato un branch, l'utente l'ha mergeata
su main, ora torna e dice "fase X completata".

Procedura:

1. `git checkout main && git pull --ff-only origin main`
2. `git log --oneline -10` per vedere cosa è arrivato.
3. `git diff --stat <ultimo prompt commit>..HEAD` per il volume del diff.
4. **Review** dei file chiave nuovi/modificati: leggi le API esposte, i
   tipi nuovi, eventuali divergenze dal piano.
5. `npm ci` (se node_modules manca) + `npm run typecheck` → deve passare
   pulito. Se non passa, segnalalo all'utente, NON proseguire con il
   prompt successivo finché non è risolto.
6. Identifica eventuali **deviazioni** dal piano (positive: API extra
   esposte; negative: piano non rispettato). Se positive, sfruttale nel
   prompt successivo. Se negative, decidi se segnalarle prima di
   andare avanti.
7. Scrivi il prompt della fase successiva in
   `docs/<area>/NEW_SESSION_PROMPT_PHASE_<N>.md`. Stile: vedi i prompt
   sport esistenti come template — deve essere self-contained,
   riferire alle API REALI presenti su main (NON quelle pianificate),
   includere vincoli operativi e smoke test.
8. **Commit diretto su main** (decisione del proprietario, vedi sezione
   3.1): `docs(<area>): prompt nuova sessione per Fase <N>`.
9. `git push origin main`.
10. Riassumi all'utente: cosa è stato fatto, cosa farà la nuova sessione,
    stima tempo, scope chiaro.

### 2.2 Pattern: "Voglio fare X" (nuova feature non pianificata)

Risposta breve (2-3 frasi) con valutazione di fattibilità + tradeoff
principale. NON saltare a scrivere codice. Se l'utente conferma,
proponi una struttura a fasi (anche solo 1-2 fasi se la feature è
piccola).

Pattern tipo:
- Esplorazione conversazionale (1-3 turni) per capire scope, decisioni
  di prodotto, vincoli.
- Genera `docs/<area>/PLAN.md` con piano a fasi se la feature è grossa
  (>1 commit di lavoro, o ad alto rischio architetturale).
- Genera `docs/<area>/NEW_SESSION_PROMPT_PHASE_1.md`.
- Aspetta il "via" prima di committare i piani.
- Per le fasi successive: lo stesso pattern di 2.1.

### 2.3 Pattern: "Aggiungi al TODO che X"

Editare `docs/TODO.md` aggiungendo una voce nella sezione corretta
(🔴/🟡/🟢) con il prossimo ID disponibile. Formato standard
documentato in cima al file. Commit separato di tipo
`chore(todo): ...`. Ultima voce aggiunta: [21] (vedi sezione 4 sotto).

### 2.4 Pattern: "Task X completato"

Spostare la voce nella sezione "✅ Fatto" col campo
`Chiusa: YYYY-MM-DD`, NON cancellarla mai.

### 2.5 Pattern: bug report dall'utente

1. Chiedi i dettagli: schermata, passi per riprodurlo, comportamento atteso
   vs effettivo.
2. Investiga (lettura codice + magari `grep`).
3. Se è una sola riga / typo → fixalo direttamente, commit
   `fix(<area>): ...` su main.
4. Se è più grosso → scrivi un piccolo prompt operaio
   `docs/<area>/FIX_<descrizione>.md` con root cause + soluzione + smoke
   test, e fai partire una sessione operaia.

---

## 3. Convenzioni operative dell'orchestratore

### 3.1 Branch e push

- **L'orchestratore committa direttamente su `main`** per i file di
  documentazione, prompt, piccoli fix. Decisione esplicita del
  proprietario (lui mergerà solo i lavori grossi delle sessioni
  operaie). Vedi commit `4b09463` e successivi come riferimento.
- **Le sessioni operaie** lavorano su branch dedicati (`claude/<feature>-<descrizione>`)
  e fanno solo `git push -u origin <branch>`. Niente PR, niente merge.
  Sarà l'utente a mergiarle a mano.
- **Mai** `git push --force` o hook-skip senza chiederlo.
- **Mai** PR (l'utente preferisce gestirle sempre lui).

### 3.2 Stile dei prompt operai

I prompt operai vivono come `.md` self-contained in `docs/<area>/`
(es. `docs/ux-polish/PROMPT_SESSION_X.md`). Struttura standard:

1. **Pre-requisiti** (cosa deve essere mergeato su main).
2. **Branch da creare**.
3. **Prompt da incollare** (blocco di codice ` ``` ... ``` `):
   - Apertura: "Sei in /home/user/FatTrack su branch main aggiornato."
   - Cosa fare in alto livello (1 paragrafo).
   - "PRIMA DI INIZIARE leggi nell'ordine: 1. CLAUDE.md, 2. <piano>, 3. ...".
   - "API e file disponibili" (lista con nomi reali, non pianificati).
   - "Crea il branch ..." + comando `git`.
   - **Steps numerati** (3A, 3B, 3C, …) ognuno con:
     - Cosa creare/modificare (file path).
     - Schema DB con SQL preciso.
     - Layout UI con dettagli.
     - Commit message suggerito.
   - **Vincoli operativi** (italiano, no lib nuove, no PR, …).
   - **Smoke test** (lista numerata di verifica manuale).
   - "Procedi." come ultima riga.
4. **Note operative** per chi avvia la sessione (verifica, tempi attesi,
   testing manuale).
5. **Cosa NON includere** (scope creep prevention).

I prompt sono **monouso**: appena la sessione è mergeata, il file va
cancellato nello stesso commit di chiusura voci TODO (vedi §3.5).
La storia resta in git log per chi vuole riferimento. Per scrivere
nuovi prompt, prendi come template l'ultimo `PROMPT_SESSION_*.md`
ancora vivo in repo (copia uno e adatta).

### 3.3 Stile della comunicazione con l'utente

Dal CLAUDE.md di sistema dell'utente:
- Risposte concise. Una frase per pensiero. Niente filler.
- Italiano per i testi UI/label, ma anche per le tue risposte (l'utente
  preferisce italiano).
- Quando devi prendere una decisione semi-importante, articola tradeoff
  in una tabella o lista corta e proponi un default.
- File reference con `path/file.ts:NN` per facilitare il jump.
- Output di comandi `git` o `typecheck`: solo l'essenziale, non il dump
  completo.
- Niente emoji non richieste.

### 3.4 Verifica preliminare di ogni fase

Prima di scrivere il prompt della fase successiva:
- `npm ci` se serve.
- `npm run typecheck` deve passare. Se fallisce: STOP, segnala
  all'utente.
- Verifica che i file menzionati nel piano esistano davvero.
- Verifica che le API esposte siano coerenti con quanto pianificato.

### 3.5 Cleanup post-merge (convenzione)

Quando una sessione operaia viene mergeata, oltre al pattern §2.1:

- **Cancella** il `PROMPT_SESSION_*.md` corrispondente in
  `docs/<area>/`.
- **Includi** la cancellazione nello stesso commit di chiusura voci
  TODO (`docs: chiudi N voci <area> + cleanup prompt`).

I prompt sono guide one-shot di implementazione, non documentazione
architetturale. Le sessioni nuove non li leggono mai — leggono solo
CLAUDE.md, TODO chiuso, e codice vivo. Mantenerli in repo aggiunge
solo rumore. La storia resta in git log se serve.

---

## 4. Lavori schedulati (backlog operativo)

Fonte canonica: `docs/TODO.md`. Quanto segue è uno snapshot al
2026-05-02 con la **sequenza logica suggerita** + le info che servono
all'utente per dare il via.

### 4.1 🟡 Priorità media (prossimi candidati)

| # | Titolo | Effort | Dipendenze | Pronto a partire? |
| --- | --- | --- | --- | --- |
| [14] | Backup/restore include tabelle sport | M (~2h) | — | ✅ sì |
| [15] | Asset wordmark "FitTrack" definitivi | M | Asset dell'utente | ⏳ trattare SEPARATAMENTE quando arrivano asset |
| [11] | Backup / restore del database utente | L (~4-6h) | — (già base esistente?) | da verificare |

> Aggiornamento 2026-05-03: voci [33] [17] [29] [20] [26] [23] [24]
> [31] [25] [16] [35] [36] chiuse dai batch UX Polish A/B/C1/C2/C3
> (PR #58-#65). Restano in 🟡 le 3 voci sopra.

**Voce [14] (consigliata come primo prossimo lavoro)**:
- Cosa serve all'utente: niente, è autocontenuta.
- Cosa farà la sessione operaia: aggiungere le 7 tabelle sport alla
  lista `TABLES` in `src/utils/dbBackup.ts`, in ordine di dipendenza FK
  per il restore. Bumpare `SCHEMA_VERSION`. Verificare round-trip
  export → reset → import. ~2-3 commit.
- Quando dovrai scrivere il prompt: leggi `dbBackup.ts:22-30` per la
  lista corrente e `db.ts` per l'ordine FK delle tabelle sport.
  Schedula i campi serializzati JSON (workouts.notes,
  exercises.guide_steps) con la stessa logica dei `favorites.items`
  esistente. `active_session` puoi escluderla (è stato runtime).

**Voce [15] (in attesa di asset)**:
- Cosa serve all'utente: produrre/fornire l'SVG o PNG del logo
  "FitTrack" e "FatTrack" da droppare in `assets/sport-splash/`. Una
  variante per modalità basta (le 2 facce hanno background diverso
  che gestiamo via codice).
- Cosa farà la sessione: sostituire il blocco `<Text>+<Icon>` in
  `src/components/sport/ModeTransitionOverlay.tsx` con `<SvgUri>` da
  react-native-svg (lib già presente). ~1 commit, ~30 minuti.
- NON parta finché l'asset non è in repo. Se l'utente chiede prima:
  "Serve prima l'asset SVG/PNG, fammi sapere quando l'hai droppato in
  `assets/sport-splash/` e parto col prompt".

### 4.2 🟢 Priorità bassa

| # | Titolo | Effort | Note |
| --- | --- | --- | --- |
| [8] | Persistere consenso REQUEST_INSTALL_PACKAGES | S | Diet, autonomo |
| [9] | Pre-release env (canale preview) | M | Build/infra |
| [10] | Cache aggressiva fetch versione | S | Diet, autonomo |
| [13] | Foto profilo (avatar reale) | M | Diet, profilo |
| [16] | Notifiche locali fine recupero (sport) | M | Aggiunge expo-notifications |
| [17] | Haptic feedback su set/recupero (sport) | S | Aggiunge expo-haptics |
| [18] | Video URL veri esercizi | M | Lavoro contenutistico (~40 link) |
| [19] | DB esterno esercizi | L | Espansione massiccia, ~10MB asset |
| [20] | Spotify integration (deep-link MVP) | S/L | MVP via Linking semplice |
| [21] | CHECK constraint weekly_target_days | S | DB migration |
| [22] | Conta pizze (easter egg) | S | Pagina scherzosa, long-press storico |
| [23] | Swipe orizzontale cambio giorno (diet) | S | UX home diet |
| [25] | Polish RestTimer (+30s, bip 5s, pie chart) | M | Sinergia con [16]/[17] |
| [26] | Categorizzare esercizi (SectionList) | S | UX libreria |
| [27] | Illustrazioni esercizi auto-discovered | M | Asset esterni utente |
| [29] | Haptic cambio modalità fit↔fat | S | Aggiunge expo-haptics, sinergia [17] |
| [30] | Pulsante profilo anche in fit | M | Architettura navigation da decidere |
| [31] | TimerScreen wheel picker | M | UX timer, niente lib nuove |
| [32] | +20-30 esercizi curati (MVP prima di [19]) | M | Lavoro contenutistico |

### 4.3 Workflow per affrontare una voce TODO

1. L'utente sceglie quale (o ti chiede consiglio).
2. Tu scrivi il prompt operaio in `docs/<area>/PROMPT_<voce>.md` o
   simile (per le voci sport, sotto `docs/sport-mode/`; per le diet o
   build, sotto `docs/`).
3. Per le voci grosse (L effort): proponi un piano a fasi prima del
   prompt.
4. La voce passa a "in progress" — nel TODO la lasci dove sta, non
   serve etichettarla diversamente. Quando la sessione operaia
   finisce e l'utente la mergia, sposti la voce in "✅ Fatto" con la
   data di chiusura (vedi 2.4).

---

## 5. Bug noti / quirks da tenere d'occhio

> Nessun bug di blocco al 2026-05-02. Quando l'utente segnala
> qualcosa, aggiungi la voce qui sotto e riferisci nel commit di fix.

### 5.1 Currently empty

_Nessuna issue aperta._

### 5.2 Lezione appresa — oggetti instabili come dep di useEffect/useFocusEffect

Nel primo utilizzo reale di FitTrack (2026-05-02) è emerso un loop
infinito di query DB sulla `SportHomeScreen` causato da un return
`{ ... }` non memoized di `useSportStats()` passato come dep di
`useFocusEffect`. Risolto in PR #57.

**Pattern da non ripetere**: hook custom che ritornano oggetti literal
(`{ loading, data, reload }`) producono un nuovo reference a ogni
render. Mettere l'intero oggetto come dep di `useEffect` /
`useFocusEffect` provoca loop quando il callback chiama un setter del
hook, perché ogni setState ricrea l'oggetto, ricrea la callback,
ritriggera l'effect.

**Best practice**:
- Estrai i singoli campi memoized (es. `const reloadFn = stats.reload`)
  e mettili come dep, non l'intero oggetto.
- Oppure, dentro il hook, wrappa il return in `useMemo` con dipendenze
  primitive — più costoso da scrivere ma rende il consumer "naturale".
- Quando lavori in un useEffect su un valore di un hook custom,
  controlla SEMPRE se il return è memoized. Se non lo è, non passarlo
  intero come dep.

Cerca pattern simili con `grep -rn "stats\b\|store\b\|state\b" src/`
nelle dep di useEffect prima di mergiare nuovi hook custom.

### 5.3 Quirks architetturali (non bug, ma "by design" da ricordare)

- **`active_session` orfano**: se per qualche motivo (crash, race) la
  riga `active_session` punta a un `sessions.id` che non esiste più,
  `sessionsDB.getActiveSession()` la pulisce automaticamente
  (`sessionsDB.ts:142-146`). Non considerarlo un bug se lo vedi nei
  log.
- **`weeklyTargetDays` senza CHECK constraint**: vedi TODO [21]. UI
  protetta (stepper 1-7), ma DB potrebbe accettare valori illegali da
  un backup malevolo o da una scrittura programmatica. Non è
  critico al momento.
- **MET null su esercizi**: alcuni esercizi seedati hanno `met=null`
  (es. stretching profondo). `estimateSetCalories` ritorna 0 per
  loro. Voluto: niente fallback "MET medio" che falserebbe le stime.
- **Settings nascosto dalla tab bar**: `Settings` e `Profile` sono
  Tab.Screen registrati ma `TAB_CONFIG` di `BottomTabBar.tsx` non li
  include — visibili solo da icone in HomeScreen header. Sessioni
  precedenti hanno sbagliato a documentarlo come voce della tab bar.
  Stessa situazione per `SportSettings` in modalità sport (cog di
  SportHomeScreen).
- **Persistenza sessione attiva durante kill+restart**: il timer si
  ricostruisce dai timestamp DB, NON da setInterval running. Se vedi
  un comportamento strano (timer freeze inaspettato),
  `ActiveSessionContext.tsx` è il sospetto principale.
- **CalorieRing label fissa "kcal"**: prima di Fase 4 era hardcoded;
  ora accetta prop `unit`. Se vedi un nuovo consumer che non passa
  unit, il default è ancora "kcal" — voluto retrocompat.

---

## 6. Sessioni operaie attive

> Da aggiornare in tempo reale: quando una sessione parte, scrivi qui
> qual è e cosa sta facendo. Quando finisce e viene mergiata, sposta
> in "Sessioni operaie completate".

### 6.1 In corso

_Nessuna sessione attiva._

### 6.2 Sessioni operaie completate (storico recente)

Mantieni solo le ultime ~10 per riferimento. Sotto, oltre, sposta in
git history.

| Data | PR | Branch | Cosa | Note |
| --- | --- | --- | --- | --- |
| 2026-05-03 | #65 | `claude/ux-polish-rest-timer-standalone-S4IRN` | UX Polish C3.2 (timer pausa standalone in SportHome) | 3 commit. Chiude [36]. Nuovo `RestTimerStandaloneModal`, riga 50/50 quick action SportHome, helper `src/utils/svgArc.ts` estratto. |
| 2026-05-03 | #64 | `claude/ux-polish-tabata-redesign-h2hGZ` | UX Polish C3.1 (redesign tab Timer → Tabata) | 7 commit. Chiude [35]. Aggiunta dep `expo-av`. Nuovi `TabataScreen`, `TabataConfigModal`, `TabataInfoSheet`, `HoldToStartButton`, `CountdownOverlay`, `src/utils/countdownSound.ts`. 3 colonne nuove `app_settings.tabata_*`. |
| 2026-05-03 | #63 | `claude/ux-polish-resttimer-notifications-uziCT` | UX Polish C2 (RestTimer pie chart + notifiche) | 2 commit. Chiude [25] [16]. Aggiunta dep `expo-notifications`. Nuovo `src/utils/restNotifications.ts` + action `extendRest` in ActiveSessionContext. |
| 2026-05-03 | #62 | `claude/ux-polish-wheelpicker-dQbvb` | UX Polish C1 (WheelPicker primitive + reps + timer) | 3 commit. Chiude [31] [24]. Nuovo primitive `src/components/WheelPicker.tsx` riusabile. |
| 2026-05-03 | #61 | `claude/ux-polish-haptic-permissions-kKTLh` (rimerge) | Iterazione 2 sessione A | Bonus: bottone Spotify nell'header sessione live (commit `36ddf2e`). |
| 2026-05-03 | #60 | `claude/ux-polish-layout-gestures-WutQB` (rimerge) | Iterazione 2 sessione B | Bonus: sezioni esercizi collassabili + icone muscle group (commit `7336e97`). |
| 2026-05-03 | #59 | `claude/ux-polish-layout-gestures-WutQB` | UX Polish B (SectionList esercizi + swipe diet) | 2 commit. Chiude [26] [23]. Helper nuovo `src/utils/exerciseGrouping.ts`. |
| 2026-05-03 | #58 | `claude/ux-polish-haptic-permissions-kKTLh` | UX Polish A (haptic + permessi camera + Spotify) | 4 commit. Chiude [17] [29] [33] [20]. Bonus operaia: haptic esteso a add-food/preferito/quick-addon/"Inizia ora". |
| 2026-05-02 | — (direct) | main | UX [28] timing transizione mode | Bump 700ms → 1500ms (commit `e462a1d`). Fix orchestratore diretto. |
| 2026-05-02 | #57 | `claude/review-orchestrator-workflow-zzPaV` | Fix loop SportHomeScreen | `stats` → `stats.reload` in useFocusEffect dep. Risolve scaldamento + freeze + "Inizia ora" bloccato. |
| 2026-05-02 | #56 | `claude/sport-mode-polish` | Sport Fase 5 | Last sport phase |
| 2026-05-02 | #55 | `claude/sport-mode-exercises-dashboard` | Sport Fase 4 | Libreria + dashboard |
| 2026-05-02 | #54 | `claude/sport-mode-session` | Sport Fase 3 | Sessione live |
| 2026-05-02 | #53 | `claude/sport-mode-workouts` | Sport Fase 2 | Schede |
| 2026-05-01 | #51 | `claude/sport-mode-scaffold` | Sport Fase 1 | Scaffolding |

---

## 7. Cose da NON fare mai (anche se l'utente sembra autorizzarle al volo)

- Aprire PR senza richiesta esplicita (l'utente le crea sempre lui).
- Mergiare branch (idem).
- `git push --force`, `git reset --hard` su HEAD condivisi.
- Aggiungere librerie nuove senza decisione esplicita
  (specialmente UI lib: NativeWind, styled-components, Paper,
  Reanimated avanzata, ecc.). L'app usa StyleSheet + tokens, fine.
- Modificare `app.json`, `package.json`, `eas.json`, `setup.bat`,
  hook git, CI/CD senza richiesta esplicita.
- Toccare il design system (`src/theme/index.ts` core token) senza
  passare da una decisione condivisa.
- Iniziare a scrivere codice di feature senza prima un prompt operaio
  scritto e approvato (a meno di fix piccolissimi, vedi 0 sopra).
- Scordarsi di committare in formato `<type>(<scope>): <messaggio>`
  con trailer `https://claude.ai/code/session_<id>`.

---

## 8. Cosa sapere per chi avvia questa sessione (utente)

### 8.1 Prompt minimo da incollare in chat

```
Sei in /home/user/FatTrack su branch main aggiornato.

Sei l'orchestratore del progetto. Leggi
docs/ORCHESTRATOR_HANDOFF.md e segui il workflow descritto.
Rispetta CLAUDE.md.

Procedi salutandomi con un breve recap dello stato corrente del
progetto (cosa è in produzione, cosa è schedulato come prossimo
lavoro logico) e attendi istruzioni.
```

### 8.2 Cosa avere pronto quando avvii

- **Per la voce [14] backup tabelle sport**: nulla. Pronta a partire.
- **Per la voce [15] asset wordmark**: gli SVG/PNG di "FitTrack" e
  "FatTrack" droppati in `assets/sport-splash/` PRIMA di lanciare
  l'orchestratore (altrimenti il prompt verrà bloccato in attesa).
- **Per la voce [24] selettore reps a scorrimento (🟡)**: nulla,
  autonoma. Alta UX impact su sessione live, candidato forte come
  prossimo lavoro.
- **Per voci 🟢 autonome ([8] [9] [10] [13] [16] [17] [18] [19] [20]
  [21] [22] [23] [25] [26] [29] [30] [31] [32])**: nulla. La [19]
  richiede una scelta tra alternative (wger / Free Exercise DB) —
  attendi la tabella di tradeoff dell'orchestratore.
- **Per [27] illustrazioni esercizi**: l'utente deve produrre le
  immagini PNG/SVG e droppare in `assets/exercises/` con slug
  `nome-esercizio-lowercase.png`. Senza asset, il prompt resta in
  attesa come per [15].
- **Per nuove feature non in TODO**: descrizione in 1-2 frasi
  ("vorrei aggiungere X perché Y"). L'orchestratore espanderà in
  fase esplorativa.
- **Per bug**: schermata + passi per riprodurre + comportamento
  atteso.

### 8.3 Update di questo file

Quando aggiungi voci al TODO o cambia lo stato (sessione operaia
parte/finisce), aggiorna anche le sezioni 4.1, 4.2, 6.1 di questo
file. È normale che la sezione 6 si "accumuli" — sposta le voci
vecchie in `docs/TODO.md` "✅ Fatto" se serve, o lascia il git log
come fonte di verità storica.
