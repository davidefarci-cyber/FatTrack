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

export type UseAppSettingsResult = {
  appMode: AppMode;
  sportModeSeen: boolean;
  weeklyTargetDays: number;
  loading: boolean;
  error: Error | null;
  setAppMode: (mode: AppMode) => Promise<AppSettings>;
  markSportModeSeen: () => Promise<AppSettings>;
  setWeeklyTarget: (days: number) => Promise<AppSettings>;
  reload: () => Promise<void>;
};

export function useAppSettings(): UseAppSettingsResult {
  ensureInitialized();
  const state = useSyncExternalStore(subscribe, () => snapshot);

  const reloadFn = useCallback(() => reload(), []);
  const setModeFn = useCallback((m: AppMode) => setAppMode(m), []);
  const markSeenFn = useCallback(() => markSportModeSeen(), []);
  const setWeeklyTargetFn = useCallback((d: number) => setWeeklyTarget(d), []);

  const settings = state.settings ?? DEFAULT_SETTINGS;

  return {
    appMode: settings.appMode,
    sportModeSeen: settings.sportModeSeen,
    weeklyTargetDays: settings.weeklyTargetDays,
    loading: state.loading,
    error: state.error,
    setAppMode: setModeFn,
    markSportModeSeen: markSeenFn,
    setWeeklyTarget: setWeeklyTargetFn,
    reload: reloadFn,
  };
}
