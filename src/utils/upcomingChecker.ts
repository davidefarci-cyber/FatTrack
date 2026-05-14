import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

import { compareVersions } from './semver';

// File `upcoming.json` curato a mano dal proprietario, committato in main.
// Cache di raw.githubusercontent.com è ~5 min: accettabile dato che il
// fetch parte solo al cold-start, un teaser non ha bisogno di propagarsi
// in tempo reale.
const UPCOMING_URL =
  'https://raw.githubusercontent.com/davidefarci-cyber/fattrack/main/upcoming.json';

const FETCH_TIMEOUT_MS = 5000;
const SEEN_IDS_KEY = '@fattrack/upcoming/seenIds';

export type UpcomingItem = {
  id: string;
  title: string;
  description: string;
  etaHuman: string;
  // Opzionale. Se presente E `<=` versione installata, la voce è
  // auto-dismissed (la feature è già uscita: il messaggio "Novità" del
  // post-update copre già la comunicazione).
  targetVersion?: string;
};

// Ritorna le voci da mostrare in popup, già filtrate (auto-dismiss su
// targetVersion + skip degli id già visti). Sempre safe: errori di rete
// o JSON malformato restituiscono [].
export async function checkForUpcoming(): Promise<UpcomingItem[]> {
  const items = await fetchUpcoming();
  if (items.length === 0) return [];

  const current = Constants.expoConfig?.version ?? '0.0.0';
  const seen = await getSeenIds();

  return items.filter((it) => {
    if (seen.has(it.id)) return false;
    if (it.targetVersion && compareVersions(it.targetVersion, current) <= 0) {
      return false;
    }
    return true;
  });
}

// Marca come "viste" tutte le voci passate. Da chiamare alla chiusura del
// popup così non riappaiono al prossimo cold-start.
export async function dismissUpcoming(items: UpcomingItem[]): Promise<void> {
  if (items.length === 0) return;
  const current = await getSeenIds();
  for (const it of items) current.add(it.id);
  try {
    await AsyncStorage.setItem(
      SEEN_IDS_KEY,
      JSON.stringify(Array.from(current)),
    );
  } catch {
    // Best-effort: se AsyncStorage fallisce, al prossimo cold-start
    // l'utente rivede il popup. Fastidioso ma non rompe nulla.
  }
}

async function fetchUpcoming(): Promise<UpcomingItem[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(UPCOMING_URL, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data: unknown = await res.json();
    if (!Array.isArray(data)) return [];
    return data.filter(isUpcomingItem);
  } catch {
    return [];
  } finally {
    clearTimeout(timeoutId);
  }
}

async function getSeenIds(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(SEEN_IDS_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

function isUpcomingItem(value: unknown): value is UpcomingItem {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.id !== 'string' || obj.id.length === 0) return false;
  if (typeof obj.title !== 'string' || obj.title.length === 0) return false;
  if (typeof obj.description !== 'string') return false;
  if (typeof obj.etaHuman !== 'string') return false;
  if (
    obj.targetVersion !== undefined &&
    typeof obj.targetVersion !== 'string'
  ) {
    return false;
  }
  return true;
}
