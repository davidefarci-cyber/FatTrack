# FatTrack

App mobile (Expo + React Native + TypeScript) per tracciare grassi e calorie
consumati, con scansione dei codici a barre dei prodotti alimentari e diario
giornaliero in locale (SQLite).

## Stack

- **Expo SDK 51** + **React Native 0.74** + **TypeScript**
- **React Navigation** (native-stack + bottom-tabs)
- **expo-sqlite** per il database locale
- **expo-camera** (`<CameraView onBarcodeScanned>`) per la scansione barcode
- **@react-native-async-storage/async-storage** per le preferenze utente

## Struttura del progetto

```
FatTrack/
├── App.tsx                 # Entry point con NavigationContainer
├── index.ts                # registerRootComponent
├── app.json                # Configurazione Expo
├── eas.json                # Profili di build EAS
├── babel.config.js
├── tsconfig.json
├── .env.example
└── src/
    ├── screens/            # Schermate (Barcode, Favorites, Home, History, Settings)
    ├── components/         # Primitives del design system (Icon, Card, Input, ScreenHeader, CalorieRing, BottomTabBar)
    ├── theme/              # Design tokens (colors, typography, spacing, ecc.) — fonte di verità stilistica
    ├── database/           # Apertura DB SQLite + migrazioni + CRUD per entità
    ├── hooks/              # Custom hooks (useFonts, useProfile, usePreferences)
    ├── utils/              # Funzioni di utilità (calcoli nutrizionali, ecc.)
    └── types/              # Tipi condivisi
```

> **Stai sviluppando una nuova feature?** Leggi prima [`CLAUDE.md`](./CLAUDE.md)
> (regole di progetto, priorità del design system) e
> [`design/README.md`](./design/README.md) (mappatura design ↔ codice).
> Il design handoff ha **priorità assoluta** su ogni nuova UI.

---

## 0. Setup rapido su Windows (script)

Se sei su Windows 10/11 e hai solo VS Code installato, puoi usare lo script
`setup.bat`. Fa tutto da solo: installa **Git**, **Node.js LTS** (via
`winget`), **EAS CLI**, clona il repo e lancia `npm install`. Rilanciandolo in
seguito, esegue `git pull` e aggiorna le dipendenze.

Scarica lo script in una cartella di lavoro (es. `C:\dev`) e lancialo:

```powershell
# da PowerShell, nella cartella in cui vuoi clonare
iwr -Uri https://raw.githubusercontent.com/davidefarci-cyber/fattrack/main/setup.bat -OutFile setup.bat
.\setup.bat
```

A fine setup `setup.bat` ti propone di lanciare direttamente
**`fattrack.bat`**, il menu unico da cui parte tutto il workflow
quotidiano (dev server, build APK, release, gestione dipendenze).

> Se `winget` non è installato, lo script ti manda al link di "App Installer"
> sul Microsoft Store; installa e rilancia. Dopo che Git o Node.js vengono
> installati la prima volta, chiudi il prompt, riaprilo, e rilancia lo script:
> serve perché il `PATH` aggiornato è visibile solo ai **nuovi** prompt.

---

## 1. Setup ambiente (manuale)

### 1.1 Node.js

Installa **Node.js LTS ≥ 18** (consigliato 20).

```bash
# via nvm (consigliato)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install --lts
nvm use --lts
node -v
npm -v
```

### 1.2 Expo CLI ed EAS CLI

A partire da Expo SDK 50+ la CLI viene invocata tramite `npx expo`, quindi non
è necessaria un'installazione globale. Per le build cloud serve invece EAS CLI:

```bash
npm install -g eas-cli
eas --version
```

### 1.3 Account Expo

1. Crea un account gratuito su <https://expo.dev/signup>.
2. Effettua il login dalla CLI:
   ```bash
   eas login
   eas whoami
   ```

### 1.4 App Expo Go su smartphone

Installa **Expo Go** dal Play Store (Android) o App Store (iOS). Serve per
provare l'app in sviluppo senza installare nulla sul dispositivo.

---

## 2. Avvio in sviluppo (Expo Go)

Dal root del progetto:

```bash
# 1. installa le dipendenze
npm install

# 2. copia le variabili d'ambiente
cp .env.example .env

# 3. avvia il dev server
npm run start
```

Si apre la Expo DevTools nel terminale. Da qui:

- Premi **a** per aprire su emulatore Android (se installato Android Studio).
- Premi **i** per aprire su simulatore iOS (solo su macOS).
- Oppure scansiona il QR code con **Expo Go** sul telefono (stessa rete Wi-Fi).

> **Nota sui permessi.** La prima volta che apri la schermata Scanner, il
> sistema chiederà il permesso di accesso alla fotocamera. È gestito da
> `expo-camera` (vedi `app.json`).

> **Nota su `expo-sqlite`.** Funziona solo su device/emulatore, non su web.

---

## 3. Build APK con EAS

Expo Go non basta per distribuire l'app: per un APK installabile serve una
**build EAS**.

### 3.1 Prima configurazione (solo la prima volta)

```bash
eas login
eas build:configure
```

Il comando crea / aggiorna `eas.json` e imposta `expo.extra.eas.projectId` in
`app.json`. In questo repo `eas.json` è già presente con tre profili:

- `development` – APK di sviluppo con dev client.
- `preview` – APK interno per testing (consigliato per installazione manuale).
- `production` – APK finale con auto-increment del `versionCode`.

### 3.2 Build preview (APK da installare a mano)

```bash
npm run build:android:preview
# equivalente a:
eas build --platform android --profile preview
```

La build gira sui server Expo. Al termine avrai:

- un link `https://expo.dev/...` con la pagina della build,
- un link diretto al file `.apk` da scaricare.

### 3.3 Build production

```bash
npm run build:android:production
```

Stesso flusso, ma `versionCode` incrementato automaticamente.

### 3.4 Build LOCALE (Windows native, senza EAS cloud)

> ⚠️ `eas build --local` **non è supportato su Windows** (limitazione
> hard di `eas-cli`). Su Windows passiamo per **`expo prebuild` + Gradle
> diretto**, gestito da `scripts/build-android-local.bat`.

Vantaggi vs cloud EAS:
- Niente coda Expo, niente upload del bundle.
- Prima build 5-10 min (download Gradle wrapper + dipendenze).
- Build successive **1-3 min** (Gradle incrementale).

Prerequisiti: **JDK 17** + **Android SDK**. Installati on-demand al
primo run di `fattrack.bat` quando scegli "Build APK rapido" o "Release"
con build locale (vedi più sotto).

**Setup automatico toolchain.** Quando scegli una build locale dal menu
di `fattrack.bat`, lo script rileva se `JAVA_HOME` / `ANDROID_HOME`
mancano e si offre di installare tutto:

- JDK 17 Adoptium Temurin (via `winget`)
- Android `cmdline-tools` (download diretto da Google, ~150 MB)
- `platform-tools`, `platforms;android-34`, `build-tools;34.0.0` (via `sdkmanager`)
- Accettazione automatica delle licenze SDK
- `JAVA_HOME` / `ANDROID_HOME` / `PATH` settati a livello User (persistenti)
  e nella sessione corrente

Il lavoro lo fa `scripts/install-android-build-tools.ps1`. Spazio richiesto
~1.5 GB, tempo 5-10 minuti la prima volta, zero le successive.

**Build:**

```bash
# Lancia il menu unico e scegli l'opzione 3 (Build APK rapido).
fattrack.bat
```

Al prompt scegli l'ABI (default `arm64-v8a`). Output: `fattrack-test-<abi>.apk`
nella root del repo.

Per uno script di build diretto (senza menu) puoi invocare lo step Gradle
sotto al cofano:

```bash
scripts\build-android-local.bat arm64-v8a fattrack-test.apk
```

**Cosa fa lo script sotto al cofano** (`scripts/build-android-local.bat`):

1. `npx expo prebuild --platform android --no-install` — genera la
   cartella `android/` dal tuo `app.json` (i config plugin di
   `expo-camera`, ecc. vengono applicati qui).
2. **Keystore management** — la prima volta backuppa
   `android/app/debug.keystore` in `keystore/debug.keystore` (root del
   repo, gitignored). Le volte successive ripristina sempre quella
   stessa keystore prima di buildare → tutte le release sono firmate
   con la stessa chiave → Android accetta gli update senza
   disinstallazione.
3. `cd android && gradlew.bat assembleRelease -PreactNativeArchitectures=<abi>`.
4. Copia `android/app/build/outputs/apk/release/app-release.apk` in root
   col nome richiesto.

**ABI di default = arm64-v8a** (~30-40 MB invece di ~90 della build
universal). Coperti tutti gli smartphone Android moderni (>= 2017 circa).
Se devi passare l'APK a un device vecchio, scegli `armeabi-v7a` al
prompt.

> ⚠️ **`keystore/debug.keystore` è la firma di TUTTE le tue release.**
> Non è committato ma deve sopravvivere a ogni rebuild. Fanne una copia
> su Drive/USB. Se lo perdi, gli utenti dovranno disinstallare l'app
> per poter installare versioni nuove (Android rifiuta APK con firma
> diversa da quello già installato).

> Per build CLOUD (es. da macchina senza Android SDK), nel menu
> `fattrack.bat` scegli **Release completa → Cloud EAS**, oppure
> esegui `npm run build:android:preview`. L'env in `eas.json`
> (`ORG_GRADLE_PROJECT_reactNativeArchitectures`) assicura che anche
> le build cloud siano arm64-only.

---

## 4. Installazione dell'APK su Android (sideloading)

1. Scarica il file `.apk` dal link fornito da EAS (puoi aprirlo direttamente
   dal browser del telefono oppure scaricarlo sul PC e trasferirlo via USB).
2. Sul telefono Android, abilita l'installazione da origini sconosciute:
   **Impostazioni → App → Accesso speciale → Installa app sconosciute →**
   seleziona il browser / file manager che userai e abilita il permesso.
3. Apri il file `.apk` dal file manager e tocca **Installa**.
4. Se Play Protect avvisa che l'app non è verificata, scegli **Installa
   comunque** (è normale per APK non pubblicati sul Play Store).
5. Avvia l'app **FatTrack** dal drawer.

### Installazione via ADB (alternativa)

```bash
# con telefono collegato in USB debugging
adb install -r ./fattrack-preview.apk
```

---

## 5. Gestione degli aggiornamenti

FatTrack distribuisce gli aggiornamenti **solo via APK nativo**: ogni
release produce un nuovo `fattrack.apk` pubblicato su GitHub Release, e
l'app installata mostra un prompt all'utente quando vede una versione
più recente. Niente OTA / EAS Update: bundle JS e codice nativo viaggiano
sempre insieme, fine dei runtime mismatch.

### 5.1 Setup una tantum

Per le GitHub Release serve la **GitHub CLI**:

```powershell
winget install --id GitHub.cli -e
gh auth login
```

Per la build cloud EAS serve anche `eas` autenticato (la build locale non
ne ha bisogno):

```bash
eas login
eas init   # solo se manca expo.extra.eas.projectId in app.json
```

### 5.2 Release completa con APK (menu `[4]`)

Da `fattrack.bat` scegli **`[4] Release completa`**. Lo script gestisce
**tutto in automatico** con controlli di sicurezza:

1. **Pre-check**: presenza di `node`, `git`, `gh`, `node_modules`,
   identità git configurata, login `gh` attivo.
2. **Branch check**: deve essere `main`, working tree pulito, fa `git pull
   --ff-only`.
3. **Typecheck** (`npm run typecheck`) prima di andare avanti.
4. **Bump versione**: ti propone `patch` / `minor` / `major` / custom partendo
   dalla versione attuale di `app.json`. Verifica che il tag non esista già né
   in locale né sul remoto.
5. **Note di rilascio**: apre `notepad` con un template; quello che scrivi
   finisce sia su `version.json` (mostrato nell'alert in-app) sia nella
   GitHub Release.
6. **Scelta build**: locale (veloce; se JDK 17 / Android SDK mancano lo
   script li installa automaticamente — vedi §3.4) o cloud EAS (lenta, ma
   nessun prerequisito locale).
7. **Build production** con `--output fattrack.apk` (locale) o download
   automatico dall'artifact EAS (cloud).
8. **Commit + tag + push**: `release: vX.Y.Z`, tag `vX.Y.Z`, push di `main`
   e del tag.
9. **GitHub Release**: `gh release create vX.Y.Z fattrack.apk` con title e
   note di rilascio.
10. **Rollback automatico** di `app.json`/`version.json` se qualcosa fallisce
    prima del commit.

L'APK è caricato come asset con nome stabile `fattrack.apk`, quindi
`version.json` può puntare al link **permanente**:

```
https://github.com/davidefarci-cyber/fattrack/releases/latest/download/fattrack.apk
```

Niente edit manuale di `version.json` ad ogni release: lo script lo fa per te.

### 5.3 Cosa succede lato utente

`src/utils/updateChecker.ts`:

- Al lancio dell'app + a ogni ritorno in foreground (max 1 volta/ora) fa fetch
  di `version.json` su `raw.githubusercontent.com`.
- Se la remota è più alta della locale, mostra un `Alert` con titolo, le note
  di rilascio e i bottoni **Dopo** / **Aggiorna**.
- Su **Aggiorna**: scarica l'APK in cache via `expo-file-system`, poi apre
  l'installer di sistema con `expo-intent-launcher` (`ACTION_VIEW` +
  `FLAG_GRANT_READ_URI_PERMISSION`). Un solo tap, niente browser.
- Se imposti `min_supported_version` ≥ versione utente, l'alert diventa
  **bloccante** (niente bottone "Dopo").

> **Permesso `REQUEST_INSTALL_PACKAGES`** è già dichiarato in `app.json`. La
> prima volta che l'utente preme "Aggiorna", Android chiederà di abilitare
> "Installa app sconosciute" per FatTrack. È normale, non è un errore.

> `version.json` usa il pattern `MAJOR.MINOR.PATCH`. Il confronto è numerico
> per segmento: ricorda di usare solo cifre (niente `1.0.1-beta`).

---

## Script disponibili

### npm

| Script | Descrizione |
| --- | --- |
| `npm run start` | Avvia il dev server Expo |
| `npm run android` | Avvia il dev server e apre su Android |
| `npm run ios` | Avvia il dev server e apre su iOS (solo macOS) |
| `npm run typecheck` | Controllo TypeScript senza emettere output |
| `npm run build:android:preview` | Build EAS cloud profilo preview |
| `npm run build:android:production` | Build EAS cloud profilo production |

### .bat (Windows)

| Script | Descrizione |
| --- | --- |
| `setup.bat` | Bootstrap pre-clone: Git, Node, EAS, clone repo, `npm install`. Lanciabile dalla cartella in cui vuoi clonare il repo. |
| `fattrack.bat` | **Menu unico** per tutto il workflow quotidiano: aggiorna repo, dev server (Expo Go), build APK rapido, release completa, gestione dipendenze. |
| `scripts\build-android-local.bat` | Helper interno: `expo prebuild` + Gradle assemble release. Invocato dalle voci di build di `fattrack.bat`. |
| `scripts\ensure-git-push-auth.bat` | Helper interno: ripulisce token in URL remote + configura `gh` come credential helper. Invocato da `fattrack.bat → release` e da `setup.bat`. |
| `scripts\install-android-build-tools.ps1` | Installer toolchain Android (JDK 17 + cmdline-tools + sdk packages). Invocato in automatico quando serve. |
| `scripts\detect-lan-ip.ps1` | Helper interno: rileva l'IP LAN per Expo Go. Invocato da `fattrack.bat → dev server`. |

---

## Risoluzione problemi

- **"Network response timed out"** su Expo Go → il telefono e il PC devono
  essere sulla **stessa rete Wi-Fi**, oppure usa tunnel: `npm run start -- --tunnel`.
- **Fotocamera non si apre** → assicurati di aver concesso il permesso in
  Impostazioni → App → FatTrack → Permessi.
- **Build EAS fallisce per credenziali Android** → la prima volta EAS ti
  chiede se vuoi che generi un keystore: rispondi **Yes** (salvato in cloud).
- **`expo-sqlite` undefined su web** → è atteso: l'app va testata su device
  Android/iOS o emulatore.
