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

### [3] Drop di `version.json`, solo Releases API

**Aperta**: 2026-05-01
**Area**: codice
**Dipende da**: tutti gli utenti su versione >= 1.1.x con supporto API

`updateChecker.ts` oggi prova prima la GitHub Releases API (zero cache) e
in fallback legge `version.json` su raw.githubusercontent. Il fallback
serve solo per APK già installati con la vecchia logica (~v1.1.0).

Quando tutti gli utenti hanno una versione che supporta la Releases API,
si può:
- droppare `fetchFromVersionJson` da `updateChecker.ts`
- droppare `version.json` dal repo
- ridurre `bump-version.js` a scrivere solo `app.json`
- togliere il marker `MIN_VERSION_MARKER` se nessuno usa
  `min_supported_version` (decidere: vale la pena tenere il supporto a
  release "obbligatorie"?)

**Done quando**: `updateChecker.ts` legge solo da Releases API; `version.json`
rimosso dal repo; `bump-version.js apply` scrive solo `app.json`.

---

### [4] Smoke test automatico via `adb install` dopo build

**Aperta**: 2026-05-01
**Area**: build / UX

Voce `[3] Build APK senza release` produce `fattrack-test-arm64.apk`
ma poi l'utente deve manualmente trasferire l'APK sul telefono.

Idea: aggiungere un flag o un prompt finale alla voce `[3]` che, se è
collegato un device via USB (`adb devices` non vuoto), offre l'install
diretto:
```
adb install -r ./fattrack-test-arm64.apk
adb shell am start -n com.fattrack.app/.MainActivity
```

Riduce il loop di test da ~3-5 min a ~30 sec.

**Done quando**: voce `[3]` di `fattrack.bat` rileva automaticamente
`adb` + device collegato e propone install; `adb` opzionale (se manca,
build esce normalmente).

---

### [5] Lint automatico in `:menu_release`

**Aperta**: 2026-05-01
**Area**: build

`fattrack.bat → [4] Release completa` esegue `npm run typecheck` ma non
`npm run lint` (che pure esiste in `package.json`). Errori lint non
bloccano la release ma ci possono essere bug latenti che ESLint
intercetta.

**Done quando**: voce `[4]` esegue lint dopo typecheck e prima del bump,
fallisce la release su errori (configurabile con flag `--skip-lint`).

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

### [7] Proporre PR Workflow CI

**Aperta**: 2026-05-01
**Area**: infra

Oggi push diretto su `main`. Niente CI. Una GitHub Action minimale che
esegua `npm ci && npm run typecheck && npm run lint` su ogni PR
intercetterebbe regressioni prima del merge.

**Done quando**: `.github/workflows/ci.yml` esegue typecheck + lint su
push a feature branches; il proprietario abilita il branch protection
per richiederlo prima del merge.

---

### [11] Backup / restore del database utente

**Aperta**: 2026-05-01
**Area**: codice / UX

Oggi se l'utente disinstalla l'app o se cambia la firma keystore (vedi
[2]) perde tutto: profilo, pasti, preferiti, food custom, quick addons.
SQLite vive solo nello storage interno dell'app.

Implementazione: export di tutte le tabelle come JSON unico
(`{ schemaVersion, exportedAt, appVersion, tables: { ... } }`), share
via `expo-sharing`. Import via `expo-document-picker` con `Alert` di
conferma (sostituisce tutti i dati attuali).

L'import deve essere **best-effort cross-version**: un backup fatto con
una versione vecchia dell'app deve poter essere ripristinato in una
versione più nuova caricando tutto quello che è ancora compatibile.
Niente rifiuto rigido su mismatch di `schemaVersion`. Strategia:
introspection schema corrente con `PRAGMA table_info`, intersection
colonna-per-colonna, skip righe che violano constraint, report finale
all'utente con i warning (tabelle/colonne ignorate, righe scartate).

**Done quando**: in `SettingsScreen` esistono i bottoni "Esporta backup"
e "Importa backup"; il file esportato è un JSON leggibile; l'import
sostituisce il DB, svuota la cache `mealsStore` e mostra warning se
parte dei dati non è stata ripristinata; backup di versione "futura"
(`schemaVersion` più alto del corrente) viene rifiutato con messaggio
chiaro; backup vuoti o incompatibili rollbackano la transazione invece
di azzerare il DB.

---

### [14] Backup/restore include tabelle sport mode

**Aperta**: 2026-05-02
**Area**: codice / UX
**Dipende da**: [11] (almeno la versione base esiste)

`src/utils/dbBackup.ts` ha la lista `TABLES` (linee 22-30) hardcodata
con solo le tabelle diet: `foods`, `food_servings`, `meals`,
`favorites`, `quick_addons`, `daily_settings`, `user_profile`. Le
tabelle introdotte dal progetto sport mode (Fasi 1-5, PR #51-#56) NON
sono incluse: `app_settings`, `exercises`, `workouts`,
`workout_exercises`, `sessions`, `session_sets`, `active_session`.

Effetto attuale: chi fa export e poi reimporta perde tutto il sport
(modalità app, schede personali, sessioni, libreria esercizi
custom in futuro). I preset si riseminerebbero automaticamente
(`seedPresetWorkoutsIfEmpty`), ma le sessioni/storico no.

Da fare: aggiungere le 7 tabelle sport alla lista `TABLES`, in ordine
di dipendenza FK per il restore (parents prima dei children: `exercises`
→ `workouts` → `workout_exercises` → `sessions` → `session_sets`;
`active_session` per ultimo o saltato dal backup — è uno stato
runtime, ha senso esportarlo solo se vogliamo ripristinare anche la
sessione in corso, valutare). Bumpare `SCHEMA_VERSION`. Aggiornare il
test plan dell'import.

**Done quando**: l'export di backup contiene le tabelle sport;
l'import le ripristina; un round-trip export → reset DB → import
preserva schede personali, sessioni storiche, modalità corrente,
weeklyTarget; le tabelle nuove vivono nel JSON con lo stesso pattern
di quelle esistenti (warning su tabelle sconosciute al restore di
backup vecchi).

---

### [15] Asset wordmark "FitTrack" definitivi

**Aperta**: 2026-05-02
**Area**: design / codice

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

## 🟢 Priorità bassa

### [8] Persistere il consenso `REQUEST_INSTALL_PACKAGES`

**Aperta**: 2026-05-01
**Area**: UX

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

### [16] Notifiche locali per fine recupero (sessione attiva)

**Aperta**: 2026-05-02
**Area**: UX / codice

Durante una sessione attiva (`ActiveSessionScreen`), il `RestTimer`
parte automaticamente alla fine di un set. Se l'utente sblocca il
telefono, mette il telefono in tasca, o l'app va in background, oggi
non c'è alcun alert al termine del recupero — l'utente o tiene
l'app in foreground o si perde il segnale.

`expo-notifications` permette notifiche local schedulate
(`scheduleNotificationAsync` con `trigger: { seconds: restSec }`).
Quando l'utente preme "Set completato" e parte il recupero,
schediamo anche la notifica; al "Salta recupero" / completamento /
pausa la cancelliamo.

Implica:
- aggiungere `expo-notifications` a package.json + permessi
- gestire il caso utente che non concede permessi (fallback:
  comportamento attuale)
- testare iOS vs Android (le notifiche local hanno API leggermente
  diverse)

**Done quando**: durante una sessione, al termine del recupero
arriva una notifica anche con app in background; pause/skip/end
cancellano la notifica schedulata; permessi richiesti la prima volta
con messaggio in italiano spiegando l'uso.

---

### [17] Haptic feedback / suoni su completamento set e fine recupero

**Aperta**: 2026-05-02
**Area**: UX

Il `RestTimer` finisce silenziosamente. Anche il "Set completato"
non ha feedback tattile. Per un'app sport è una mancanza
significativa: l'utente vuole vibrazione/suono breve a fine recupero
mentre sta riprendendo fiato.

Due dipendenze candidate:
- `expo-haptics` per vibrazione (già usata in molte app Expo,
  leggera)
- `expo-av` per suono (più pesante; valutare se basta solo
  haptic)

Suggerimento MVP: solo haptic (`Haptics.notificationAsync(Success)`)
a fine recupero e su tap "Set completato". Suono come iterazione
successiva.

**Done quando**: a fine recupero il device vibra brevemente; al tap
"Set completato" un haptic leggero conferma l'azione; flag
`hapticEnabled` nelle SportSettings (default true) per disattivare.

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

### [20] Spotify integration (deep-link MVP, OAuth Web API v2)

**Aperta**: 2026-05-02
**Area**: feature

Idea originale Fase 1 dell'esplorazione sport mode: accesso veloce
alla musica preferita per allenamento. Esclusa dal MVP per
complessità.

Due opzioni:
- **MVP (~1g)**: tasto "🎵 Apri Spotify" in `SportHomeScreen` o nel
  banner della sessione attiva. Usa `Linking.openURL('spotify:')` per
  aprire l'app nativa. Se l'utente vuole una playlist specifica
  (es. "Workout"), può fissarla nelle SportSettings come URI
  `spotify:playlist:xyz`. Niente OAuth, niente backend.
- **V2 (~3-5g)**: integrazione Spotify Web API con OAuth PKCE.
  Permette controllo playback in-app (play/pause/next), lettura
  della playlist corrente, ecc. Richiede redirect URI configurato e
  account Premium dell'utente per il playback control.

Suggerimento: partire da MVP e valutare se l'utente vuole di più.

**Done quando**: dalle schermate sport è raggiungibile Spotify in
1 tap; se l'utente ha configurato una playlist preferita, parte
direttamente da lì.

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

Idea proposta dall'utente in chat orchestratore senza ulteriori
specifiche. Da espandere quando l'utente chiarirà cosa intende
(counter persistente di pizze mangiate? Quick-add dedicato? Stat
nel profilo / achievement?). Segnaposto in attesa di scope.

**Done quando**: TBD — rifinire il requisito prima di stimare e
implementare.

---

## ✅ Fatto

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
