# FatTrack

App mobile (Expo + React Native + TypeScript) per tracciare grassi e calorie
consumati, con scansione dei codici a barre dei prodotti alimentari e diario
giornaliero in locale (SQLite).

## Stack

- **Expo SDK 51** + **React Native 0.74** + **TypeScript**
- **React Navigation** (native-stack + bottom-tabs)
- **expo-sqlite** per il database locale
- **expo-camera** + **expo-barcode-scanner** per la scansione
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
    ├── screens/            # Schermate (Home, Diary, Stats, Settings, Scanner, ProductDetail)
    ├── components/         # Componenti UI riutilizzabili
    ├── database/           # Apertura DB SQLite + migrazioni
    ├── hooks/              # Custom hooks (es. usePreferences)
    ├── utils/              # Funzioni di utilità (calcoli nutrizionali, ecc.)
    └── types/              # Tipi condivisi
```

---

## 0. Setup rapido su Windows (script)

Se sei su Windows 10/11 e hai solo VS Code installato, puoi usare lo script
`setup.bat` incluso nel repo. Fa tutto da solo: installa **Git**, **Node.js
LTS** (via `winget`), **EAS CLI**, clona il repo e lancia `npm install`.
Rilanciandolo in seguito, esegue `git pull` e aggiorna le dipendenze.

Scarica lo script in una cartella di lavoro (es. `C:\dev`) e lancialo:

```powershell
# da PowerShell, nella cartella di lavoro in cui vuoi clonare
iwr -Uri https://raw.githubusercontent.com/davidefarci-cyber/fattrack/main/setup.bat -OutFile setup.bat
.\setup.bat
```

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
> `expo-barcode-scanner` / `expo-camera` (vedi `app.json`).

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

> Se preferisci buildare localmente (senza server Expo):
> ```bash
> eas build --platform android --profile preview --local
> ```
> Richiede **Android SDK** e **JDK 17** installati.

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

Hai due strade, non mutuamente esclusive.

### 5.1 Nuova build APK (aggiornamenti di codice nativo)

Per ogni cambiamento ai pacchetti nativi, a `app.json`, a permessi o alla
versione di Expo SDK **devi** rifare la build:

```bash
# incrementa version/versionCode se necessario
npm run build:android:production
```

Distribuisci il nuovo APK agli utenti — l'installazione sovrascrive la
versione precedente mantenendo i dati locali (SQLite + AsyncStorage).

### 5.2 Aggiornamenti OTA con EAS Update (aggiornamenti JS/asset)

Per fix veloci di solo JavaScript / asset, senza ribuildare l'APK:

```bash
# una tantum
npx expo install expo-updates
eas update:configure

# pubblica un aggiornamento sul canale "production"
eas update --branch production --message "fix calcolo kcal"
```

Gli utenti riceveranno l'update al successivo avvio dell'app (o al prossimo
ritorno in foreground, a seconda della configurazione di `expo-updates`).

> **Regola generale:** modifiche a `package.json` con nuovi pacchetti nativi
> ⇒ serve **nuova build APK**. Modifiche solo JS/TS/asset ⇒ basta **EAS
> Update**.

---

## Script disponibili

| Script | Descrizione |
| --- | --- |
| `npm run start` | Avvia il dev server Expo |
| `npm run android` | Avvia il dev server e apre su Android |
| `npm run ios` | Avvia il dev server e apre su iOS (solo macOS) |
| `npm run typecheck` | Controllo TypeScript senza emettere output |
| `npm run build:android:preview` | Build EAS profilo preview (APK) |
| `npm run build:android:production` | Build EAS profilo production (APK) |

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
