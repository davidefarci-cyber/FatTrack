import { getDatabase } from './db';

// Stato globale dell'app: modalità corrente (diet/sport) + flag "ho già visto
// la modalità sport almeno una volta", usato in Fase 5 per spegnere bounce e
// callout di scoperta. Singleton come `daily_settings` e `user_profile`.

export type AppMode = 'diet' | 'sport';

export type AppSettings = {
  appMode: AppMode;
  sportModeSeen: boolean;
  weeklyTargetDays: number;
  hapticEnabled: boolean;
  spotifyPlaylistUri: string | null;
  updatedAt: string;
};

const COLUMNS = `
  app_mode AS appMode,
  sport_mode_seen AS sportModeSeen,
  weekly_target_days AS weeklyTargetDays,
  haptic_enabled AS hapticEnabled,
  spotify_playlist_uri AS spotifyPlaylistUri,
  updated_at AS updatedAt
`;

type Row = {
  appMode: AppMode;
  sportModeSeen: number;
  weeklyTargetDays: number;
  hapticEnabled: number;
  spotifyPlaylistUri: string | null;
  updatedAt: string;
};

function rowToSettings(row: Row): AppSettings {
  return {
    appMode: row.appMode,
    sportModeSeen: row.sportModeSeen === 1,
    weeklyTargetDays: row.weeklyTargetDays,
    hapticEnabled: row.hapticEnabled === 1,
    spotifyPlaylistUri: row.spotifyPlaylistUri,
    updatedAt: row.updatedAt,
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${COLUMNS} FROM app_settings WHERE id = 1`,
  );
  if (row) return rowToSettings(row);

  // Safety net: la migration inserisce già il singleton, ma se per qualche
  // motivo è assente (DB legacy importato da backup) lo reinseriamo.
  await db.runAsync(`INSERT OR IGNORE INTO app_settings (id) VALUES (1)`);
  const reloaded = await db.getFirstAsync<Row>(
    `SELECT ${COLUMNS} FROM app_settings WHERE id = 1`,
  );
  if (!reloaded) throw new Error('app_settings singleton missing');
  return rowToSettings(reloaded);
}

export async function setAppMode(mode: AppMode): Promise<AppSettings> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE app_settings SET app_mode = ?, updated_at = datetime('now') WHERE id = 1`,
    mode,
  );
  return getAppSettings();
}

export async function markSportModeSeen(): Promise<AppSettings> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE app_settings SET sport_mode_seen = 1, updated_at = datetime('now') WHERE id = 1`,
  );
  return getAppSettings();
}

// Obiettivo settimanale di giorni allenati per la dashboard sport.
// Bounds 1..7 garantiti dal caller (SportSettingsScreen renderizza 7
// pulsanti). In caso di valori fuori range li clampiamo qui per essere
// safe, perché un valore =0 farebbe diventare il ring "consumed/0".
export async function setWeeklyTarget(days: number): Promise<AppSettings> {
  const clamped = Math.min(7, Math.max(1, Math.round(days)));
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE app_settings SET weekly_target_days = ?, updated_at = datetime('now') WHERE id = 1`,
    clamped,
  );
  return getAppSettings();
}

export async function setHapticEnabled(enabled: boolean): Promise<AppSettings> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE app_settings SET haptic_enabled = ?, updated_at = datetime('now') WHERE id = 1`,
    enabled ? 1 : 0,
  );
  return getAppSettings();
}

export async function setSpotifyPlaylistUri(
  uri: string | null,
): Promise<AppSettings> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE app_settings SET spotify_playlist_uri = ?, updated_at = datetime('now') WHERE id = 1`,
    uri,
  );
  return getAppSettings();
}
