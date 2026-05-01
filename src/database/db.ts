import * as SQLite from 'expo-sqlite';

import { applySeedServings, seedFoodsIfEmpty } from './seedFoods';

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
      start_weight_kg REAL
    );
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

  // Seed iniziale di `quick_addons` con i 4 default proposti. Modalità A:
  // si applica SOLO se la tabella e' vuota (DB nuovo o appena resettato).
  // Gli utenti con `quick_addons` gia' popolato (anche solo dalla legacy
  // "Contorno verdure" 50 kcal) NON vengono toccati, per non sovrascrivere
  // eventuali personalizzazioni.
  const seedRow = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM quick_addons`,
  );
  if ((seedRow?.n ?? 0) === 0) {
    const DEFAULT_QUICK_ADDONS: Array<[string, number, number]> = [
      ['Contorno verdure (200g)', 60, 0],
      ['Olio condimento (1 cucchiaio)', 90, 1],
      ['Grana sulla pasta (1 cucchiaio)', 40, 2],
      ['Zucchero (1 cucchiaino)', 16, 3],
    ];
    for (const [label, calories, position] of DEFAULT_QUICK_ADDONS) {
      await db.runAsync(
        `INSERT INTO quick_addons (label, calories, position) VALUES (?, ?, ?)`,
        label,
        calories,
        position,
      );
    }
  }
}

export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DROP TABLE IF EXISTS meals;
    DROP TABLE IF EXISTS favorites;
    DROP TABLE IF EXISTS food_servings;
    DROP TABLE IF EXISTS foods;
    DROP TABLE IF EXISTS quick_addons;
    DROP TABLE IF EXISTS daily_settings;
    DROP TABLE IF EXISTS user_profile;
  `);
  dbInstance = null;
  initPromise = null;
  await getDatabase();
}
