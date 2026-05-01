import { getDatabase } from './db';

// Stato globale dell'app: modalità corrente (diet/sport) + flag "ho già visto
// la modalità sport almeno una volta", usato in Fase 5 per spegnere bounce e
// callout di scoperta. Singleton come `daily_settings` e `user_profile`.

export type AppMode = 'diet' | 'sport';

export type AppSettings = {
  appMode: AppMode;
  sportModeSeen: boolean;
  updatedAt: string;
};

const COLUMNS = `
  app_mode AS appMode,
  sport_mode_seen AS sportModeSeen,
  updated_at AS updatedAt
`;

type Row = {
  appMode: AppMode;
  sportModeSeen: number;
  updatedAt: string;
};

function rowToSettings(row: Row): AppSettings {
  return {
    appMode: row.appMode,
    sportModeSeen: row.sportModeSeen === 1,
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
