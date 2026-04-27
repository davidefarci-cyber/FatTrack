import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Alert, AppState, Linking, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';

// URL pubblico del manifest di versione: ospitato come file statico nel repo
// GitHub, quindi non serve alcun backend. Raw content è servito con CORS
// aperto e TLS, è un buon canale per check leggeri.
const VERSION_JSON_URL =
  'https://raw.githubusercontent.com/davidefarci-cyber/fattrack/main/version.json';

// Timeout corto: se la connessione è lenta o assente non vogliamo far
// comparire un alert a schermo tardivo o rallentare il lancio.
const FETCH_TIMEOUT_MS = 5000;

// Per il check in foreground: throttling a 1 ora, così rientrare in app
// 50 volte al giorno non spamma fetch.
const FOREGROUND_RECHECK_MS = 60 * 60 * 1000;

let lastCheckAt = 0;
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
  // Throttle: niente fetch se abbiamo controllato di recente.
  if (Date.now() - lastCheckAt < FOREGROUND_RECHECK_MS) return;
  void runCheck();
}

async function runCheck(): Promise<void> {
  if (isPromptOpen) return;
  lastCheckAt = Date.now();

  try {
    const remote = await fetchRemoteVersion();
    if (!remote) return;

    const current = getCurrentVersion();
    if (!current) return;

    if (compareVersions(remote.version, current) > 0) {
      const isMandatory =
        remote.minSupportedVersion !== null &&
        compareVersions(current, remote.minSupportedVersion) < 0;
      promptUpdate(remote, isMandatory);
    }
  } catch {
    // Silenziosi per design: update check è un "nice to have".
  }
}

function getCurrentVersion(): string | null {
  return Constants.expoConfig?.version ?? null;
}

async function fetchRemoteVersion(): Promise<RemoteVersion | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(VERSION_JSON_URL, {
      signal: controller.signal,
      // Evita cache del CDN di GitHub: manifest è piccolo e vogliamo
      // sempre la versione fresh.
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    if (!isRemoteVersionPayload(data)) return null;
    return {
      version: data.version,
      apkUrl: data.apk_url,
      minSupportedVersion:
        typeof data.min_supported_version === 'string'
          ? data.min_supported_version
          : null,
      notes: typeof data.notes === 'string' ? data.notes : '',
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function isRemoteVersionPayload(
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
    // Pulisci eventuali residui di tentativi precedenti.
    try {
      await FileSystem.deleteAsync(target, { idempotent: true });
    } catch {
      // ignore
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
