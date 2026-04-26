import { getDatabase } from './db';

export type MealType = 'colazione' | 'pranzo' | 'cena' | 'spuntino';

export type Meal = {
  id: number;
  date: string;
  mealType: MealType;
  foodId: number | null;
  foodName: string;
  grams: number;
  caloriesTotal: number;
  servingLabel: string | null;
  servingQty: number | null;
  proteinTotal: number | null;
  carbsTotal: number | null;
  fatTotal: number | null;
  createdAt: string;
};

export type NewMeal = {
  date: string;
  mealType: MealType;
  foodId: number | null;
  foodName: string;
  grams: number;
  caloriesTotal: number;
  servingLabel?: string | null;
  servingQty?: number | null;
  proteinTotal?: number | null;
  carbsTotal?: number | null;
  fatTotal?: number | null;
};

const COLUMNS = `
  id,
  date,
  meal_type AS mealType,
  food_id AS foodId,
  food_name AS foodName,
  grams,
  calories_total AS caloriesTotal,
  serving_label AS servingLabel,
  serving_qty AS servingQty,
  protein_total AS proteinTotal,
  carbs_total AS carbsTotal,
  fat_total AS fatTotal,
  created_at AS createdAt
`;

export async function createMeal(meal: NewMeal): Promise<Meal> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO meals (
       date, meal_type, food_id, food_name, grams, calories_total,
       serving_label, serving_qty, protein_total, carbs_total, fat_total
     )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    meal.date,
    meal.mealType,
    meal.foodId,
    meal.foodName,
    meal.grams,
    meal.caloriesTotal,
    meal.servingLabel ?? null,
    meal.servingQty ?? null,
    meal.proteinTotal ?? null,
    meal.carbsTotal ?? null,
    meal.fatTotal ?? null,
  );
  const created = await getMeal(result.lastInsertRowId);
  if (!created) throw new Error('Meal creation failed');
  return created;
}

export async function getMeal(id: number): Promise<Meal | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Meal>(
    `SELECT ${COLUMNS} FROM meals WHERE id = ?`,
    id,
  );
  return row ?? null;
}

export async function listMealsByDate(date: string): Promise<Meal[]> {
  const db = await getDatabase();
  return db.getAllAsync<Meal>(
    `SELECT ${COLUMNS} FROM meals WHERE date = ? ORDER BY
       CASE meal_type
         WHEN 'colazione' THEN 1
         WHEN 'pranzo' THEN 2
         WHEN 'cena' THEN 3
         WHEN 'spuntino' THEN 4
       END, created_at ASC`,
    date,
  );
}

export async function listMealsByDateRange(
  fromDate: string,
  toDate: string,
): Promise<Meal[]> {
  const db = await getDatabase();
  return db.getAllAsync<Meal>(
    `SELECT ${COLUMNS} FROM meals WHERE date BETWEEN ? AND ? ORDER BY date ASC, created_at ASC`,
    fromDate,
    toDate,
  );
}

export async function updateMeal(
  id: number,
  patch: Partial<NewMeal>,
): Promise<Meal | null> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.date !== undefined) {
    fields.push('date = ?');
    values.push(patch.date);
  }
  if (patch.mealType !== undefined) {
    fields.push('meal_type = ?');
    values.push(patch.mealType);
  }
  if (patch.foodId !== undefined) {
    fields.push('food_id = ?');
    values.push(patch.foodId);
  }
  if (patch.foodName !== undefined) {
    fields.push('food_name = ?');
    values.push(patch.foodName);
  }
  if (patch.grams !== undefined) {
    fields.push('grams = ?');
    values.push(patch.grams);
  }
  if (patch.caloriesTotal !== undefined) {
    fields.push('calories_total = ?');
    values.push(patch.caloriesTotal);
  }
  if (patch.servingLabel !== undefined) {
    fields.push('serving_label = ?');
    values.push(patch.servingLabel);
  }
  if (patch.servingQty !== undefined) {
    fields.push('serving_qty = ?');
    values.push(patch.servingQty);
  }
  if (patch.proteinTotal !== undefined) {
    fields.push('protein_total = ?');
    values.push(patch.proteinTotal);
  }
  if (patch.carbsTotal !== undefined) {
    fields.push('carbs_total = ?');
    values.push(patch.carbsTotal);
  }
  if (patch.fatTotal !== undefined) {
    fields.push('fat_total = ?');
    values.push(patch.fatTotal);
  }
  if (fields.length === 0) return getMeal(id);

  values.push(id);
  await db.runAsync(`UPDATE meals SET ${fields.join(', ')} WHERE id = ?`, ...values);
  return getMeal(id);
}

export async function deleteMeal(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM meals WHERE id = ?`, id);
}

export async function sumCaloriesByDate(date: string): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(calories_total) AS total FROM meals WHERE date = ?`,
    date,
  );
  return row?.total ?? 0;
}

export async function sumCaloriesByMealType(
  date: string,
): Promise<Record<MealType, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ mealType: MealType; total: number }>(
    `SELECT meal_type AS mealType, COALESCE(SUM(calories_total), 0) AS total
     FROM meals WHERE date = ? GROUP BY meal_type`,
    date,
  );
  const result: Record<MealType, number> = {
    colazione: 0,
    pranzo: 0,
    cena: 0,
    spuntino: 0,
  };
  for (const row of rows) result[row.mealType] = row.total;
  return result;
}

export async function sumMacrosByDate(date: string): Promise<{
  protein: number;
  carbs: number;
  fat: number;
}> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  }>(
    `SELECT
       COALESCE(SUM(protein_total), 0) AS protein,
       COALESCE(SUM(carbs_total), 0)   AS carbs,
       COALESCE(SUM(fat_total), 0)     AS fat
     FROM meals WHERE date = ?`,
    date,
  );
  return {
    protein: row?.protein ?? 0,
    carbs: row?.carbs ?? 0,
    fat: row?.fat ?? 0,
  };
}
