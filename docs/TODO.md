# FatTrack — backlog operativo

Questo file è il **backlog ufficiale** del progetto: lavori da fare, debiti
tecnici, idee future. Va aggiornato man mano che si decide cosa rimandare e
cosa pianificare.

> **Per Claude Code (sessioni future):** all'inizio di ogni sessione leggi
> questo file. Quando l'utente chiede _"cosa c'è da fare?"_ / _"cosa hai
> in backlog?"_ / _"propostami qualcosa da implementare"_, rispondi
> usando le voci qui sotto in ordine di priorità (🔴 → 🟡 → 🟢) e di
> data (più vecchio = più maturo, da affrontare prima a parità di
> priorità). Quando l'utente dice _"aggiungi al TODO che ..."_ o
> _"segna debito su X"_, **edita questo file** aggiungendo una nuova
> voce in fondo alla sezione corretta col formato standard:
>
> ```
> ### [N+1] Titolo breve
>
> **Aperta**: YYYY-MM-DD
> **Priorità**: 🔴 alta | 🟡 media | 🟢 bassa
> **Area**: codice | build | doc | infra | UX
>
> Descrizione del problema o dell'idea. Cosa va fatto, perché ora non si fa.
>
> **Done quando**: criterio di completamento misurabile.
> ```
>
> Quando una voce viene completata: spostala nella sezione _"Fatto"_ in
> fondo con la data di chiusura, NON cancellarla — la storia serve.

---

## 🔴 Priorità alta

_(vuota — nessuna criticità bloccante al momento)_

---

## 🟡 Priorità media

### [1] Backup automatico keystore su cloud

**Aperta**: 2026-05-01
**Area**: build / infra

`keystore/debug.keystore` è la firma di TUTTE le release. Oggi backup
manuale dell'utente sul suo cloud personale. Se mai sparisse, gli utenti
dovrebbero disinstallare l'app per aggiornare (Android rifiuta APK con
firma diversa) e perderebbero tutti i dati SQLite locali.

Idea: aggiungere a `scripts/build-android-local.bat` un copy verso
`%USERPROFILE%\OneDrive\fattrack-keystore\` (o path configurabile via env).
Fallback silenzioso se il path non esiste.

**Done quando**: ogni build APK fa anche una copia verso una location di
backup definita; se la location non è configurata il build procede ma
mostra un warning.

---

### [2] Generare una vera upload keystore (no debug.keystore)

**Aperta**: 2026-05-01
**Area**: build / infra
**Dipende da**: [1]

`debug.keystore` è la chiave di default Expo, riutilizzata come hack come
firma di produzione. Funziona ma:
- non si può pubblicare su Play Store (rifiuta firme debug)
- se un giorno si volesse cambiare chiave, **tutti gli utenti** dovrebbero
  reinstallare

L'utente vuole prima implementare backup/restore robusto della keystore
(voce [1]), poi affrontare la migrazione a una upload keystore vera
generata via `keytool -genkey -alias fattrack-upload -keyalg RSA
-keysize 2048 -validity 10000`.

**Done quando**: build production firma con `keystore/fattrack-upload.jks`
unico per il progetto (non più `debug.keystore`); migrazione fatta in
release dedicata documentata; fallback debug solo per `[3] Build APK senza
release`.

---

### [6] Retry automatico su `gh release create`

**Aperta**: 2026-05-01
**Area**: build

Se `gh release create` fallisce DOPO il push del tag (token scaduto,
network), si ottiene un tag su GitHub senza release associata. Gli utenti
non vedono il prompt di update perché Releases API torna ancora il latest
precedente.

Oggi `fattrack.bat` fa `pause + exit` lasciando l'utente a fixare a mano.
Migliorabile con retry interattivo o `gh release create --draft` poi
publish in step separato.

**Done quando**: tag e release sono atomici (o almeno la release viene
auto-ritentata).

---

### [15] Asset wordmark "FitTrack" definitivi

**Aperta**: 2026-05-02
**Area**: design / codice
**Effort**: M (rivalutato 2026-05-02 — bloccata da lavoro esterno del
proprietario per produrre gli asset SVG/PNG. Da valutare separatamente
dal batch UX, NON inserire in sessioni operaie batch finché gli asset
non sono in repo.)

`src/components/sport/ModeTransitionOverlay.tsx` mostra il wordmark
"FitTrack" (sport) / "FatTrack" (diet) come **testo** + icona `bolt`
inline durante la transizione di modalità. Era un placeholder esplicito
in attesa degli asset definitivi che il proprietario produrrà
(SVG/PNG ad alta risoluzione, eventualmente varianti chiaro/scuro).

Quando arriva l'asset:
- droppare in `assets/sport-splash/` (es. `logo-fittrack.svg`,
  `logo-fattrack.svg`)
- sostituire il blocco `<Text>` + `<Icon>` di `ModeTransitionOverlay`
  con un `<Image>` o `<SvgUri>` di react-native-svg (quest'ultima
  evita di aggiungere una nuova lib)
- ricontrollare timing della transizione (~700ms ora, magari più
  lungo se l'asset ha più dettaglio)

**Done quando**: lo splash di transizione mostra il logo grafico al
posto del wordmark testuale; gli asset sono nel repo o referenziati
con import statici; il rerender della transizione non flickera (test
manuale su device).

---

### [43] Mantieni schermo acceso durante sessione attiva

**Aperta**: 2026-05-07
**Priorità**: 🟡 media
**Area**: UX (sport) / codice

Durante una sessione di allenamento attiva (`ActiveSessionScreen`) lo
schermo si spegne dopo il timeout di sistema Android. Conseguenze:
il `RestTimer` non è più visibile, l'utente perde il countdown della
pausa e — peggio — se l'OS sospende il task JS il timer può anche
freezare, falsando la durata del recupero. Lo stesso problema vale
per il banner sticky `<ActiveSessionBanner>` durante navigazione tra
tab e per il `RunningView` di Tabata.

Da fare: usare `expo-keep-awake` (lib ufficiale Expo SDK 51, già
compatibile) — `useKeepAwake()` hook attivato SOLO durante:
- `ActiveSessionScreen` con sessione live (o gestione centralizzata
  in `ActiveSessionContext` quando `state.session != null`)
- `RunningView` di `TabataScreen` quando il workout è in corso
- `RestTimerStandaloneModal` quando aperto in fase countdown

Importante: **non** attivarlo per l'intera app — drain batteria
inaccettabile durante navigazione normale (libreria esercizi,
storico, settings).

Da considerare:
- toggle in `SportSettings` ("Tieni schermo acceso durante
  allenamento", default ON) — qualcuno con device flagship potrebbe
  voler disattivare per risparmio batteria su sessioni lunghe
- comportamento al background/foreground: se l'utente mette l'app
  in background il keep-awake si rilascia (lo fa Android in
  automatico)

**Done quando**: durante una sessione attiva lo schermo non si
blocca; il `RestTimer` rimane visibile fino al termine; analoga
copertura per Tabata in `RunningView` e per il timer pausa
standalone; chiusura/abbandono sessione disattiva il keep-awake;
toggle in SportSettings permette di disattivarlo.

---

### [44] Bug: switch fit→fat a volte atterra su BarcodeScreen invece di Home

**Aperta**: 2026-05-07
**Priorità**: 🟡 media
**Area**: codice

Tornando dalla modalità sport (fit) alla modalità diet (fat) — via
long-press tab Home o toggle in Settings — l'utente a volte si
ritrova sulla `BarcodeScreen` invece che sulla `HomeScreen`.
`MainTabNavigator` ha `initialRouteName="Home"` ma il bug suggerisce
che lo state di navigazione sopravviva al mount/unmount oppure che
il primo tab in ordine (`Barcode`) prenda il focus per qualche
race.

Da investigare:
- `RootNavigator` smonta/rimonta i tab navigator al cambio di
  `appMode`, oppure tiene entrambi montati con flag di visibilità?
  Se il secondo, lo state persiste tra switch.
- `Barcode` è il primo tab in ordine di rendering (`Barcode ·
  Favorites · Home · History · FoodSearch`); se per qualunque
  motivo `initialRouteName` non viene rispettato, il default è il
  primo tab.
- Riproducibilità sospetta: aprire fat → navigare su Barcode →
  switch a fit → switch di nuovo a fat. Probabilmente atterri su
  Barcode invece che Home.

Fix candidato: forzare reset dello state al cambio di `appMode` nel
`RootNavigator.tsx`, oppure spostare `Home` come primo tab in
ordine di registrazione (ma rompe il layout della tab bar — meglio
il reset esplicito).

**Done quando**: ogni switch fit→fat (e fat→fit) atterra sempre
sulla rispettiva HomeScreen, indipendentemente dalla tab attiva
prima dello switch; testato partendo da ogni tab.

---

## 🟢 Priorità bassa

### [8] Persistere il consenso `REQUEST_INSTALL_PACKAGES`

**Aperta**: 2026-05-01
**Area**: UX
**Effort**: M (rivalutato 2026-05-02 — richiede bridge nativo Android o
`expo-intent-launcher`, non è una semplice riga in app.json)

Ogni volta che l'utente preme "Aggiorna" sull'alert di update, Android
chiede di nuovo "Consenti install da fonti sconosciute" (anche se l'ha
già concesso una volta). È fastidioso.

`PackageManager.canRequestPackageInstalls()` su Android 8+ permette di
sapere se il consenso è già attivo. Si potrebbe mostrare un'istruzione
one-shot la prima volta e saltare l'alert nelle successive.

**Done quando**: utente concede una volta, le successive l'app naviga
direttamente al download senza chiedere di nuovo (a meno che il consenso
sia stato revocato).

---

### [9] Pre-release env (canale "preview" ring)

**Aperta**: 2026-05-01
**Area**: build

Oggi un solo canale: ogni release è "production". Niente test ring
intermedio. Un'idea: usare le pre-release di GitHub (release con flag
`prerelease: true`) come canale beta opt-in, attivabile via flag in
Settings.

**Done quando**: utenti possono opt-in a "ricevere anche le pre-release"
e l'app legge sia le release stabili sia le pre-release.

---

### [10] Cache più aggressiva del fetch versione

**Aperta**: 2026-05-01
**Area**: codice

`updateChecker.ts` ha throttle 1h ma su rete instabile il fetch può
fallire silenziosamente. Si potrebbe persistere l'ultima `RemoteVersion`
fetchata in AsyncStorage e mostrare il prompt anche offline se il
confronto era già stato calcolato.

**Done quando**: una volta visto il prompt, l'utente lo rivede anche
offline finché non lo dismissa o aggiorna.

---

### [13] Foto profilo (avatar reale invece dell'iniziale)

**Aperta**: 2026-05-01
**Area**: UX / codice

`ProfileScreen` mostra come avatar un cerchio con l'iniziale del nome.
Carino e a costo zero ma poco personale. Idea: aggiungere
`expo-image-picker` per permettere all'utente di scegliere una foto
dalla galleria. URI persistito su `user_profile.avatar_uri` (il file
sopravvive al reinstall? in realtà no — i picker restituiscono URI
content:// non stabili. Va copiato in `FileSystem.documentDirectory`
con `expo-file-system` per garantire persistenza).

Implica:
- nuova dipendenza `expo-image-picker` (richiede aggiunta permessi
  `READ_MEDIA_IMAGES` su Android in `app.json`)
- copia file in storage app + cleanup del file precedente
- migrazione DB con colonna `avatar_uri TEXT`
- export/import del backup deve gestire anche il file binario o
  almeno re-encodarlo in base64 nel JSON

**Done quando**: l'utente può scegliere una foto dalla galleria che
appare come avatar in `ProfileScreen` e nello shortcut "Il tuo
profilo" in `SettingsScreen`; la foto sopravvive al riavvio
dell'app; l'export di backup la include o la salta esplicitamente
con warning.

---

### [18] Video URL veri sugli esercizi

**Aperta**: 2026-05-02
**Area**: contenuti

`exercises.video_url` esiste come colonna ma TUTTI i 40 esercizi
seedati in Fase 4 hanno `videoUrl=null`. Il pulsante "Guarda video"
in `ExerciseDetailModal` viene quindi nascosto.

Da fare: curare una lista di link YouTube per ognuno dei 40
esercizi (canali affidabili in italiano o senza speech, es.
Calisthenicmovement, AthleanX, Yoga With Adriene). Aggiornare
`seedExercises.ts` con i link. Considerare:
- un re-seed mirato per gli utenti già installati (top-up con
  UPDATE invece che INSERT OR IGNORE)
- gestione del caso link rotto (`Linking.canOpenURL` prima di
  aprire)

**Done quando**: ogni esercizio ha un videoUrl funzionante; tap su
"Guarda video" apre il video nel browser/app YouTube; il top-up
funziona per utenti esistenti senza perdere modifiche locali (anche
se in Fase 4 l'utente non può editare la libreria, lo lasciamo
forward-compatible).

---

### [19] DB esterno esercizi (espansione massiccia libreria)

**Aperta**: 2026-05-02
**Area**: contenuti / codice

I 40 esercizi seedati coprono i casi base ma per un utilizzo serio
servirebbero 200-500. Candidati per espansione:
- [wger.de](https://wger.de) — API REST gratuita, esercizi con
  immagini, multilingua. Pull-once a un seed JSON statico bundlato.
- [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) —
  ~800 esercizi MIT su GitHub con immagini animate. Ottima fonte.
- [ExerciseDB](https://exercisedb.io) — paywall RapidAPI, scartato.

Approccio suggerito: scaricare offline da Free Exercise DB
(zip GitHub release), filtrare a corpo libero / con attrezzi
domestici (~150-200 esercizi), pulire i campi, generare un seed JSON
bundlato (no fetch runtime). Le animazioni gif sono ~50KB ciascuna →
con 200 esercizi ~10MB di asset. Valutare se vale lo spazio o se
linkare ai gif remoti via URL (con cache RN).

**Done quando**: la libreria ha ≥150 esercizi; il bundle non cresce
oltre +15MB; gli esercizi nuovi hanno descrizione + guideSteps +
videoUrl o gif embed.

---

### [21] CHECK constraint su `app_settings.weekly_target_days`

**Aperta**: 2026-05-02
**Area**: codice

Lo stepper in `SportSettingsScreen` (Fase 5) mostra valori 1-7
e l'UI gestisce il bound. Ma a livello DB la colonna
`weekly_target_days` è `INTEGER NOT NULL DEFAULT 4`, senza CHECK
constraint. Un import di backup malevolo o un bug futuro potrebbero
scrivere valori illegali (0, -3, 100).

Da fare: ALTER TABLE per aggiungere `CHECK (weekly_target_days
BETWEEN 1 AND 7)` — su SQLite non si può ALTER aggiungendo CHECK,
serve ricreare la tabella (rename + create new + insert select +
drop old). Idempotente come gli altri pattern già nel db.ts. In
alternativa, validare lato applicativo (più semplice, meno robusto).

**Done quando**: il DB rifiuta scritture con valore fuori range
1-7; l'errore viene gestito con Toast in `setWeeklyTarget` invece
di crashare.

---

### [22] Inserire conta pizze

**Aperta**: 2026-05-02
**Priorità**: 🟢 bassa
**Area**: feature
**Effort**: M (rivalutato 2026-05-02 — richiede tabella DB nuova
`pizza_log` + nuova screen + integrazione con backup/restore — interseca
[14]; non è un fix isolato)

Pagina scherzosa fuori dalla logica della dieta: contatore di pizze
mangiate nell'anno corrente. Idea trattata come easter egg / stat
divertente, non come voce nutrizionale tracciata.

Proposta dell'utente per l'accesso: long-press sul tab "Storico" in
diet (semantica: in fondo è uno storico anche quello), in alternativa
pagina nascosta raggiungibile da un'icona dedicata. Da decidere quando
si implementa.

Schema indicativo: tabella `pizza_log (id, eaten_at, kind?, notes?)`
con un + che incrementa di 1 e mostra il totale anno corrente, magari
con breakdown mensile come barra/grafico. Nessuna integrazione coi
pasti del diario (vita propria).

**Done quando**: dalla home diet è raggiungibile in 1 gesto la
"pizza counter screen", che mostra il totale anno + un + per
incrementare; il dato è persistito in DB (sopravvive a reinstall via
backup); export/import del backup la include.

---

### [34] Widget Android per la home screen

**Aperta**: 2026-05-02
**Priorità**: 🟢 bassa
**Area**: feature / codice (nativo Android)
**Effort**: L (~1-2 giorni, richiede codice nativo o libreria nuova)

Idea: un widget Android che mostra a colpo d'occhio sulla home del
telefono i dati chiave del giorno senza dover aprire l'app.
Candidati per il contenuto (da decidere):

- **Diet (default)**: ring calorie giornaliere (riusa estetica
  `CalorieRing`) + numero kcal residue, magari pasti registrati
  oggi (X/4).
- **Sport (se appMode=sport)**: scheda di oggi se programmata,
  oppure "ultimo allenamento: N giorni fa", o banner sessione
  attiva se in corso.
- **Quick action**: tap sul widget apre l'app sulla `BarcodeScreen`
  (diet) o sulla scheda di oggi (sport).

Vincoli tecnici:

- Expo non supporta widget Android out-of-the-box. Servono due
  strade:
  - **A — codice nativo Kotlin** in un nuovo modulo
    `android/app/src/main/java/.../widget/` con
    `AppWidgetProvider`, `RemoteViews`, `widget_provider_info.xml`.
    Pieno controllo, no nuove dep, ma serve scrittura nativa.
  - **B — libreria** `react-native-android-widget`
    (https://github.com/sAleksovski/react-native-android-widget)
    che permette di scrivere il widget in TSX. Più rapido, ma
    nuova dep e va valutato se il design system riusa bene
    (probabilmente no — il widget vive in un contesto RemoteViews
    con vincoli di rendering).
- **Sincronizzazione dati**: il widget NON può leggere il SQLite
  app direttamente (sandbox). Due opzioni:
  - L'app scrive uno snapshot leggero in `SharedPreferences` o
    `MMKV` ad ogni mutazione rilevante (add pasto, completamento
    sessione). Il widget legge quello.
  - `ContentProvider` esposto dall'app sul DB SQLite (più
    complesso, ma più "live").
- **Refresh**: Android limita `updatePeriodMillis` a min 30 min.
  Per refresh più frequenti serve trigger manuale via app
  (broadcast) o `WorkManager`.

**Done quando**: l'utente può aggiungere alla home Android un
widget FatTrack 2x2 o 4x2 che mostra il ring calorie del giorno
corrente; tap apre l'app; il widget si aggiorna entro ~1 minuto
da una modifica fatta in app (es. registrato un pasto). Modalità
sport copertura come iterazione successiva o bonus se semplice.

---

### [38] Popup "in arrivo" — teaser per feature future

**Aperta**: 2026-05-05
**Priorità**: 🟢 bassa
**Area**: feature / codice / UX

Idea: un file remoto nel repo (es. `upcoming.json` accanto a
`version.json`, oppure una sezione dedicata nel body delle GitHub
Releases) elenca le feature in arrivo con voci tipo:

```
{
  "id": "spotify-oauth",
  "title": "Controllo musica in-app",
  "description": "Play/pause/next senza uscire dall'allenamento",
  "eta_human": "prossime settimane",
  "target_version": "2.1.0"
}
```

All'avvio l'app fa fetch (riusando pattern + throttle di
`updateChecker.ts`) e confronta con `seenUpcomingIds` salvati in
AsyncStorage. Se trova voci nuove, mostra un popup informativo
("Sta arrivando: <title> — <description>. Torna a trovarci tra
<eta_human>!"). Stesso slot UI del messaggio "Novità" post-update,
ma triggherato PRIMA del rilascio invece che dopo.

Da decidere:
- file dedicato vs sezione del body Releases (se sezione, va parsata
  con un marker tipo `<!-- upcoming-start -->` ... `<!-- upcoming-end -->`)
- frequenza fetch (allineata al throttle 1h di updateChecker o
  rilassata a ogni cold-start)
- vita dell'avviso: visto una volta basta? "non mostrare più"?
  auto-dismiss quando `target_version` è stata rilasciata davvero
  (così non si duplica con il messaggio Novità del post-update)?
- design popup (riuso `Card` + bottone "Ho capito", o BottomSheet
  per voci più ricche)

**Done quando**: aggiornando un file remoto con una voce nuova,
entro ~1h tutti gli utenti vedono un popup teaser; ogni voce viene
mostrata una volta sola per device; quando la feature esce davvero
il teaser non duplica il messaggio "Novità" post-aggiornamento.

---

### [39] Raccolta suggerimenti utente anonima

**Aperta**: 2026-05-05
**Priorità**: 🟢 bassa
**Area**: feature / infra

Idea: dare agli utenti un canale per inviare suggerimenti / richieste
/ segnalazioni dall'app. I testi finiscono — anonimi — in un file
o storage che il proprietario consulta ogni tanto per decidere nuove
implementazioni. Da valutare prima dell'implementazione l'approccio
giusto.

Approcci candidati:

- **A — Issue GitHub via proxy serverless**: app fa POST a un
  Worker/Function (Cloudflare / Vercel) che, con un token segreto
  lato server, apre una issue su `davidefarci-cyber/fattrack` con
  label `feedback-utente` e body del messaggio. Niente token nell'APK
  (decompilabile = spam garantito). Più controllo + zero costi se
  Worker free tier basta.
- **B — Google Form / Tally**: link esterno aperto in browser. Zero
  backend, UX peggiore (esce dall'app), risposte raccolte nel form.
- **C — backend leggero proprio**: API + DB minimal (Supabase /
  Cloudflare D1) con endpoint `POST /feedback`. Massimo controllo,
  più lavoro iniziale.
- **D — mailto**: `Linking.openURL('mailto:...?subject=...&body=...')`.
  Zero backend ma rivela l'indirizzo destinatario e l'email del
  mittente (non più anonimo).

UX in app (indipendente dall'approccio):
- voce "Scrivi un suggerimento" in `SettingsScreen` e
  `SportSettingsScreen`
- TextArea + bottone "Invia anonimo"
- privacy notice esplicita ("non raccogliamo nulla che ti
  identifichi — niente nome, email, ID device")
- conferma post-invio con Toast
- rate-limit lato client (es. max 1 invio ogni 5 min) per ridurre
  spam accidentale

Da decidere prima di iniziare:
- approccio (probabilmente A se vogliamo zero infra dedicata, oppure
  C se vogliamo dashboard ricca)
- come il proprietario consulta (issues GitHub filtrate per label?
  dashboard custom? export CSV mensile?)
- moderazione spam (rate-limit per device-id hashato? captcha
  invisible? bloccare URL/email nei testi?)
- categorie opzionali ("idea funzionalità" / "bug" / "altro") per
  facilitare il triage

**Done quando**: dall'app l'utente apre un form, scrive un messaggio,
lo invia, riceve conferma; il proprietario riceve il messaggio in un
canale unico (issue GitHub o dashboard) SENZA informazioni che
identifichino il mittente; il flow regge un minimo di rate-limiting
contro spam.

---

## ✅ Fatto

### [chiusa] [45] + [30] Pulsante Settings + Utente in tutte le schermate

**Aperta**: 2026-05-02 ([30]) / 2026-05-07 ([45]) — **Chiusa**: 2026-05-07

Chiuse insieme perché [45] è un superset di [30].

Nuovo primitive `src/components/HeaderActions.tsx`: coppia `user` +
`cog` nel right slot. Decide la rotta del cog via `useAppSettings()`
(Settings in diet, SportSettings in sport) — un solo punto di verità
per l'icona impostazioni cross-modalità. Icone size 24 (uniformata —
SportHomeScreen usava 22).

`Profile` registrato come Tab.Screen nascosta anche in
`SportTabNavigator` (riusa lo stesso `ProfileScreen` di diet). Path
locale, niente switch di modalità forzato per accedere al profilo
da fit. Aggiunto `Profile: undefined` a `SportTabParamList`.

Schermate aggiornate (10 totali):
- **Diet (5)**: `HomeScreen` (refactor: blocco inline → primitive),
  `BarcodeScreen`, `FavoritesScreen`, `HistoryScreen`, `FoodSearchScreen`.
- **Fit (5)**: `SportHomeScreen` (refactor: solo cog → primitive con
  cog+user), `WorkoutsScreen`, `TabataScreen`, `SportHistoryScreen`,
  `ExercisesScreen`.

`TabataScreen` aveva già un `cog` per "Personalizza Tabata" — clash
con il cog di Settings. Sostituito con `pencil` (semantica
"edit/customize" preservata). Le 4 icone affiancate (pencil + info +
user + cog) entrano comodamente perché lo header del Tabata non ha
subtitle.

Skippate volutamente: `Settings`/`SportSettings`/`Profile` (sono
le destinazioni del cog/user, non avrebbe senso) e
`ActiveSessionScreen` (modal di sessione live, UX dedicata immersiva
— interrompere con cog/user durante un set sarebbe un bug).

Cleanup secondario:
- Stile orfano `headerActions` rimosso da `HomeScreen` (era usato
  solo dal vecchio blocco inline).
- Import `useNavigation`/`BottomTabNavigationProp`/`TabParamList` +
  variable `navigation` rimossi da `HomeScreen` (ora la navigation
  vive dentro `HeaderActions`).

Verifica: typecheck OK, lint 0 problems.

---

### [chiusa] [7] Proporre PR Workflow CI

**Aperta**: 2026-05-01 — **Chiusa**: 2026-05-07

Commit `63aa976` su branch `claude/review-todo-list-jo3yK`. Aggiunto
`.github/workflows/ci.yml`: trigger su `push: branches: [main]` +
`pull_request:` (qualsiasi base). Job singolo `validate` su
`ubuntu-latest` con Node 20 LTS, cache npm via `actions/setup-node@v4`,
`npm ci` → `npm run typecheck` → `npm run lint`. Sequenziale per leggere
chiaro l'output di ogni step e perché lo step di install è già
condiviso.

I gate locali introdotti in [5]/[41]/[42] (lint+typecheck nel
`fattrack.bat:menu_release`) restano operativi: il workflow CI è il
backstop per regressioni che sfuggono al run locale (es. dimenticato
di lanciare prima del push) e abilita la branch protection sul PR
flow lato GitHub.

**Follow-up lato proprietario** (non bloccante per la chiusura):
abilitare branch protection su `main` richiedendo il check `Typecheck
& Lint` come required prima del merge — rende il gate vincolante.

---

### [chiusa] [42] Cleanup warning `react-hooks/exhaustive-deps`

**Aperta**: 2026-05-06 — **Chiusa**: 2026-05-06

Commit `1c83bf1`. I 10 warning lasciati aperti dal setup ESLint
[41] tutti chiusi (0 problems totali).

- `GramsInputModal.tsx` (3 warning): `servings = target?.servings
  ?? []` wrappato in `useMemo` con dep `target?.servings` — il
  fallback array veniva ricreato a ogni render invalidando le
  useMemo a valle.
- `SportSettingsScreen.tsx` (1 warning): stesso pattern su
  `availableEquipment`, wrappato in `useMemo`.
- `WorkoutsScreen.tsx` (2 warning): idem su `availableEquipment`.
  Le useMemo `filteredPrograms`/`filteredStandaloneWorkouts` non
  si invalidano più a vuoto.
- `EditMealModal.tsx` (3 warning):
  - Effect "carica servings": deps semplificate a
    `[visible, meal, isFixedCost]`. Il mosaico precedente
    mancava di `meal?.grams` — vero bug latente: un edit che
    cambiava solo i grammi non faceva ricaricare i servings.
  - Effect "form init on id change": deps `[visible, meal?.id]`
    intenzionali (snapshot iniziale, non reattivo). Aggiunto
    `eslint-disable-next-line` con commento esplicativo.
  - Effect "sync unit con servings": riscritto estraendo
    `label = meal?.servingLabel` per eliminare l'uso standalone
    di `meal`.
- `FavoritesScreen.tsx` (1 warning): effect form-init con stesso
  pattern di EditMealModal, `eslint-disable-next-line` con
  motivazione.

**Future-proofing**: la regola `react-hooks/exhaustive-deps` resta
a `warn` per ora (futuro upgrade a `error` decidibile più avanti
se si vuole un gate più rigido).

---

### [chiusa] [41] Setup `eslint.config.js` per ESLint v9

**Aperta**: 2026-05-06 — **Chiusa**: 2026-05-06

Commit `d7fd1cf`. Lo script `npm run lint` esisteva da sempre in
`package.json` ma non era mai stato cablato (niente eslint nelle
devDependencies, niente file di config). ESLint v10 globale del
container ricordava la verità: il gate introdotto in [5] era de
facto sempre da skippare. Cleanup completo:

- `package.json` devDependencies: aggiunti `eslint@^9.39`,
  `typescript-eslint@^8`, `eslint-plugin-react@^7.37`,
  `eslint-plugin-react-hooks@^5.2`, `globals@^15.15`.
- Nuovo `eslint.config.js` (flat config v9): base
  `js.recommended` + `tseslint.recommended`, React rules
  consigliate (con `react-in-jsx-scope`/`prop-types`/
  `no-unescaped-entities` off), `react-hooks/rules-of-hooks`
  ERROR + `react-hooks/exhaustive-deps` WARN, TypeScript rules
  rilassate (`no-explicit-any` warn, `no-unused-vars` con
  pattern `^_` tollerato).
- Ignore: node_modules, android, ios, .expo, dist, build,
  coverage, assets, `src/utils/exerciseImages.ts`
  (autogenerato), scripts, babel/metro config, eslint.config.js
  stesso.

Verifica:
- `npm run lint` exit 0, 10 warning, 0 errori.
- `npm run typecheck` exit 0.
- I 10 warning residui (tutti exhaustive-deps) tracciati come
  voce **[42]** in 🟢 bassa.

Effetto sul gate di [5]: il prompt "Saltare lint?" in
`fattrack.bat` adesso è davvero non bloccante. Premendo Invio
(default NO) lint gira, exit 0, release prosegue.

---

### [chiusa] [3] Drop di `version.json`, solo Releases API

**Aperta**: 2026-05-01 — **Chiusa**: 2026-05-06

Commit `9a72eb9` sul branch `claude/complete-todo-items-9sI5S`.
Cleanup completo del fallback su `version.json`:

- `src/utils/updateChecker.ts`: rimosse `VERSION_JSON_URL`,
  `MIN_VERSION_MARKER`, `fetchFromVersionJson`, `isVersionJsonPayload`,
  router `fetchRemoteVersion`. Tipo `RemoteVersion` snellito (no
  `minSupportedVersion`). `runCheck` non calcola più `isMandatory`,
  `promptUpdate` ha sempre i due bottoni Dopo+Aggiorna.
- `scripts/bump-version.js`: scrive solo `app.json`. Parametro
  `notes-file` mantenuto per retrocompat con `fattrack.bat` ma non
  più usato (note nel body GitHub Release).
- `fattrack.bat`: `git add app.json` e `git checkout -- app.json`
  in rollback (no più `version.json`).
- File `version.json` rimosso dal repo.
- `README.md` §5.2-5.3 aggiornato: niente più riferimenti a
  `version.json` / `min_supported_version` / alert bloccante.

Step 0 (release ponte con bump `min_supported_version`) saltato
consapevolmente: cerchia di tester ristretta tutti già su versione
ben superiore al floor, niente rischio di lasciare utenti orfani.

---

### [chiusa] [5] Lint automatico in `:menu_release`

**Aperta**: 2026-05-01 — **Chiusa**: 2026-05-06

Commit `fa9b46e`. Aggiunto in `fattrack.bat:316-329` (subito dopo il
typecheck) un sub-prompt "Saltare lint? [s/N]" con default NO: premendo
Invio il lint gira tramite `npm run --silent lint`, su errori la
release abortisce. Per saltare in casi urgenti basta scrivere "s" al
prompt. Niente flag CLI: il menu batch non supporta argv classici.

**Nota follow-up**: al momento `npm run lint` non gira sul repo perché
ESLint v10 richiede `eslint.config.js` (assente). Il gate è già in
posizione ma sarà operativo solo dopo aver introdotto la config —
vedi voce **[41]** in `🟡 media`.

---

### [chiusa] [40] Auto-trigger Quick Share su APK appena buildato

**Aperta**: 2026-05-06 — **Chiusa**: 2026-05-06

Commit `fa9b46e`. Nuovo `scripts/quickshare-send.ps1`: script
PowerShell che invoca il verb "Quick Share" del context menu Windows
via `Shell.Application` COM, aprendo la finestra Quick Share con
l'APK pre-caricato. Regex copre "Quick Share" + "Condivisione
rapida" / "Condivisione vicina" (locale IT futuri). Exit code 2 se
verb non registrato → fallback grazioso che stampa il path APK.

Hook in `fattrack.bat` dopo build OK del menu **[3] Build APK senza
release**: prompt "Inviare ora con Quick Share? [S/n]" default SI.
Sostituisce la vecchia voce [4] (smoke test `adb install`) annullata.

---

### [annullata] [4] Smoke test automatico via `adb install` dopo build

**Aperta**: 2026-05-01 — **Chiusa**: 2026-05-06

Annullata: l'utente trasferisce gli APK di test via **Samsung Quick
Share** tra il suo portatile e il suo telefono Samsung (entrambi sullo
stesso ecosistema, funziona senza intoppi). `adb install` richiederebbe
cavo USB + driver + autorizzazioni debug a ogni riavvio device →
overhead maggiore del workflow Quick Share già operativo. Sostituita
dalla voce **[40]** che automatizza l'invocazione di Quick Share sul
file APK appena buildato.

---

### [chiusa] [27] Immagini illustrate per esercizi + guida pre-primo-set

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-05

Scope esteso rispetto all'idea iniziale: oltre alle illustrazioni nel
modal dettaglio della libreria, mostrate anche durante la sessione
attiva come guida pre-primo-set di ogni esercizio.

Pipeline asset:
- 67 illustrazioni vettoriali generate via GPT image (10 batch + 3
  round di rifacimento — 84% promosse al primo colpo, 12% al secondo,
  4% al terzo grazie a override geometrico — vista laterale invece
  di top-down per spinal-twist e y-t-w-prone, descrizione
  diagrammatica per curl-isometrico-asciugamano).
- Convertite in WebP qualità 85, max 1080px (saving ~98%, da ~55 MB
  ipotetici a ~1.7 MB reali).
- Materiale generativo in `scripts/exercise-illustrations/`:
  manifest, template, generatori prompt+rifare, ottimizzatore,
  mappa autogenerata.

Render in app:
- `src/utils/exerciseImages.ts` (autogenerato): mappa
  name→slug→require statico + helper `getExerciseImage(name)` con
  fallback graceful e `getExerciseAspectRatio(name)` per dimensionare
  i box.
- `ExerciseDetailModal.tsx`: `<Image>` sopra header con aspectRatio
  dinamico, maxHeight 240 per evitare modali troppo lunghe su
  mobile.
- `ActiveSessionScreen.tsx` componente `ExerciseGuide`: mostrato
  prima del set #1 di ogni esercizio quando
  `app_settings.exercise_guides_enabled` è ON e il guide non è già
  stato visto in questa sessione (state in-memory `viewedGuides:
  Set<number>`, reset a cambio di session.id). Bottone "Inizia il
  set" + tap sull'area contenuto → passa al tracking input. "Non
  mostrarle più" → disattiva il flag globalmente.
- `SportSettingsScreen.tsx`: nuovo toggle "Guida esercizio prima
  della prima serie" (default ON), pattern haptic enabled.
- DB: aggiunta colonna `app_settings.exercise_guides_enabled INTEGER
  NOT NULL DEFAULT 1` via ALTER TABLE idempotente in `db.ts`.
  Backup automatico via introspection PRAGMA, niente cambio
  `BACKUP_SCHEMA_VERSION`.

---

### [chiusa] [14] Backup/restore include tabelle sport mode

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-03

PR #73 (sessione E, 1 commit). `TABLES` in `src/utils/dbBackup.ts`
esteso da 7 a 13 tabelle: aggiunte `app_settings`, `exercises`,
`workouts`, `workout_exercises`, `sessions`, `session_sets` in
ordine padri→figli per le FK. `active_session` esclusa per design
(stato runtime, una sola sessione live alla volta).
`BACKUP_SCHEMA_VERSION` resta a 1 come da convenzione documentata
nel file (linee 8-15: bump solo per cambi di formato JSON, non per
aggiunta di tabelle che il layer best-effort gestisce
automaticamente). Round-trip export → reset → import ora preserva
modalità corrente, weeklyTarget, config Tabata, schede personali,
sessioni storiche.

---

### [chiusa] [11] Backup / restore del database utente

**Aperta**: 2026-05-01 — **Chiusa**: 2026-05-03

La base era già implementata pre-sport (`exportBackup` /
`importBackup` in `src/utils/dbBackup.ts` con introspection schema
via `PRAGMA table_info`, intersection colonne, transazione + rollback
su errore, share via `expo-sharing`, picker via
`expo-document-picker`, bottoni "Esporta backup" / "Importa backup"
in `SettingsScreen`). Resa formalmente "completa" al merge di [14]
(PR #73) che ha aggiunto le 6 tabelle sport mancanti.

---

### [chiusa] [32] Espandere libreria esercizi con ricerca curata

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-03

PR #72 (sessione F, 1 commit). Append idempotente di 25 esercizi
curati a `SEED_EXERCISES`: schiena/dorsali (5: Superman, Reverse
snow angel, Rematore con bottiglie, Pull-apart con elastico,
Trazioni assistite con elastico), bicipiti (2: Curl con bottiglie,
Curl isometrico con asciugamano), spalle (2: Shoulder taps, Y-T-W
prone), glutei (3: Clamshell, Donkey kick, Fire hydrant), gambe
varianti (3: Lateral lunge, Cossack squat, Goblet squat con
bottiglia), stacchi (2: Romanian deadlift con bottiglie, Good
morning), pliometria (2: Tuck jump, Broad jump), esercizi seduti
(3: Marcia da seduti, Alzata gambe da seduti, Twist da seduti),
mobilità (3: Leg swings, Wrist circles, Ankle circles).

Conteggio finale: **67 esercizi** in libreria (la spec del prompt
citava "65 = 40 + 25" ma il file aveva 42 esercizi pre-merge —
discrepanza segnalata dalla worker nel commit message). Equipment
nuovi raccolti dinamicamente da `ExercisesScreen` (Bottiglie d'acqua,
Elastico, Elastico+sbarra, Asciugamano, Sedia). MuscleGroup nuovi
(Schiena, Bicipiti, Glutei/Femorali, Mobilità polsi, Mobilità
caviglie) appaiono come nuove sezioni nella SectionList senza
modifiche UI. Top-up via `INSERT OR IGNORE` redistribuirà ai DB
esistenti al prossimo avvio app.

---

### [chiusa] [37] Restyle RunningView post-countdown (Tabata)

**Aperta**: 2026-05-03 — **Chiusa**: 2026-05-03

PR #67 (sessione UX Polish D unificata, 5 commit). `RunningView`
in `TabataScreen.tsx` ora ha treatment premium allineato alla
brochure home Tabata: titolo "Round X / Y" prominente in
typography.h1 color accent, pie chart SVG (`describeArc` da
`@/utils/svgArc`) attorno al numero del countdown che si riempie
durante la fase, label "Lavoro" / "Recupero" sotto in
typography.value, palette differenziata per fase (`accent` saturo
in lavoro, `accentSoft` in recupero). Niente stride visivo tra
brochure e azione.

La sessione D ha unificato anche tre interventi correlati su
`ActiveSessionScreen`:
- `WheelPicker` con prop `orientation: 'vertical' | 'horizontal'`
  (default vertical, retrocompat — i 3 picker di
  TabataConfigModal restano verticali). Commit `68fec7c`.
- `RepsPicker` passa a wheel orizzontale, fix gesture conflict
  con `<ScrollView>` padre. Commit `4e732f1`.
- Sostituzione RPE 1-10 con due pill "Poco" (verde) / "Troppo"
  (rosso), header "Com'è andato? — opzionale". Storage `rpe`
  invariato, mappato 3/9/null. Commit `4aac520`.
- Rimozione campo Peso dalla UI sport (DB `session_sets.weight_kg`
  invariato per forward-compat). Commit `176f984`.

---

### [chiusa] [35] Redesign tab Timer → Tabata (esperienza brochure dedicata)

**Aperta**: 2026-05-03 — **Chiusa**: 2026-05-03

PR #64 (sessione UX Polish C3.1, 7 commit). Trasformazione completa
del tab `Timer` in `Tabata`:

- **DB**: 3 colonne nuove `app_settings.tabata_work_sec/rest_sec/rounds`
  con default 20/10/8, ALTER TABLE idempotenti pattern
  `weekly_target_days` (`f60d034`).
- **Primitives nuovi**: `HoldToStartButton` (hold-to-confirm 2s con
  arco SVG fill + glow accent + haptic tick `ae85c91`),
  `CountdownOverlay` (5→1 fullscreen accent con scale/fade,
  prop `onTick` `6107457`).
- **Audio**: nuova dep `expo-av` + `src/utils/countdownSound.ts`
  che require `assets/sounds/countdown-tick.wav` con cache globale
  (`abff2b0`). Audio + haptic per ogni tick del countdown 5→1
  (requisito esplicito proprietario).
- **Config**: `TabataConfigModal` con 3 `WheelPicker` (Lavoro /
  Recupero / Round) + riepilogo durata totale calcolato in tempo
  reale (`54b0c8c`).
- **Schermata**: `TimerScreen` rinominato `TabataScreen` con
  treatment brochure: hero copy + 3 stat-card (4 min / +28% capacità
  anaerobica / +14% VO₂max + footnote Tabata 1996), `TabataInfoSheet`
  educativo (Izumi Tabata, studio originale, distinzione vero
  Tabata vs HIIT), `HoldToStartButton` centrale (`1666561`).
- **Navigation**: rename label tab "Timer" → "Tabata" in
  `BottomTabBar` + `SportTabParamList` (`7f7229d`).

Modalità "Libero" e "Intervalli" rimosse dal tab. Libero diventa
voce [36] (chiusa, in C3.2). Intervalli è ora la config persistita.
Logica runtime di workout (`advanceInterval`, `RunningView`)
preservata invariata — restyle è scope di [37].

---

### [chiusa] [36] Timer pausa standalone in SportHomeScreen

**Aperta**: 2026-05-03 — **Chiusa**: 2026-05-03

PR #65 (sessione UX Polish C3.2, 3 commit). Spin-off della modalità
"Libero" che esce dal tab Tabata:

- Nuovo `RestTimerStandaloneModal` con due fasi (config con 4
  preset 30/60/90/120s + stepper custom; countdown con pie chart
  SVG + pulsanti +30s/pausa/termina) — `ee911d1`.
- `SportHomeScreen` riga Spotify ridisegnata: card a riga intera
  → due card 50/50 affiancate (`SpotifyCard` ridotta a icona+label,
  nuova `RestTimerCard`) — `2d9d99d`. Stili `quickActionsRow` /
  `quickActionHalf` / `quickActionCard` riusabili per future
  quick action.
- Helper `describeArc`/`polarToCartesian` estratto in
  `src/utils/svgArc.ts` (`0e85e65`) — usato da `RestTimer`,
  `RestTimerStandaloneModal`, `HoldToStartButton`,
  `CountdownOverlay`.

Niente persistenza DB (al volo per design). Niente notifiche push
(uso in foreground per design — diverso dal `RestTimer` di sessione
live coperto da [16]).

---

### [chiusa] [16] Notifiche locali per fine recupero (sessione attiva)

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-03

PR #63 commit `17e2c15` (sessione UX Polish C2). Aggiunta dipendenza
`expo-notifications` + helper centralizzato
`src/utils/restNotifications.ts` con 4 funzioni esposte
(`ensurePermission`, `scheduleRestEndNotification`,
`cancelRestEndNotification`, `invalidatePermissionCache`). Quando un
recupero parte (transizione `phase = 'rest'` in
`ActiveSessionContext`) la notifica viene schedulata con
`trigger: { seconds: restSec }`; cancellata su skip/pausa/end e
rischedulata su `extendRest` (+30s). Permessi richiesti in modo lazy
alla prima sessione, fallback silent disabled se rifiutati. Handler
`Notifications.setNotificationHandler` configurato all'inizio di
`App.tsx`. MVP solo Android — iOS può seguire in iterazione futura.

---

### [chiusa] [24] Selettore reps a scorrimento (fit)

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-03

PR #62 commit `1fb1f90` (sessione UX Polish C1). In
`ActiveSessionScreen` il campo "Reps fatte" è ora un `<WheelPicker>`
centrato sul valore prescritto (`ex.reps`), con label sotto che mostra
il delta vs prescritto ("Come prescritto" / "+N rispetto a X
prescritte" / "−N rispetto a X prescritte"). Selezione 1-2 swipe
invece di digitazione tastiera — pensato per mani sudate o telefono
appoggiato. Esercizi a tempo o senza reps prescritte preservano il
flow esistente. Pattern peso/durata NON generalizzato (MVP solo reps,
come da scope).

---

### [chiusa] [25] Migliorare timer pausa tra serie (fit)

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-03

PR #63 commit `41e3662` (sessione UX Polish C2). Tre interventi in
`RestTimer.tsx`:
- **Pie chart SVG** al posto della barra lineare — arco da -90° a
  -90° + `progress*360°` con `strokeWidth=12` e
  `strokeLinecap="round"`, color `accent` del theme. Numero del
  countdown centrato dentro il pie chart.
- **Pulsante "+30s"** che estende il recupero — nuova action
  `extendRest(seconds)` in `ActiveSessionContext` che bumpa
  `endsAt` + `restDurationSec`, persistente su DB e rischedula la
  notifica fine recupero. Disabilitato in pausa.
- **Bip negli ultimi 5 secondi** via `lightHaptic()` deduplicato con
  un Set di secondi già emessi (evita doppi haptic ai bordi del
  TICK 200ms). Skip in pausa. Niente `expo-av`: gli haptic
  rispettano già il flag `hapticEnabled`.

`onComplete` finale continua a chiamare `successHaptic()` come da
sessione A.

---

### [chiusa] [31] Migliorare UX TimerScreen (picker tipo orologio)

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-03

PR #62 commit `c55b5ea` (sessione UX Polish C1). I 3 `<Input>`
numerici (workSec / restSec / rounds) in `TimerScreen` per Tabata e
Intervalli sono stati sostituiti con 3 `<WheelPicker>` affiancati.
Range: workSec/restSec 5-300 step 5, rounds 1-30 step 1. Niente più
tastiera virtuale per configurare un timer. Modalità Libero
(count-up) preservata invariata. Il primitive `WheelPicker`
introdotto in commit `42b390a` resta riusabile per qualsiasi input
numerico ranged futuro (peso, durata, ecc.).

---

### [chiusa] [33] Permessi: rimuovere RECORD_AUDIO + verificare prompt camera

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-03

Aggiunto `"microphonePermission": false` alla config del plugin
`expo-camera` in `app.json` (commit `2f89547`, PR #58 sessione UX
Polish A). expo-camera v15 non inietta più `RECORD_AUDIO` nel
manifest finale. Il flow camera in `ScannerView.tsx:51-56` (auto-prompt
+ bottone esplicito + `Linking.openSettings()`) preservato senza
modifiche, già robusto. QA manuale del manifest a carico dell'utente
al prossimo build APK locale.

---

### [chiusa] [17] Haptic feedback / suoni su completamento set e fine recupero

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-03

Introdotta dipendenza `expo-haptics` con helper centralizzato
`src/utils/haptics.ts` che rispetta il flag `hapticEnabled` (default
true) salvato in `app_settings` (PR #58 sessione UX Polish A,
commits `7d35c49` + `842b528`). Punti di chiamata: tap "Set
completato" (light), fine countdown RestTimer (success), long-press
tab Home per switch modalità (success), toggle modalità in
Settings/SportSettings (success). Espansione di scope ragionevole
dell'operaia: haptic anche su add-food / preferito / quick-addon /
"Inizia ora" — bonus apprezzato. Toggle "Vibrazione" disponibile in
entrambe le Settings, disabilita tutti i feedback con una sola riga
grazie alla cache invalidata.

---

### [chiusa] [29] Feedback tattile al cambio modalità (fit↔fat)

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-03

Coperta dalla stessa PR #58 (commit `7d35c49`): `successHaptic()` su
long-press tab Home + toggle "Modalità app" in Settings e
SportSettings. Stesso flag `hapticEnabled` di [17] (toggle unico per
tutti i feedback dell'app, scelta UX dell'orchestratore per evitare
proliferazione di setting).

---

### [chiusa] [20] Spotify integration (deep-link MVP, OAuth Web API v2)

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-03 (versione MVP)

PR #58 commit `7540792`. Tasto "Apri Spotify" in `SportHomeScreen`
+ campo URI playlist configurabile in `SportSettings`. Apre l'app
Spotify nativa via `Linking.openURL`: se URI configurato (es.
`spotify:playlist:xyz`) parte direttamente da lì, altrimenti URI
generico `spotify:`. Fallback con Toast "Installa Spotify per
usare questa scorciatoia" se l'app non è installata. Aggiunta icona
`music` al set Icon. Versione V2 (Spotify Web API + OAuth PKCE)
NON inclusa, va riaperta come voce dedicata se richiesta in futuro.

---

### [chiusa] [26] Categorizzare elenco esercizi

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-03

PR #59 commit `0024131`. `ExercisesScreen` passa da `ScrollView`
lineare a `SectionList` con headers sticky raggruppati per
`muscleGroup`. Migliora la scansionabilità dei 40 esercizi seedati
(nomi simili tipo "Push-up / Wide push-up / Diamond push-up" ora
distinguibili a colpo d'occhio). I filtri esistenti (gruppo /
livello / attrezzo) funzionano intra-sezione, sezioni vuote
nascoste. Helper di raggruppamento estratto in
`src/utils/exerciseGrouping.ts`.

---

### [chiusa] [23] Scroll orizzontale per cambiare giorno nella home diet

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-03

PR #59 commit `60aef81`. Aggiunto `Gesture.Pan()` orizzontale su
`HomeScreen`: swipe sx avanza al giorno successivo, swipe dx torna
al precedente. Threshold conservativi (60px + velocityX 200) +
`activeOffsetX([-15, 15])` / `failOffsetY([-25, 25])` per non
interferire con lo scroll verticale. Le frecce
`chevron-left`/`chevron-right` nell'header data restano come
affordance esplicito. Riuso dei callback `goPrevDay`/`goNextDay`
già esistenti.

---


### [chiusa] [28] Aumentare durata `ModeTransitionOverlay`

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-02

Timing precedente 200+300+200 = 700ms percepito troppo veloce
nell'uso reale: il wordmark "FitTrack" / "FatTrack" si leggeva
appena. Portato a 300+800+400 = 1500ms in
`src/components/sport/ModeTransitionOverlay.tsx:23-25` (commit
`e462a1d`). Asset definitivi del wordmark restano voce [15] aperta.

---

### [chiusa] Loop infinito di query DB sulla SportHomeScreen

**Aperta**: 2026-05-02 — **Chiusa**: 2026-05-02

Bug critico segnalato in fase di primo utilizzo reale di FitTrack: app
estremamente lenta (30+ secondi di blank al primo ingresso in tab),
device che scaldava (S25 Ultra, top di gamma — escluso problema
performance hardware), pulsante "Inizia ora" e "Salva sessione" con
spinner infinito.

Root cause: `SportHomeScreen.tsx:108-114` aveva `stats` (return di
`useSportStats()`) come dipendenza di `useFocusEffect`. `stats` è un
oggetto literal `{ loading, week, last, reload }` ricreato a ogni
render. Ogni `setState` interno di `useSportStats` (3 per ogni
reload) ricreava `stats` → callback ricreata → `useFocusEffect`
rieseguiva → nuova reload → setState → loop infinito di query DB con
JS thread al 100%. Tutte le altre operazioni (mount di altre tab,
start sessione, save sessione) finivano in coda dietro la coda SQLite
saturata. Diet non aveva equivalente.

Fix in PR #57 (`fix(sport): elimina loop infinito di query DB nella
SportHomeScreen`, commit `13e5370`): dep `stats` → `stats.reload`
(memoized stabile via useCallback in `useSportStats`). Estratto come
costante per evitare falso positivo `react-hooks/exhaustive-deps`.

Anche: rimosso `useEffect([reload])` ridondante in
`SportHistoryScreen` — già coperto da `useFocusEffect` adiacente,
causava una doppia query iniziale. Niente loop ma overhead inutile.

Verifica round-trip dell'utente: clean install di APK pre-FitTrack →
restore backup utente → upgrade a APK con FitTrack post-fix → tutto
funziona, dati preservati, app scattante senza freeze.

---

### [chiusa] [12] Split `SettingsScreen` con tab Profile dedicata

**Aperta**: 2026-05-01 — **Chiusa**: 2026-05-01

Strategia adottata (proposta dell'utente, alternativa a tab bar / accordion):
nuovo `ProfileScreen` come Tab.Screen "nascosta" — non visibile in
`BottomTabBar` (esattamente come `Settings`), raggiungibile con un tap
da una nuova icona `user` nello slot `right` di `ScreenHeader` su
`HomeScreen`, accanto all'ingranaggio. Vantaggi: la tab bar resta a 5
voci con FAB Home simmetrico, semantica pulita ("io" vs "app"), il
peso (dato che cambia spesso) raggiungibile in 1 tap dalla Home.

Contenuti `ProfileScreen`:
- card identità: avatar cerchio con iniziale del nome + Input nome
  + età/sesso (autosave debounced)
- card Peso: nuovo `WeightRing` (analogo a `CalorieRing` ma per il
  peso) con peso corrente al centro, obiettivo nella label, progresso
  arco da `start_weight_kg` a `target_weight_kg` ; +/- 200g per
  l'editing rapido del peso ; delta "ti mancano X kg" sotto il ring ;
  sezione inline per impostare/modificare/rimuovere il target
- card "Dati personali": altezza, età, sesso (riusa `Input` /
  `SegmentedControl`)
- card "Livello di attività" e "Obiettivo settimanale" (riusa
  `OptionSelect`)
- card "Valori calcolati": BMR/TDEE/target calorie con `InfoTooltip`

Schema DB esteso (nullable, migrazione idempotente in `db.ts`):
`name TEXT`, `target_weight_kg REAL`, `start_weight_kg REAL`. Il campo
`startWeightKg` viene resettato al peso corrente ogni volta che
l'utente imposta o cambia il target, così il ring riparte da 0%.

`SettingsScreen` ora contiene solo: shortcut "Il tuo profilo" (link
rapido a `ProfileScreen`), QuickAddons, VersionCard, BackupCard, Test
(reset app / reset DB). Niente più scroll monolitico.

Nuovi primitives: `WeightRing`, icona `user`, icona `minus`. Il design
system non è stato modificato — solo esteso.

Foto profilo (avatar reale via gallery) rimandata alla voce [13]
perché richiede nuova dipendenza `expo-image-picker` e gestione file.

---

### [chiusa] Auto-detect OTA leftover in AndroidManifest durante prebuild

**Aperta**: 2026-05-01 — **Chiusa**: 2026-05-01

Dopo il merge della rimozione OTA, chi pullava main con una `android/`
generata in passato (quando expo-updates era attivo) vedeva prebuild
abortire perché il manifest conteneva `expo.modules.updates.EXPO_RUNTIME_VERSION`
mentre `app.json` non aveva più `runtimeVersion`. `scripts/build-android-local.bat`
ora controlla la presenza di quel meta-data e, se trovato, forza
`expo prebuild --clean` per rigenerare il manifest da zero. La keystore
stabile in `keystore/debug.keystore` non viene toccata.

---

### [chiusa] Bottone "Cerca aggiornamenti" in Settings

**Aperta**: 2026-05-01 — **Chiusa**: 2026-05-01

Il check automatico in `updateChecker.ts` ha throttle 1h, quindi dopo
una release fatta col proprio APK in mano si poteva aspettare fino a
60 min per vedere il prompt. Aggiunto `manualCheckForUpdate()` che
bypassa throttle + dismissedVersion (l'utente sta esplicitamente
chiedendo) e bottone "Cerca aggiornamenti" in `VersionCard`. Toast
per esiti `up-to-date` ed `error`; per `prompted` l'Alert si apre da solo.

---

### [chiusa] Rimozione sistema OTA / EAS Update

**Aperta**: 2026-05-01 — **Chiusa**: 2026-05-01

Sistema OTA tolto completamente: niente `expo-updates`, niente `version.json`
canali EAS, niente voce 5 OTA in `fattrack.bat`. Aggiornamenti solo via APK
nativo + prompt in-app. Vedi commit `561b400` su `claude/remove-ota-system-2g2dN`.

---

### [chiusa] Permessi duplicati Android + RECORD_AUDIO

**Aperta**: 2026-05-01 — **Chiusa**: 2026-05-01

`app.json` aveva `CAMERA`/`REQUEST_INSTALL_PACKAGES`/`RECORD_AUDIO`
duplicati. Tenuti solo `android.permission.CAMERA` e
`android.permission.REQUEST_INSTALL_PACKAGES`. Vedi commit `b5387ef`.

---

### [chiusa] Update prompt latency da raw.githubusercontent

**Aperta**: 2026-05-01 — **Chiusa**: 2026-05-01

raw.githubusercontent.com ha cache 5 min, fastidioso per hotfix.
GitHub Pages avrebbe peggiorato (10 min). Soluzione: leggere via
GitHub Releases API (zero cache, rate limit 60/h per IP, ampio per
1 fetch/utente/h). Implementato come Option B con fallback su
`version.json`. Drop completo del file rimandato a [3].
