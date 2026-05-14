import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';
import * as IntentLauncher from 'expo-intent-launcher';
import { Alert, AppState, Linking, Platform } from 'react-native';
import type { AppStateStatus } from 'react-native';

import { compareVersions } from './semver';

// GitHub Releases API: cache lato server praticamente assente, tag_name è
// la versione, body contiene le note, asset .apk il link al binario.
const RELEASES_API_URL =
  'https://api.github.com/repos/davidefarci-cyber/fattrack/releases/latest';

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
  notes: string;
};

// Esito del check per il flusso "manuale" (bottone in Settings). Il check
// automatico in App.tsx non lo usa: gli interessa solo l'effetto collaterale
// del prompt, non l'esito.
export type ManualCheckResult =
  | 'prompted' // Alert di aggiornamento aperto
  | 'up-to-date' // gia' all'ultima versione
  | 'error'; // network / payload / runtime non determinabile

// Entry point: invocato dall'App.tsx al cold-start. Non lancia mai:
// qualunque errore (offline, JSON malformato, ecc.) viene soffocato.
// Ritorna l'esito così il chiamante può orchestrare check successivi
// (es. il popup "in arrivo" non si mostra se l'alert update è aperto).
// Si registra anche un listener AppState così se l'utente lascia l'app
// aperta in background per un po', al rientro ricontrolla.
export async function checkForUpdates(): Promise<ManualCheckResult> {
  if (!appStateSubscribed) {
    appStateSubscribed = true;
    AppState.addEventListener('change', handleAppStateChange);
  }
  return runCheck();
}

// Variante invocata dal bottone "Cerca aggiornamenti" in Settings:
// bypassa throttle e dismissedVersion (l'utente ha esplicitamente chiesto
// un check) e ritorna l'esito così la UI può mostrare un toast.
export function manualCheckForUpdate(): Promise<ManualCheckResult> {
  return runCheck({ force: true });
}

function handleAppStateChange(state: AppStateStatus) {
  if (state !== 'active') return;
  void runCheck();
}

async function runCheck({ force = false }: { force?: boolean } = {}): Promise<ManualCheckResult> {
  if (isPromptOpen) return 'prompted';

  if (!force) {
    // Throttle persistito: rispettato anche al cold-start.
    const lastCheckAt = await readLastCheckAt();
    if (Date.now() - lastCheckAt < RECHECK_MS) return 'up-to-date';
  }
  void AsyncStorage.setItem(STORAGE_KEY_LAST_CHECK, String(Date.now()));

  try {
    const remote = await fetchFromReleasesApi();
    if (!remote) return 'error';

    const current = getCurrentVersion();
    if (!current) return 'error';

    if (compareVersions(remote.version, current) > 0) {
      // Se l'utente ha già detto "Dopo" per questa versione non riproporre
      // il prompt finché non esce una versione successiva. Eccezione: con
      // force=true (bottone manuale) vogliamo sempre il prompt.
      if (!force) {
        const dismissed = await AsyncStorage.getItem(STORAGE_KEY_DISMISSED);
        if (dismissed === remote.version) return 'up-to-date';
      }

      promptUpdate(remote);
      return 'prompted';
    }
    return 'up-to-date';
  } catch {
    // Silenziosi per design: update check automatico è un "nice to have".
    // Il chiamante manuale traduce 'error' in toast.
    return 'error';
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

    const notes = typeof data.body === 'string' ? data.body.trim() : '';

    return {
      version,
      apkUrl: asset.browser_download_url,
      notes,
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

function buildAlertBody(remote: RemoteVersion): string {
  const head = `È disponibile la versione ${remote.version}.`;
  if (!remote.notes) return `${head}\n\nVuoi scaricarla ora?`;
  return `${head}\n\n${remote.notes}`;
}

function promptUpdate(remote: RemoteVersion): void {
  isPromptOpen = true;

  Alert.alert(
    'Aggiornamento disponibile',
    buildAlertBody(remote),
    [
      {
        text: 'Dopo',
        style: 'cancel',
        onPress: () => {
          // Persisti la dismissione: niente prompt finché non esce una versione
          // diversa da questa (anche dopo cold-start).
          void AsyncStorage.setItem(STORAGE_KEY_DISMISSED, remote.version);
          isPromptOpen = false;
        },
      },
      {
        text: 'Aggiorna',
        onPress: () => {
          void downloadAndInstall(remote);
        },
      },
    ],
    { cancelable: true },
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
