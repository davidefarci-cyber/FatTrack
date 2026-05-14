import { getDatabase } from './db';

// Stato globale dell'app: modalità corrente (diet/sport) + flag "ho già visto
// la modalità sport almeno una volta", usato in Fase 5 per spegnere bounce e
// callout di scoperta. Singleton come `daily_settings` e `user_profile`.

export type AppMode = 'diet' | 'sport';

export type CoachMarksSeen = Record<string, boolean>;

export type AppSettings = {
  appMode: AppMode;
  sportModeSeen: boolean;
  weeklyTargetDays: number;
  hapticEnabled: boolean;
  spotifyPlaylistUri: string | null;
  tabataWorkSec: number;
  tabataRestSec: number;
  tabataRounds: number;
  // Mappa "id coach mark → seen". Persistita come JSON in `coach_marks_seen`.
  // Espandibile senza nuove colonne: aggiungere un mark = aggiungere un id
  // al registry in `utils/coachMarks.ts`. Reset coaching = svuotamento mappa.
  coachMarksSeen: CoachMarksSeen;
  // Se true, durante una sessione attiva la prima serie di ogni esercizio
  // mostra una "guida" overlay (immagine + step) prima del tracking input.
  // Default true. Disattivabile da SportSettings o dalla guida stessa.
  exerciseGuidesEnabled: boolean;
  // Se true, durante sessione attiva / round Tabata / timer pausa standalone
  // lo schermo resta acceso (via expo-keep-awake). Default true.
  keepAwakeEnabled: boolean;
  updatedAt: string;
};

const COLUMNS = `
  app_mode AS appMode,
  sport_mode_seen AS sportModeSeen,
  weekly_target_days AS weeklyTargetDays,
  haptic_enabled AS hapticEnabled,
  spotify_playlist_uri AS spotifyPlaylistUri,
  tabata_work_sec AS tabataWorkSec,
  tabata_rest_sec AS tabataRestSec,
  tabata_rounds AS tabataRounds,
  coach_marks_seen AS coachMarksSeen,
  exercise_guides_enabled AS exerciseGuidesEnabled,
  keep_awake_enabled AS keepAwakeEnabled,
  updated_at AS updatedAt
`;

type Row = {
  appMode: AppMode;
  sportModeSeen: number;
  weeklyTargetDays: number;
  hapticEnabled: number;
  spotifyPlaylistUri: string | null;
  tabataWorkSec: number;
  tabataRestSec: number;
  tabataRounds: number;
  coachMarksSeen: string;
  exerciseGuidesEnabled: number;
  keepAwakeEnabled: number;
  updatedAt: string;
};

function parseCoachMarks(raw: string | null | undefined): CoachMarksSeen {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: CoachMarksSeen = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'boolean') out[k] = v;
      }
      return out;
    }
  } catch {
    // JSON corrotto: si riparte vuoti.
  }
  return {};
}

function rowToSettings(row: Row): AppSettings {
  return {
    appMode: row.appMode,
    sportModeSeen: row.sportModeSeen === 1,
    weeklyTargetDays: row.weeklyTargetDays,
    hapticEnabled: row.hapticEnabled === 1,
    spotifyPlaylistUri: row.spotifyPlaylistUri,
    tabataWorkSec: row.tabataWorkSec,
    tabataRestSec: row.tabataRestSec,
    tabataRounds: row.tabataRounds,
    coachMarksSeen: parseCoachMarks(row.coachMarksSeen),
    exerciseGuidesEnabled: row.exerciseGuidesEnabled === 1,
    keepAwakeEnabled: row.keepAwakeEnabled === 1,
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

export async function setExerciseGuidesEnabled(
  enabled: boolean,
): Promise<AppSettings> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE app_settings SET exercise_guides_enabled = ?, updated_at = datetime('now') WHERE id = 1`,
    enabled ? 1 : 0,
  );
  return getAppSettings();
}

export async function setKeepAwakeEnabled(
  enabled: boolean,
): Promise<AppSettings> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE app_settings SET keep_awake_enabled = ?, updated_at = datetime('now') WHERE id = 1`,
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

// Config Tabata personalizzata: persistita perché è "il TUO Tabata" (i valori
// crescono con la resistenza dell'utente). Singolo UPDATE atomico.
export async function setTabataConfig(config: {
  workSec: number;
  restSec: number;
  rounds: number;
}): Promise<AppSettings> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE app_settings
       SET tabata_work_sec = ?,
           tabata_rest_sec = ?,
           tabata_rounds = ?,
           updated_at = datetime('now')
     WHERE id = 1`,
    config.workSec,
    config.restSec,
    config.rounds,
  );
  return getAppSettings();
}

// Coach marks: marca un singolo id come visto. Read-modify-write per non
// perdere altri flag già impostati. La parsificazione è tollerante (vedi
// `parseCoachMarks`); in caso di JSON corrotto si riparte da `{}`.
export async function markCoachMarkSeen(id: string): Promise<AppSettings> {
  const current = await getAppSettings();
  const next: CoachMarksSeen = { ...current.coachMarksSeen, [id]: true };
  return writeCoachMarks(next);
}

// Reset coaching: svuota la mappa, così il prossimo passaggio in HomeScreen
// fa ricomparire il banner della prima coach mark applicabile.
export async function resetCoachMarks(): Promise<AppSettings> {
  return writeCoachMarks({});
}

async function writeCoachMarks(map: CoachMarksSeen): Promise<AppSettings> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE app_settings SET coach_marks_seen = ?, updated_at = datetime('now') WHERE id = 1`,
    JSON.stringify(map),
  );
  return getAppSettings();
}
