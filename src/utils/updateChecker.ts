import Constants from 'expo-constants';
import { Alert, Linking } from 'react-native';

// URL pubblico del manifest di versione: ospitato come file statico nel repo
// GitHub, quindi non serve alcun backend. Raw content è servito con CORS
// aperto e TLS, è un buon canale per check leggeri.
const VERSION_JSON_URL =
  'https://raw.githubusercontent.com/davidefarci-cyber/fattrack/main/version.json';

// Timeout corto: se la connessione è lenta o assente non vogliamo far
// comparire un alert a schermo tardivo o rallentare il lancio.
const FETCH_TIMEOUT_MS = 5000;

// Flag a modulo: garantisce un solo check per sessione (il modulo è
// singleton finché l'app è in memoria).
let hasCheckedThisSession = false;

type RemoteVersion = {
  version: string;
  apkUrl: string;
};

// Entry point: fire-and-forget dall'App.tsx. Non lancia mai: qualunque
// errore (offline, JSON malformato, ecc.) viene soffocato.
export async function checkForUpdates(): Promise<void> {
  if (hasCheckedThisSession) return;
  hasCheckedThisSession = true;

  try {
    const remote = await fetchRemoteVersion();
    if (!remote) return;

    const current = getCurrentVersion();
    if (!current) return;

    if (compareVersions(remote.version, current) > 0) {
      promptUpdate(remote);
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
    return { version: data.version, apkUrl: data.apk_url };
  } finally {
    clearTimeout(timeoutId);
  }
}

function isRemoteVersionPayload(
  data: unknown,
): data is { version: string; apk_url: string } {
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

function promptUpdate(remote: RemoteVersion): void {
  Alert.alert(
    'Aggiornamento disponibile',
    `È disponibile la versione ${remote.version} - Vuoi scaricarla?`,
    [
      { text: 'Dopo', style: 'cancel' },
      {
        text: 'Aggiorna',
        onPress: () => {
          Linking.openURL(remote.apkUrl).catch(() => undefined);
        },
      },
    ],
  );
}
