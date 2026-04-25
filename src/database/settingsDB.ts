import { getDatabase } from './db';

// `daily_settings` ora contiene solo `side_dish_calories` (il target calorico
// vive su `user_profile.target_calories`, calcolato a partire dal profilo).

export type DailySettings = {
  sideDishCalories: number;
  updatedAt: string;
};

export type DailySettingsPatch = Partial<Omit<DailySettings, 'updatedAt'>>;

const COLUMNS = `
  side_dish_calories AS sideDishCalories,
  updated_at AS updatedAt
`;

export async function getSettings(): Promise<DailySettings> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<DailySettings>(
    `SELECT ${COLUMNS} FROM daily_settings WHERE id = 1`,
  );
  if (row) return row;

  // Safety net: migrations già inseriscono il singleton, reinseriamo se assente.
  await db.runAsync(
    `INSERT OR IGNORE INTO daily_settings (id, side_dish_calories) VALUES (1, 50)`,
  );
  const reloaded = await db.getFirstAsync<DailySettings>(
    `SELECT ${COLUMNS} FROM daily_settings WHERE id = 1`,
  );
  if (!reloaded) throw new Error('daily_settings singleton missing');
  return reloaded;
}

export async function updateSettings(patch: DailySettingsPatch): Promise<DailySettings> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: number[] = [];
  if (patch.sideDishCalories !== undefined) {
    fields.push('side_dish_calories = ?');
    values.push(patch.sideDishCalories);
  }
  if (fields.length > 0) {
    fields.push(`updated_at = datetime('now')`);
    await db.runAsync(
      `UPDATE daily_settings SET ${fields.join(', ')} WHERE id = 1`,
      ...values,
    );
  }
  return getSettings();
}
