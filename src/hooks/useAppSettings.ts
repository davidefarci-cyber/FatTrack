import { useCallback, useSyncExternalStore } from 'react';

import { appSettingsDB } from '@/database';
import type { AppMode, AppSettings } from '@/database';

// Stato condiviso a livello di modulo (stesso pattern di `useProfile`):
// tutti i consumer leggono lo stesso oggetto. Sottoscrizione via
// `useSyncExternalStore`. Serve perché il toggle di modalità (long-press
// sul tab Home, oppure dal SettingsScreen) deve far rerendere
// RootNavigator senza passare callback ad ogni livello.

type Snapshot = {
  settings: AppSettings | null;
  loading: boolean;
  error: Error | null;
};

const DEFAULT_SETTINGS: AppSettings = {
  appMode: 'diet',
  sportModeSeen: false,
  weeklyTargetDays: 4,
  hapticEnabled: true,
  spotifyPlaylistUri: null,
  tabataWorkSec: 20,
  tabataRestSec: 10,
  tabataRounds: 8,
  updatedAt: '',
};

let snapshot: Snapshot = { settings: null, loading: true, error: null };
const listeners = new Set<() => void>();

function setSnapshot(next: Snapshot) {
  snapshot = next;
  for (const fn of listeners) fn();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function reload(): Promise<void> {
  setSnapshot({ ...snapshot, loading: true });
  try {
    const settings = await appSettingsDB.getAppSettings();
    setSnapshot({ settings, loading: false, error: null });
  } catch (err) {
    setSnapshot({
      settings: snapshot.settings,
      loading: false,
      error: err instanceof Error ? err : new Error(String(err)),
    });
  }
}

let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  void reload();
}

async function setAppMode(mode: AppMode): Promise<AppSettings> {
  const updated = await appSettingsDB.setAppMode(mode);
  setSnapshot({ settings: updated, loading: false, error: null });
  return updated;
}

async function markSportModeSeen(): Promise<AppSettings> {
  const updated = await appSettingsDB.markSportModeSeen();
  setSnapshot({ settings: updated, loading: false, error: null });
  return updated;
}

async function setWeeklyTarget(days: number): Promise<AppSettings> {
  const updated = await appSettingsDB.setWeeklyTarget(days);
  setSnapshot({ settings: updated, loading: false, error: null });
  return updated;
}

async function setHapticEnabled(enabled: boolean): Promise<AppSettings> {
  const updated = await appSettingsDB.setHapticEnabled(enabled);
  setSnapshot({ settings: updated, loading: false, error: null });
  return updated;
}

async function setSpotifyPlaylistUri(uri: string | null): Promise<AppSettings> {
  const updated = await appSettingsDB.setSpotifyPlaylistUri(uri);
  setSnapshot({ settings: updated, loading: false, error: null });
  return updated;
}

async function setTabataConfig(config: {
  workSec: number;
  restSec: number;
  rounds: number;
}): Promise<AppSettings> {
  const updated = await appSettingsDB.setTabataConfig(config);
  setSnapshot({ settings: updated, loading: false, error: null });
  return updated;
}

export type UseAppSettingsResult = {
  appMode: AppMode;
  sportModeSeen: boolean;
  weeklyTargetDays: number;
  hapticEnabled: boolean;
  spotifyPlaylistUri: string | null;
  tabataWorkSec: number;
  tabataRestSec: number;
  tabataRounds: number;
  loading: boolean;
  error: Error | null;
  setAppMode: (mode: AppMode) => Promise<AppSettings>;
  markSportModeSeen: () => Promise<AppSettings>;
  setWeeklyTarget: (days: number) => Promise<AppSettings>;
  setHapticEnabled: (enabled: boolean) => Promise<AppSettings>;
  setSpotifyPlaylistUri: (uri: string | null) => Promise<AppSettings>;
  setTabataConfig: (config: {
    workSec: number;
    restSec: number;
    rounds: number;
  }) => Promise<AppSettings>;
  reload: () => Promise<void>;
};

export function useAppSettings(): UseAppSettingsResult {
  ensureInitialized();
  const state = useSyncExternalStore(subscribe, () => snapshot);

  const reloadFn = useCallback(() => reload(), []);
  const setModeFn = useCallback((m: AppMode) => setAppMode(m), []);
  const markSeenFn = useCallback(() => markSportModeSeen(), []);
  const setWeeklyTargetFn = useCallback((d: number) => setWeeklyTarget(d), []);
  const setHapticFn = useCallback((e: boolean) => setHapticEnabled(e), []);
  const setSpotifyFn = useCallback(
    (u: string | null) => setSpotifyPlaylistUri(u),
    [],
  );
  const setTabataFn = useCallback(
    (c: { workSec: number; restSec: number; rounds: number }) =>
      setTabataConfig(c),
    [],
  );

  const settings = state.settings ?? DEFAULT_SETTINGS;

  return {
    appMode: settings.appMode,
    sportModeSeen: settings.sportModeSeen,
    weeklyTargetDays: settings.weeklyTargetDays,
    hapticEnabled: settings.hapticEnabled,
    spotifyPlaylistUri: settings.spotifyPlaylistUri,
    tabataWorkSec: settings.tabataWorkSec,
    tabataRestSec: settings.tabataRestSec,
    tabataRounds: settings.tabataRounds,
    loading: state.loading,
    error: state.error,
    setAppMode: setModeFn,
    markSportModeSeen: markSeenFn,
    setWeeklyTarget: setWeeklyTargetFn,
    setHapticEnabled: setHapticFn,
    setSpotifyPlaylistUri: setSpotifyFn,
    setTabataConfig: setTabataFn,
    reload: reloadFn,
  };
}
