# Prompt sessione operaia — UX Polish A (haptic + permessi + Spotify)

> **Pre-requisiti**: branch `main` aggiornato (HEAD `9eafab3` o successivo).
> Branch atteso per questa sessione: `claude/ux-polish-haptic-permissions`.
> Voci TODO chiuse al merge: [17], [29], [33], [20].
> Effort stimato: ~3h.

Sessione di polish UX raggruppata per tema "feedback fisico + cleanup
permessi + integrazione esterna leggera". Tre interventi tematicamente
collegati (tutti riducono friction percepita) ma indipendenti tra loro:
si possono fare in qualsiasi ordine, un commit per intervento.

---

## Prompt da incollare

```
Sei in /home/user/FatTrack su branch main aggiornato.

Implementa la SESSIONE A di "UX Polish": tre interventi
indipendenti, un commit ciascuno.

1. [33] Cleanup permessi camera (rimuovi RECORD_AUDIO, verifica
   prompt camera).
2. [17]+[29] Haptic feedback unificato (expo-haptics): set
   completato + fine recupero + cambio modalità fit↔fat + toggle
   modalità in Settings/SportSettings.
3. [20] Spotify deep-link MVP (tasto "Apri Spotify" in SportHome
   + URI playlist preferita configurabile in SportSettings).

PRIMA DI INIZIARE leggi nell'ordine:
1. CLAUDE.md — vincoli stilistici (design system, no nuove lib UI,
   StyleSheet + tokens, italiano nei testi).
2. docs/TODO.md voci [17] [29] [33] [20] per il contesto utente.
3. src/database/appSettingsDB.ts — qui aggiungi `hapticEnabled` e
   `spotifyPlaylistUri` come nuovi campi del singleton app_settings.
   Pattern da seguire: identico a `weeklyTargetDays` (vedi commit
   Fase 5 Sport).
4. src/hooks/useAppSettings.ts — espone setter/getter; vanno
   estesi per i 2 nuovi campi.
5. src/screens/SportSettingsScreen.tsx + src/screens/SettingsScreen.tsx —
   qui aggiungi i toggle/Input per le impostazioni nuove.
6. src/components/sport/RestTimer.tsx — qui scattano gli haptic
   alla fine del countdown.
7. src/screens/sport/ActiveSessionScreen.tsx — qui scatta l'haptic
   sul tap "Set completato".
8. src/components/BottomTabBar.tsx — qui scatta l'haptic sul
   long-press Home (entrambe le direzioni di switch modalità).
9. src/screens/sport/SportHomeScreen.tsx — qui aggiungi il tasto
   Spotify nel right slot dello header (accanto al cog) o come
   bottone nella card "Allenamento di oggi" (preferito quest'ultimo
   per evitare overcrowd dell'header).
10. app.json — qui modifichi la config del plugin expo-camera.

API e file disponibili (riusa, NON ricreare):

- useAppSettings da @/hooks/useAppSettings: già espone appMode,
  sportModeSeen, weeklyTargetDays, setAppMode, ecc. Estendere per
  i 2 nuovi campi.
- useToast da @/components/Toast: per il fallback "Installa
  Spotify" e per gli esiti del cleanup permessi.
- Primitives: Card, Button, Input, Icon, ScreenHeader. NIENTE lib
  UI nuove. L'UNICA dipendenza nuova autorizzata è `expo-haptics`.

Crea il branch:

  git checkout main
  git pull --ff-only origin main
  git checkout -b claude/ux-polish-haptic-permissions

I 3 step sotto, una alla volta, con commit separato per ognuno.
Dopo ogni commit: `npm run typecheck` deve passare. Se la prima
volta `node_modules` manca, fai `npm ci`.

Niente PR: alla fine fai solo `git push -u origin
claude/ux-polish-haptic-permissions`. Sarò io a decidere il merge.

────────────────────────────────────────────────────────────────
STEP A1 — [33] Cleanup permessi camera
────────────────────────────────────────────────────────────────

Cosa fare:

1. Modifica `app.json`:
   - Plugin `expo-camera` (linee 38-43): aggiungi
     `"microphonePermission": false` accanto a `cameraPermission`.
   - Risultato:
     ```json
     [
       "expo-camera",
       {
         "cameraPermission": "FatTrack usa la fotocamera per scansionare i codici a barre dei prodotti alimentari.",
         "microphonePermission": false
       }
     ]
     ```

2. Verifica che `ScannerView.tsx:51-56` (auto-prompt camera +
   bottone esplicito + `Linking.openSettings()`) sia ancora
   coerente. NON serve toccare codice se il flow funziona.
   Leggi solo per QA mentale.

3. Smoke test (descrivi nel commit message):
   - `npx expo prebuild --clean` (se la sessione ha tempo) e
     verifica con `grep RECORD_AUDIO android/app/src/main/AndroidManifest.xml`
     che la stringa NON sia presente.
   - Se non puoi runnare prebuild: documenta nel commit che il
     QA manuale spetta all'utente al prossimo build APK locale.

Commit:

  fix(permissions): rimuovi RECORD_AUDIO dal manifest expo-camera

  Plugin expo-camera v15 inietta automaticamente RECORD_AUDIO nel
  manifest Android per supportare video recording, che FatTrack
  non usa. Risultato visibile per l'utente: alla prima apertura
  BarcodeScreen Android chiedeva anche il permesso microfono,
  confondendo (l'app fa solo barcode). Aggiunto
  microphonePermission: false alla config del plugin per
  sopprimere l'iniezione.

  Chiude TODO [33].

────────────────────────────────────────────────────────────────
STEP A2 — [17]+[29] Haptic feedback unificato
────────────────────────────────────────────────────────────────

Aggiungi expo-haptics (npm + auto-config Expo):

  npm install expo-haptics

Crea **src/utils/haptics.ts**, helper centralizzato che legge il
flag `hapticEnabled` dal singleton app_settings e fa no-op se è
false. NON chiamare mai `Haptics.*` direttamente nei consumer:
sempre attraverso questo helper, così il toggle in Settings
disabilita davvero TUTTI i feedback con una sola riga.

```ts
import * as Haptics from 'expo-haptics';
import { appSettingsDB } from '@/database';

let cachedEnabled: boolean | null = null;

export async function refreshHapticPreference() {
  const settings = await appSettingsDB.get();
  cachedEnabled = settings.hapticEnabled;
}

export async function lightHaptic() {
  if (cachedEnabled === null) await refreshHapticPreference();
  if (!cachedEnabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export async function successHaptic() {
  if (cachedEnabled === null) await refreshHapticPreference();
  if (!cachedEnabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
```

NB: la cache locale evita di leggere DB ad ogni vibrazione. Va
invalidata (`cachedEnabled = null`) quando l'utente cambia il
toggle in Settings/SportSettings — esponi una funzione
`invalidateHapticCache()` per quello scopo.

Modifica **src/database/appSettingsDB.ts**:
- Aggiungi colonna `haptic_enabled INTEGER NOT NULL DEFAULT 1`
  alla CREATE TABLE app_settings + ALTER TABLE idempotente nel
  migrate() di db.ts (pattern esistente).
- Aggiorna il tipo `AppSettings` con `hapticEnabled: boolean`.
- Aggiungi metodo `setHapticEnabled(enabled: boolean)` con la
  stessa firma di `setWeeklyTarget`.
- Mappatura SQL: `haptic_enabled AS hapticEnabled` nelle SELECT,
  conversione `enabled ? 1 : 0` nei setter.

Modifica **src/hooks/useAppSettings.ts**:
- Espone `hapticEnabled` + `setHapticEnabled(enabled)`.

Punti di chiamata haptic:

1. **src/components/sport/RestTimer.tsx** — al termine del
   countdown (transizione `seconds === 0`):
   ```ts
   import { successHaptic } from '@/utils/haptics';
   // dentro il useEffect che gestisce il timer
   if (seconds === 0) {
     successHaptic();
     onComplete?.();
   }
   ```

2. **src/screens/sport/ActiveSessionScreen.tsx** — sul tap del
   bottone "Set completato" (cerca il Pressable/Button che
   chiama `completeSet` o simile):
   ```ts
   import { lightHaptic } from '@/utils/haptics';
   // nel handler onPress
   lightHaptic();
   await completeSet(...);
   ```

3. **src/components/BottomTabBar.tsx** — nel handler del
   long-press che chiama `setAppMode()`:
   ```ts
   import { successHaptic } from '@/utils/haptics';
   // nel onLongPress dell'icona Home
   successHaptic();
   await setAppMode(targetMode);
   await markSportModeSeen();
   ```

4. **src/screens/SettingsScreen.tsx** + **SportSettingsScreen.tsx** —
   nel toggle "Modalità app" che chiama `setAppMode`:
   ```ts
   successHaptic();
   await setAppMode(...);
   ```

Toggle UX:

- **SportSettingsScreen.tsx**: aggiungi una Card "Feedback" con
  un toggle (riusa il pattern degli altri toggle se esiste, o un
  semplice Pressable + chip ON/OFF) per `hapticEnabled`. Label
  "Vibrazione su set e fine recupero". Sottotesto "Vibrazione
  breve a fine set, fine recupero e cambio modalità." All'on/off
  chiama `setHapticEnabled(value)` + `invalidateHapticCache()`.
- **SettingsScreen.tsx**: stesso toggle (UX coerente tra le 2
  modalità — flag globale unico).

Smoke test (descrivi nel commit message):
- Inizia una sessione, completa un set → device vibra.
- Aspetta fine recupero → device vibra (più marcato).
- Long-press Home → device vibra al momento dello switch.
- Toggle Settings → spegni → ripeti i 3 test → niente vibrazione.

Commit:

  feat(sport): aggiungi haptic feedback unificato (set/recupero/switch)

  Introduce expo-haptics + helper centralizzato src/utils/haptics.ts
  che rispetta il flag hapticEnabled (default true) salvato in
  app_settings. Punti di chiamata: tap "Set completato" (light),
  fine countdown RestTimer (success), long-press tab Home per
  switch modalità (success), toggle modalità in
  Settings/SportSettings (success). Toggle "Vibrazione" disponibile
  in entrambe le Settings, disabilita tutti i feedback con una
  sola riga grazie alla cache invalidata.

  Chiude TODO [17] e [29].

────────────────────────────────────────────────────────────────
STEP A3 — [20] Spotify deep-link MVP
────────────────────────────────────────────────────────────────

Modifica **src/database/appSettingsDB.ts**:
- Aggiungi colonna `spotify_playlist_uri TEXT` (nullable).
- Aggiorna AppSettings con `spotifyPlaylistUri: string | null`.
- Metodo `setSpotifyPlaylistUri(uri: string | null)`.
- ALTER TABLE idempotente in db.ts (pattern esistente).

Modifica **src/hooks/useAppSettings.ts**:
- Espone `spotifyPlaylistUri` + `setSpotifyPlaylistUri(uri)`.

Aggiungi icona **`music`** a **src/components/Icon.tsx**:
- Aggiungi `'music'` a `IconName`.
- Path SVG semplice (nota musicale): vedi pattern degli altri
  Path nello stesso file. Esempio:
  ```tsx
  case 'music':
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M9 18V5l12-2v13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={6} cy={18} r={3} stroke={color} strokeWidth={2} />
        <Circle cx={18} cy={16} r={3} stroke={color} strokeWidth={2} />
      </Svg>
    );
  ```

Modifica **src/screens/sport/SportHomeScreen.tsx**:
- Aggiungi un piccolo bottone "Apri Spotify" (Pressable + Icon
  music + Text) come Card sotto la card "Allenamento di oggi" o
  in fondo alla scroll view. Stile coerente con le altre card del
  design system (sfondo bianco, radii.lg, padding spacing.md).
- onPress:
  ```ts
  import { Linking } from 'react-native';

  const openSpotify = async () => {
    const target = spotifyPlaylistUri ?? 'spotify:';
    const supported = await Linking.canOpenURL(target);
    if (!supported) {
      toast.show('Installa Spotify per usare questa scorciatoia.');
      return;
    }
    Linking.openURL(target).catch(() => {
      toast.show('Impossibile aprire Spotify.');
    });
  };
  ```

Modifica **src/screens/sport/SportSettingsScreen.tsx**:
- Aggiungi una Card "Musica" con un Input "URI playlist Spotify"
  che salva su `setSpotifyPlaylistUri(value || null)` con
  debounce (riusa il pattern di altri Input autosalvanti se
  esiste, altrimenti onBlur).
- Sottotesto: "Es. `spotify:playlist:37i9dQZF1DX...`. Lascia
  vuoto per aprire Spotify in home."
- Validazione minima: accetta solo stringhe che iniziano per
  `spotify:` (rifiuta silenziosamente altre, mostra Toast).

Smoke test (descrivi nel commit):
- Apri SportHome → tap "Apri Spotify" senza URI configurato →
  Spotify si apre in home (se installato) o Toast (se non
  installato).
- Configura `spotify:playlist:xxx` in SportSettings → torna a
  Home → tap "Apri Spotify" → si apre direttamente la playlist.

Commit:

  feat(sport): aggiungi tasto "Apri Spotify" + URI playlist configurabile

  MVP integrazione musicale tramite deep-link Linking, niente
  OAuth/Web API. Tasto "Apri Spotify" in SportHomeScreen apre
  l'app Spotify nativa (URI generico spotify:) o una playlist
  specifica se l'utente ha configurato `spotify_playlist_uri` in
  SportSettings. Fallback con Toast se Spotify non è installato.
  Aggiunta icona "music" al set Icon.

  Chiude TODO [20] (versione MVP).

────────────────────────────────────────────────────────────────
PUSH FINALE
────────────────────────────────────────────────────────────────

  npm run typecheck     # ultima verifica
  git push -u origin claude/ux-polish-haptic-permissions

Riepiloga in chat:
- 3 commit sul branch.
- 4 voci TODO da chiudere al merge: [17], [29], [33], [20].
- Cosa ha senso QA-are manualmente sul device dopo il merge
  (lista dai 3 smoke test sopra).

Procedi.
```

---

## Note operative per chi avvia la sessione

- Tempo atteso: ~3h, dipende da quanto spesso `npm run typecheck`
  intercetta typo.
- Dipendenze nuove introdotte: `expo-haptics`. Niente lib UI nuove
  (CLAUDE.md vincolo rispettato).
- Modifiche allo schema DB: 2 colonne nuove in `app_settings`
  (`haptic_enabled`, `spotify_playlist_uri`). Idempotenti come il
  resto. Non rompono backup esistenti (le colonne mancanti vengono
  aggiunte vuote/default al migrate).
- Backup/restore: la voce [14] è ancora aperta — quando verrà
  affrontata dovrà includere `app_settings` (già nella lista da
  bumpare) e quindi anche le 2 colonne nuove "for free".

## Cosa NON includere in questa sessione (scope creep prevention)

- Niente Spotify Web API / OAuth (è per la voce [20] V2, futura).
- Niente notifiche locali fine recupero ([16]) — quella usa
  `expo-notifications`, è una dep separata, va in sessione dedicata.
- Niente refactor del RestTimer (pie chart, +30s, bip 5s) — quello
  è la voce [25] e ha scope proprio.
- Niente cambio architetturale al BottomTabBar oltre alla riga
  haptic.
- Niente edit a CLAUDE.md o ORCHESTRATOR_HANDOFF.md (sono dell'orchestratore).
