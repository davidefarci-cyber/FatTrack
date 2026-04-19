import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync('fattrack.db');
  await migrate(dbInstance);
  return dbInstance;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      brand TEXT,
      kcal_per_100g REAL NOT NULL,
      fat_per_100g REAL NOT NULL,
      carbs_per_100g REAL NOT NULL,
      protein_per_100g REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS diary_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      grams REAL NOT NULL,
      consumed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_diary_consumed_at ON diary_entries(consumed_at);
    CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
  `);
}
