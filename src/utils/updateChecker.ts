import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Alert, AppState, Linking, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';

// Endpoint primario: GitHub Releases API. Restituisce sempre il latest
// release in tempo reale (cache pubblico ~assente), tag_name è la versione,
// body contiene le note, asset .apk il link al binario. Vantaggi vs.
// raw.githubusercontent: zero latenza dopo una nuova release (raw cache
// max-age=300, fino a 5 minuti di delay).
const RELEASES_API_URL =
  'https://api.github.com/repos/davidefarci-cyber/fattrack/releases/latest';

// Fallback: il vecchio version.json su raw. Lo usiamo come backup se
// l'API è 403/429 (rate limit) o l'utente è su un APK <= 1.1.0 che
// scarichera la prima release post-migrazione: lì il body della release
// non è ancora taggato col marker min, quindi version.json resta utile.
// TODO(tech-debt #ota-cache): quando tutti gli utenti saranno >= 1.1.x con
// supporto Releases API, droppare version.json. Vedi docs/TECH_DEBT.md.
const VERSION_JSON_URL =
  'https://raw.githubusercontent.com/davidefarci-cyber/fattrack/main/version.json';

// Marker nel body della release per indicare la versione minima ancora
// supportata. Esempio: "<!-- min:1.0.0 -->" all'inizio o fine del body.
// Il commento HTML è invisibile nella UI di GitHub e nell'Alert dell'app
// (lo strippiamo prima di mostrare le note).
const MIN_VERSION_MARKER = /<!--\s*min:\s*([0-9.]+)\s*-->/i;

// Nome dell'asset da scaricare dalla release. Il flusso di rilascio
// pubblica sempre l'APK con questo nome stabile.
const APK_ASSET_NAME = 'fattrack.apk';

// Timeout corto: se la connessione è lenta o assente non vogliamo far
// comparire un alert a schermo tardivo o rallentare il lancio.
const FETCH_TIMEOUT_MS = 5000;

// Throttling a 1 ora: vale sia su foreground transitions sia su cold-start.
// Persistito in AsyncStorage così riavviare l'app non bypassa il limite.
const RECHECK_MS = 60 * 60 * 1000;

const STORAGE_KEY_LAST_CHECK = '@fattrack/updateCheck/lastCheckAt';
const STORAGE_KEY_DISMISSED = '@fattrack/updateCheck/dismissedVersion';

let isPromptOpen = false;
let appStateSubscribed = false;

type RemoteVersion = {
  version: string;
  apkUrl: string;
  minSupportedVersion: string | null;
  notes: string;
};

// Entry point: fire-and-forget dall'App.tsx. Non lancia mai: qualunque
// errore (offline, JSON malformato, ecc.) viene soffocato.
// Si registra anche un listener AppState così se l'utente lascia l'app
// aperta in background per un po', al rientro ricontrolla.
export async function checkForUpdates(): Promise<void> {
  if (!appStateSubscribed) {
    appStateSubscribed = true;
    AppState.addEventListener('change', handleAppStateChange);
  }
  await runCheck();
}

function handleAppStateChange(state: AppStateStatus) {
  if (state !== 'active') return;
  void runCheck();
}

async function runCheck(): Promise<void> {
  if (isPromptOpen) return;

  // Throttle persistito: rispettato anche al cold-start.
  const lastCheckAt = await readLastCheckAt();
  if (Date.now() - lastCheckAt < RECHECK_MS) return;
  void AsyncStorage.setItem(STORAGE_KEY_LAST_CHECK, String(Date.now()));

  try {
    const remote = await fetchRemoteVersion();
    if (!remote) return;

    const current = getCurrentVersion();
    if (!current) return;

    if (compareVersions(remote.version, current) > 0) {
      const isMandatory =
        remote.minSupportedVersion !== null &&
        compareVersions(current, remote.minSupportedVersion) < 0;

      // Se l'utente ha già detto "Dopo" per questa versione e l'update non è
      // obbligatorio, non riprompare finché non esce una versione successiva.
      if (!isMandatory) {
        const dismissed = await AsyncStorage.getItem(STORAGE_KEY_DISMISSED);
        if (dismissed === remote.version) return;
      }

      promptUpdate(remote, isMandatory);
    }
  } catch {
    // Silenziosi per design: update check è un "nice to have".
  }
}

async function readLastCheckAt(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_LAST_CHECK);
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function getCurrentVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

async function fetchRemoteVersion(): Promise<RemoteVersion | null> {
  // Prova prima la Releases API (zero cache, fresh sempre); se torna null
  // (rate limit, network, payload inatteso) cade sul vecchio version.json.
  const fromApi = await fetchFromReleasesApi();
  if (fromApi) return fromApi;
  return fetchFromVersionJson();
}

async function fetchFromReleasesApi(): Promise<RemoteVersion | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(RELEASES_API_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isReleasesApiPayload(data)) return null;

    // tag_name su GitHub è "vX.Y.Z": strip della "v" iniziale per allinearsi
    // al formato di expoConfig.version (X.Y.Z).
    const version = data.tag_name.replace(/^v/i, '');
    if (!/^\d+(\.\d+){0,2}$/.test(version)) return null;

    const asset = data.assets.find((a) => a.name === APK_ASSET_NAME);
    if (!asset) return null;

    const body = typeof data.body === 'string' ? data.body : '';
    const minMatch = body.match(MIN_VERSION_MARKER);
    const minSupportedVersion = minMatch ? minMatch[1] : null;
    const notes = body.replace(MIN_VERSION_MARKER, '').trim();

    return {
      version,
      apkUrl: asset.browser_download_url,
      minSupportedVersion,
      notes,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchFromVersionJson(): Promise<RemoteVersion | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(VERSION_JSON_URL, {
      signal: controller.signal,
      // Evita cache del CDN di GitHub: manifest è piccolo e vogliamo
      // sempre la versione fresh. Nota: raw.githubusercontent ha comunque
      // max-age=300 lato server, quindi questo `no-store` aiuta solo lato
      // RN/OkHttp.
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isVersionJsonPayload(data)) return null;
    return {
      version: data.version,
      apkUrl: data.apk_url,
      minSupportedVersion:
        typeof data.min_supported_version === 'string'
          ? data.min_supported_version
          : null,
      notes: typeof data.notes === 'string' ? data.notes : '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function isReleasesApiPayload(
  data: unknown,
): data is {
  tag_name: string;
  body?: unknown;
  assets: Array<{ name: string; browser_download_url: string }>;
} {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.tag_name !== 'string') return false;
  if (!Array.isArray(obj.assets)) return false;
  return obj.assets.every(
    (a) =>
      a &&
      typeof a === 'object' &&
      typeof (a as Record<string, unknown>).name === 'string' &&
      typeof (a as Record<string, unknown>).browser_download_url === 'string',
  );
}

function isVersionJsonPayload(
  data: unknown,
): data is {
  version: string;
  apk_url: string;
  min_supported_version?: unknown;
  notes?: unknown;
} {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.version === 'string' && typeof obj.apk_url === 'string';
}

// Confronto semver leggero: gestisce stringhe dot-separated numeriche.
// Ritorna 1 se a > b, -1 se a < b, 0 se uguali. Segmenti non numerici
// sono trattati come 0 (es. "1.0.0-beta" ≈ "1.0.0").
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(toInt);
  const pb = b.split('.').map(toInt);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const x = pa[i] ?? 0;
    const y = pb[i] ?? 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function toInt(segment: string): number {
  const n = parseInt(segment, 10);
  return Number.isFinite(n) ? n : 0;
}

function buildAlertBody(remote: RemoteVersion): string {
  const head = `È disponibile la versione ${remote.version}.`;
  if (!remote.notes) return `${head}\n\nVuoi scaricarla ora?`;
  return `${head}\n\n${remote.notes}`;
}

function promptUpdate(remote: RemoteVersion, isMandatory: boolean): void {
  isPromptOpen = true;

  const buttons: { text: string; style?: 'cancel'; onPress?: () => void }[] = [];
  if (!isMandatory) {
    buttons.push({
      text: 'Dopo',
      style: 'cancel',
      onPress: () => {
        // Persisti la dismissione: niente prompt finché non esce una versione
        // diversa da questa (anche dopo cold-start).
        void AsyncStorage.setItem(STORAGE_KEY_DISMISSED, remote.version);
        isPromptOpen = false;
      },
    });
  }
  buttons.push({
    text: 'Aggiorna',
    onPress: () => {
      void downloadAndInstall(remote);
    },
  });

  Alert.alert(
    isMandatory ? 'Aggiornamento richiesto' : 'Aggiornamento disponibile',
    buildAlertBody(remote),
    buttons,
    { cancelable: !isMandatory },
  );
}

// Scarica l'APK in cache locale e apre il prompt nativo di installazione.
// Su Android usa Intent ACTION_VIEW con FLAG_GRANT_READ_URI_PERMISSION e
// il content:// URI risolto da expo-file-system, così PackageInstaller
// può leggere il file. Su iOS / fallback apre l'URL nel browser.
async function downloadAndInstall(remote: RemoteVersion): Promise<void> {
  if (Platform.OS !== 'android') {
    isPromptOpen = false;
    Linking.openURL(remote.apkUrl).catch(() => undefined);
    return;
  }

  try {
    const cacheDir = FileSystem.cacheDirectory;
    if (!cacheDir) throw new Error('cacheDirectory not available');

    const target = `${cacheDir}fattrack-${remote.version}.apk`;
    // Pulisci dalla cache tutti gli APK FatTrack residui (versioni
    // precedenti, install annullati, target di un tentativo parziale)
    // prima di scaricare quello nuovo. Senza questo cleanup gli APK si
    // accumulano in cacheDir (~30-40 MB ciascuno) finche' Android non
    // decide di liberare spazio o l'utente svuota la cache a mano.
    try {
      const entries = await FileSystem.readDirectoryAsync(cacheDir);
      await Promise.all(
        entries
          .filter((name) => /^fattrack-.+\.apk$/.test(name))
          .map((name) =>
            FileSystem.deleteAsync(`${cacheDir}${name}`, { idempotent: true }),
          ),
      );
    } catch {
      // Best-effort: downloadAsync sovrascrive comunque il target.
    }

    const { uri, status } = await FileSystem.downloadAsync(remote.apkUrl, target);
    if (status >= 400) {
      throw new Error(`download failed: HTTP ${status}`);
    }

    // contentUri risolve un content:// URI su cui PackageInstaller può leggere.
    const contentUri = await FileSystem.getContentUriAsync(uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      type: 'application/vnd.android.package-archive',
    });
  } catch {
    // Fallback: apri l'URL nel browser, l'utente scarica e installa a mano.
    Linking.openURL(remote.apkUrl).catch(() => undefined);
  } finally {
    isPromptOpen = false;
  }
}
