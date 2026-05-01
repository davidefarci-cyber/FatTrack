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

### [12] Refactor `SettingsScreen`: zone separate o tab "Utente"

**Aperta**: 2026-05-01
**Area**: UX / codice

`SettingsScreen` oggi è uno scroll continuo che mescola dati personali
(peso, altezza, età, sesso, livello di attività, obiettivo
settimanale), valori calcolati (BMR/TDEE/target), aggiunte rapide,
versione/aggiornamenti, backup DB, reset. Con la voce [11] è cresciuto
ancora — la lista è ormai lunga e poco navigabile.

Due strade alternative:

1. **Sezioni collassabili o segmentate** dentro `SettingsScreen`:
   raggruppare per area (Dati personali · Attività & obiettivo · Quick
   addons · Backup · Avanzate) con accordion o tab pill in cima. Pro:
   un solo punto d'accesso, mantiene la tab bar attuale. Contro:
   accordion in RN non è bello di default, va costruito.

2. **Split in due tab**: aggiungere una nuova tab "Utente" (o
   "Profilo") con icona dedicata accanto a Settings nella `BottomTabBar`.
   Profilo → dati personali + valori calcolati. Settings → quick
   addons, backup, versione, reset. Pro: separazione semantica netta,
   schermate corte. Contro: la tab bar passa da 5 a 6 voci (FAB Home
   centrale impone simmetria → potrebbe diventare scomoda
   visivamente); va rivisto il design system della tab bar.

Decidere prima quale strategia adottare; entrambe sono coerenti col
design system se si estendono i primitives correttamente (no stili
inline arbitrari, vedi CLAUDE.md §1).

**Done quando**: la schermata impostazioni non è più uno scroll
monolitico — l'utente raggiunge una specifica sottosezione (es.
"Backup") in al massimo 2 tap dalla home; la struttura scelta è
documentata in `design/README.md` e i primitives nuovi (eventuale
`Accordion`, eventuale icona tab "Utente") rispettano i token in
`src/theme/index.ts`.

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

## ✅ Fatto

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
