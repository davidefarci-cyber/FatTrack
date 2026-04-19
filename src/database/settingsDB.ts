import { getDatabase } from './db';

export type DailySettings = {
  targetCalories: number;
  sideDishCalories: number;
  updatedAt: string;
};

export type DailySettingsPatch = Partial<Omit<DailySettings, 'updatedAt'>>;

const COLUMNS = `
  target_calories AS targetCalories,
  side_dish_calories AS sideDishCalories,
  updated_at AS updatedAt
`;

export async function getSettings(): Promise<DailySettings> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<DailySettings>(
    `SELECT ${COLUMNS} FROM daily_settings WHERE id = 1`,
  );
  if (row) return row;

  // Safety net: migrations already insert the singleton, but reinsert if missing.
  await db.runAsync(
    `INSERT OR IGNORE INTO daily_settings (id, target_calories, side_dish_calories) VALUES (1, 2000, 0)`,
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
  if (patch.targetCalories !== undefined) {
    fields.push('target_calories = ?');
    values.push(patch.targetCalories);
  }
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
