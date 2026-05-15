import * as SQLite from 'expo-sqlite';

import { seedExercisesIfEmpty } from './seedExercises';
import { applySeedServings, seedFoodsIfEmpty } from './seedFoods';
import { seedProgramsIfEmpty } from './seedPrograms';
import { seedPresetWorkoutsIfEmpty } from './seedWorkouts';

const DB_NAME = 'fattrack.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await migrate(db);
    await seedFoodsIfEmpty(db);
    await applySeedServings(db);
    await seedExercisesIfEmpty(db);
    await seedPresetWorkoutsIfEmpty(db);
    await seedProgramsIfEmpty(db);
    dbInstance = db;
    return db;
  })();

  return initPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS foods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      calories_per_100g REAL NOT NULL,
      protein_per_100g REAL,
      carbs_per_100g REAL,
      fat_per_100g REAL,
      source TEXT NOT NULL CHECK (source IN ('manual','api','barcode')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_foods_name ON foods(name);

    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      meal_type TEXT NOT NULL CHECK (meal_type IN ('colazione','pranzo','cena','spuntino')),
      food_id INTEGER,
      food_name TEXT NOT NULL,
      grams REAL NOT NULL,
      calories_total REAL NOT NULL,
      serving_label TEXT,
      serving_qty REAL,
      protein_total REAL,
      carbs_total REAL,
      fat_total REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
    CREATE INDEX IF NOT EXISTS idx_meals_date_type ON meals(date, meal_type);

    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      items TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS daily_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      side_dish_calories REAL NOT NULL DEFAULT 50,
      seeded_quick_addons INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS food_servings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      food_id INTEGER NOT NULL,
      label TEXT NOT NULL,
      grams REAL NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_food_servings_food ON food_servings(food_id);
    CREATE UNIQUE INDEX IF NOT EXISTS uq_food_servings_food_label
      ON food_servings(food_id, lower(label));

    CREATE TABLE IF NOT EXISTS quick_addons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL,
      calories REAL NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_quick_addons_position ON quick_addons(position);

    CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      weight_kg REAL NOT NULL,
      height_cm REAL NOT NULL,
      age INTEGER NOT NULL,
      gender TEXT NOT NULL CHECK (gender IN ('M','F')),
      activity_level INTEGER NOT NULL CHECK (activity_level BETWEEN 1 AND 5),
      weekly_goal_kg REAL NOT NULL DEFAULT 0,
      tdee REAL NOT NULL,
      target_calories REAL NOT NULL,
      name TEXT,
      target_weight_kg REAL,
      start_weight_kg REAL,
      available_equipment TEXT,
      avatar_uri TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      app_mode TEXT NOT NULL DEFAULT 'diet' CHECK (app_mode IN ('diet','sport')),
      sport_mode_seen INTEGER NOT NULL DEFAULT 0,
      weekly_target_days INTEGER NOT NULL DEFAULT 4 CHECK (weekly_target_days BETWEEN 1 AND 7),
      haptic_enabled INTEGER NOT NULL DEFAULT 1,
      spotify_playlist_uri TEXT,
      tabata_work_sec INTEGER NOT NULL DEFAULT 20,
      tabata_rest_sec INTEGER NOT NULL DEFAULT 10,
      tabata_rounds INTEGER NOT NULL DEFAULT 8,
      coach_marks_seen TEXT NOT NULL DEFAULT '{}',
      exercise_guides_enabled INTEGER NOT NULL DEFAULT 1,
      keep_awake_enabled INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      muscle_group TEXT NOT NULL,
      equipment TEXT NOT NULL,
      equipment_tags TEXT,
      level TEXT NOT NULL CHECK (level IN ('principiante','intermedio','avanzato')),
      description TEXT,
      guide_steps TEXT,
      video_url TEXT,
      met REAL,
      default_mode TEXT NOT NULL DEFAULT 'reps' CHECK (default_mode IN ('reps','time')),
      default_duration_sec INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_exercises_muscle ON exercises(muscle_group);

    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK (category IN ('forza','cardio','mobilita','misto')),
      goal TEXT,
      level TEXT,
      required_equipment TEXT,
      is_preset INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      estimated_duration_min INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS workout_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      position INTEGER NOT NULL,
      sets INTEGER,
      reps INTEGER,
      reps_max INTEGER,
      duration_sec INTEGER,
      duration_max_sec INTEGER,
      rest_sec INTEGER,
      weight_kg REAL,
      alternative_exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout
      ON workout_exercises(workout_id);

    CREATE TABLE IF NOT EXISTS workout_programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      goal TEXT,
      level TEXT,
      days_per_week INTEGER NOT NULL,
      is_preset INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS program_workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
      workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      day_label TEXT,
      UNIQUE (program_id, position)
    );
    CREATE INDEX IF NOT EXISTS idx_program_workouts_program
      ON program_workouts(program_id);

    CREATE TABLE IF NOT EXISTS active_program (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      program_id INTEGER NOT NULL REFERENCES workout_programs(id) ON DELETE CASCADE,
      last_completed_program_workout_id INTEGER REFERENCES program_workouts(id) ON DELETE SET NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER REFERENCES workouts(id) ON DELETE SET NULL,
      workout_name TEXT NOT NULL,
      category TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_sec INTEGER,
      calories_estimated INTEGER,
      notes TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_started
      ON sessions(started_at DESC);

    CREATE TABLE IF NOT EXISTS session_sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      exercise_id INTEGER NOT NULL REFERENCES exercises(id),
      position INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      reps_done INTEGER,
      weight_kg REAL,
      duration_sec INTEGER,
      rpe INTEGER,
      completed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_session_sets_session
      ON session_sets(session_id);

    CREATE TABLE IF NOT EXISTS active_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      current_exercise_index INTEGER NOT NULL DEFAULT 0,
      current_set_number INTEGER NOT NULL DEFAULT 1,
      rest_ends_at TEXT,
      rest_duration_sec INTEGER,
      paused_at TEXT,
      paused_total_sec INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pizza_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      eaten_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_pizza_log_eaten_at ON pizza_log(eaten_at);
  `);

  // Migrazione: la colonna `target_calories` su `daily_settings` è stata
  // rimossa (il target reale vive su `user_profile.target_calories`).
  // Su DB nuovi il CREATE già non la include; sui DB esistenti la dropchiamo
  // qui in modo idempotente. Richiede SQLite ≥ 3.35 (expo-sqlite la include).
  try {
    await db.execAsync(`ALTER TABLE daily_settings DROP COLUMN target_calories`);
  } catch {
    // La colonna non esiste: niente da fare.
  }

  // Migrazione: aggiunta porzioni snapshot su `meals`. Su DB nuovi le colonne
  // sono già presenti dal CREATE; sui DB esistenti le aggiungiamo idempotente.
  for (const sql of [
    `ALTER TABLE meals ADD COLUMN serving_label TEXT`,
    `ALTER TABLE meals ADD COLUMN serving_qty REAL`,
  ]) {
    try {
      await db.execAsync(sql);
    } catch {
      // Colonna già presente.
    }
  }

  // Migrazione: macro nutrients (proteine/carb/grassi). Nullable: molti food
  // (manuali, OFF senza dati nutrizionali) non hanno macro disponibili. Lo
  // snapshot su `meals` segue lo stesso pattern di `calories_total` per non
  // dipendere dal valore corrente del food.
  for (const sql of [
    `ALTER TABLE foods ADD COLUMN protein_per_100g REAL`,
    `ALTER TABLE foods ADD COLUMN carbs_per_100g REAL`,
    `ALTER TABLE foods ADD COLUMN fat_per_100g REAL`,
    `ALTER TABLE meals ADD COLUMN protein_total REAL`,
    `ALTER TABLE meals ADD COLUMN carbs_total REAL`,
    `ALTER TABLE meals ADD COLUMN fat_total REAL`,
    `ALTER TABLE user_profile ADD COLUMN name TEXT`,
    `ALTER TABLE user_profile ADD COLUMN target_weight_kg REAL`,
    `ALTER TABLE user_profile ADD COLUMN start_weight_kg REAL`,
    `ALTER TABLE app_settings ADD COLUMN weekly_target_days INTEGER NOT NULL DEFAULT 4`,
    `ALTER TABLE app_settings ADD COLUMN haptic_enabled INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE app_settings ADD COLUMN spotify_playlist_uri TEXT`,
    `ALTER TABLE app_settings ADD COLUMN tabata_work_sec INTEGER NOT NULL DEFAULT 20`,
    `ALTER TABLE app_settings ADD COLUMN tabata_rest_sec INTEGER NOT NULL DEFAULT 10`,
    `ALTER TABLE app_settings ADD COLUMN tabata_rounds INTEGER NOT NULL DEFAULT 8`,
    `ALTER TABLE app_settings ADD COLUMN coach_marks_seen TEXT NOT NULL DEFAULT '{}'`,
    `ALTER TABLE app_settings ADD COLUMN exercise_guides_enabled INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE app_settings ADD COLUMN keep_awake_enabled INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE active_session ADD COLUMN rest_duration_sec INTEGER`,
    // Fase 1 piani allenamento: nuovi campi schema (vedi commit relativo).
    `ALTER TABLE user_profile ADD COLUMN available_equipment TEXT`,
    `ALTER TABLE exercises ADD COLUMN equipment_tags TEXT`,
    `ALTER TABLE workouts ADD COLUMN goal TEXT`,
    `ALTER TABLE workouts ADD COLUMN level TEXT`,
    `ALTER TABLE workouts ADD COLUMN required_equipment TEXT`,
    `ALTER TABLE workout_exercises ADD COLUMN reps_max INTEGER`,
    `ALTER TABLE workout_exercises ADD COLUMN duration_max_sec INTEGER`,
    `ALTER TABLE workout_exercises ADD COLUMN alternative_exercise_id INTEGER REFERENCES exercises(id) ON DELETE SET NULL`,
    `ALTER TABLE app_settings ADD COLUMN programs_intro_initialized INTEGER NOT NULL DEFAULT 0`,
    // Fase timer-esercizio: distingue esercizi con natura "a tempo" (plank,
    // wall sit, corsa…) da quelli "a reps". L'editor scheda usa questi due
    // campi per prefilare la prescrizione quando l'utente aggiunge un
    // esercizio; la sessione live mostra il timer countdown invece dell'input
    // numerico per i set di durata. Default 'reps' = comportamento storico.
    `ALTER TABLE exercises ADD COLUMN default_mode TEXT NOT NULL DEFAULT 'reps'`,
    `ALTER TABLE exercises ADD COLUMN default_duration_sec INTEGER`,
    // Foto profilo (TODO [13]): URI restituito da expo-image-picker. Non
    // copiamo il file in documentDirectory: se Android pulisce la cache
    // o l'utente sposta il file, l'<Image> degrada all'iniziale via
    // onError. Esclusa esplicitamente dal backup (vedi dbBackup.ts).
    `ALTER TABLE user_profile ADD COLUMN avatar_uri TEXT`,
  ]) {
    try {
      await db.execAsync(sql);
    } catch {
      // Colonna già presente.
    }
  }

  await db.runAsync(
    `INSERT OR IGNORE INTO daily_settings (id, side_dish_calories) VALUES (1, 50)`,
  );

  // Singleton di `app_settings`: una sola riga con id=1, default mode='diet'.
  // Idempotente come `daily_settings` e `user_profile`.
  await db.runAsync(`INSERT OR IGNORE INTO app_settings (id) VALUES (1)`);

  // Migrazione [21]: aggiunge CHECK (weekly_target_days BETWEEN 1 AND 7).
  // SQLite non supporta ALTER TABLE ADD CONSTRAINT, serve ricreare la
  // tabella. Idempotente: controlliamo se la CHECK è già presente nello
  // schema attuale tramite sqlite_master. La CHECK è difesa in profondità
  // contro import di backup malevoli o bug futuri (l'UI è già bounded 1-7).
  const appSettingsSchema = await db.getFirstAsync<{ sql: string }>(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='app_settings'`,
  );
  const hasWeeklyTargetCheck =
    typeof appSettingsSchema?.sql === 'string' &&
    /weekly_target_days[^,]*BETWEEN\s+1\s+AND\s+7/i.test(appSettingsSchema.sql);

  if (!hasWeeklyTargetCheck) {
    try {
      // Defensive: prima di ricreare la tabella, normalizza eventuali valori
      // out-of-range a 4 (default), così INSERT INTO ... SELECT non fallisce
      // sulla CHECK. In pratica improbabile (l'unica write path è la UI 1-7).
      await db.runAsync(
        `UPDATE app_settings SET weekly_target_days = 4 WHERE weekly_target_days NOT BETWEEN 1 AND 7`,
      );

      await db.execAsync('BEGIN TRANSACTION');
      try {
        await db.execAsync(`
          CREATE TABLE app_settings_new (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            app_mode TEXT NOT NULL DEFAULT 'diet' CHECK (app_mode IN ('diet','sport')),
            sport_mode_seen INTEGER NOT NULL DEFAULT 0,
            weekly_target_days INTEGER NOT NULL DEFAULT 4 CHECK (weekly_target_days BETWEEN 1 AND 7),
            haptic_enabled INTEGER NOT NULL DEFAULT 1,
            spotify_playlist_uri TEXT,
            tabata_work_sec INTEGER NOT NULL DEFAULT 20,
            tabata_rest_sec INTEGER NOT NULL DEFAULT 10,
            tabata_rounds INTEGER NOT NULL DEFAULT 8,
            coach_marks_seen TEXT NOT NULL DEFAULT '{}',
            exercise_guides_enabled INTEGER NOT NULL DEFAULT 1,
            keep_awake_enabled INTEGER NOT NULL DEFAULT 1,
            programs_intro_initialized INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);
        await db.execAsync(`
          INSERT INTO app_settings_new (
            id, app_mode, sport_mode_seen, weekly_target_days,
            haptic_enabled, spotify_playlist_uri,
            tabata_work_sec, tabata_rest_sec, tabata_rounds,
            coach_marks_seen, exercise_guides_enabled, keep_awake_enabled,
            programs_intro_initialized, updated_at
          )
          SELECT
            id, app_mode, sport_mode_seen, weekly_target_days,
            haptic_enabled, spotify_playlist_uri,
            tabata_work_sec, tabata_rest_sec, tabata_rounds,
            coach_marks_seen, exercise_guides_enabled, keep_awake_enabled,
            programs_intro_initialized, updated_at
          FROM app_settings;
        `);
        await db.execAsync(`DROP TABLE app_settings`);
        await db.execAsync(`ALTER TABLE app_settings_new RENAME TO app_settings`);
        await db.execAsync('COMMIT');
      } catch (err) {
        await db.execAsync('ROLLBACK');
        throw err;
      }
    } catch (err) {
      // Difesa in profondità: meglio app funzionante senza CHECK che app rotta.
      // La migrazione verrà ritentata al prossimo cold-start.
      console.warn('[migrate] CHECK constraint migration failed:', err);
    }
  }

  // Marker idempotente: indica se i `quick_addons` di default sono già
  // stati seedati almeno una volta. Su DB nuovi viene aggiunta dall'ALTER
  // con DEFAULT 0; su DB esistenti la riga corrente prende anche lei 0,
  // così la prima esecuzione post-update ricontrolla.
  try {
    await db.execAsync(
      `ALTER TABLE daily_settings ADD COLUMN seeded_quick_addons INTEGER NOT NULL DEFAULT 0`,
    );
  } catch {
    // Colonna già presente.
  }

  // Seed dei `quick_addons` di default — Modalità B (per-label, una volta
  // sola). Sostituisce la vecchia logica `count === 0`, che lasciava
  // scoperti gli utenti già con almeno una riga (es. la legacy "Contorno
  // verdure" 50 kcal di una versione precedente): i nuovi default non
  // venivano mai aggiunti.
  //
  // Comportamento:
  // - flag = 0: inseriamo solo i default che mancano per label
  //   (case-insensitive); poi settiamo flag = 1.
  // - flag = 1: niente. Se l'utente cancella un default in seguito, NON
  //   viene reinserito.
  //
  // NB: per introdurre nuovi default in futuro non basta aggiungerli a
  // `DEFAULT_QUICK_ADDONS` — serve un'azione esplicita (azzerare il flag
  // in una migration dedicata) per redistribuirli agli utenti esistenti.
  const seedRow = await db.getFirstAsync<{ done: number }>(
    `SELECT seeded_quick_addons AS done FROM daily_settings WHERE id = 1`,
  );
  if ((seedRow?.done ?? 0) === 0) {
    const DEFAULT_QUICK_ADDONS: Array<[string, number, number]> = [
      ['Contorno verdure (200g)', 60, 0],
      ['Olio condimento (1 cucchiaio)', 90, 1],
      ['Grana sulla pasta (1 cucchiaio)', 40, 2],
      ['Zucchero (1 cucchiaino)', 16, 3],
    ];
    for (const [label, calories, position] of DEFAULT_QUICK_ADDONS) {
      const existing = await db.getFirstAsync<{ id: number }>(
        `SELECT id FROM quick_addons WHERE LOWER(label) = LOWER(?) LIMIT 1`,
        label,
      );
      if (!existing) {
        await db.runAsync(
          `INSERT INTO quick_addons (label, calories, position) VALUES (?, ?, ?)`,
          label,
          calories,
          position,
        );
      }
    }
    await db.runAsync(
      `UPDATE daily_settings SET seeded_quick_addons = 1 WHERE id = 1`,
    );
  }

  // Sentinel one-shot per gli onboarding banner di WorkoutsScreen
  // (`workoutsEquipmentIntro` + `workoutsProgramsNews`). Decisione presa
  // alla prima migrazione dopo l'introduzione dei programmi:
  // - Utente "vecchio" (ha già pasti o sessioni): mostra entrambi i
  //   banner — l'annuncio "nuove schede" ha senso per lui.
  // - Utente "nuovo" (DB vuoto): pre-marca `workoutsProgramsNews` come
  //   visto, così non riceve un annuncio di novità che per lui non sono
  //   tali; vede solo `workoutsEquipmentIntro`.
  // Idempotente: il flag `programs_intro_initialized` su app_settings
  // garantisce che il check giri una sola volta nel ciclo di vita
  // dell'installazione.
  const introRow = await db.getFirstAsync<{ done: number }>(
    `SELECT programs_intro_initialized AS done FROM app_settings WHERE id = 1`,
  );
  if ((introRow?.done ?? 0) === 0) {
    const counts = await db.getFirstAsync<{
      meals: number;
      sessions: number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM meals) AS meals,
         (SELECT COUNT(*) FROM sessions) AS sessions`,
    );
    const isExistingUser =
      (counts?.meals ?? 0) > 0 || (counts?.sessions ?? 0) > 0;
    if (!isExistingUser) {
      // Merge nei coach_marks_seen senza sovrascrivere altri flag.
      const seenRow = await db.getFirstAsync<{ json: string }>(
        `SELECT coach_marks_seen AS json FROM app_settings WHERE id = 1`,
      );
      let seen: Record<string, boolean> = {};
      try {
        const parsed = JSON.parse(seenRow?.json ?? '{}');
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          for (const [k, v] of Object.entries(parsed)) {
            if (typeof v === 'boolean') seen[k] = v;
          }
        }
      } catch {
        seen = {};
      }
      seen.workoutsProgramsNews = true;
      await db.runAsync(
        `UPDATE app_settings SET coach_marks_seen = ? WHERE id = 1`,
        JSON.stringify(seen),
      );
    }
    await db.runAsync(
      `UPDATE app_settings SET programs_intro_initialized = 1 WHERE id = 1`,
    );
  }
}

export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DROP TABLE IF EXISTS active_session;
    DROP TABLE IF EXISTS session_sets;
    DROP TABLE IF EXISTS sessions;
    DROP TABLE IF EXISTS active_program;
    DROP TABLE IF EXISTS program_workouts;
    DROP TABLE IF EXISTS workout_programs;
    DROP TABLE IF EXISTS workout_exercises;
    DROP TABLE IF EXISTS workouts;
    DROP TABLE IF EXISTS exercises;
    DROP TABLE IF EXISTS meals;
    DROP TABLE IF EXISTS favorites;
    DROP TABLE IF EXISTS food_servings;
    DROP TABLE IF EXISTS foods;
    DROP TABLE IF EXISTS quick_addons;
    DROP TABLE IF EXISTS daily_settings;
    DROP TABLE IF EXISTS user_profile;
    DROP TABLE IF EXISTS app_settings;
  `);
  dbInstance = null;
  initPromise = null;
  await getDatabase();
}
