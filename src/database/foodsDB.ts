import { getDatabase } from './db';

export type FoodSource = 'manual' | 'api' | 'barcode';

export type Food = {
  id: number;
  name: string;
  caloriesPer100g: number;
  source: FoodSource;
  createdAt: string;
};

export type NewFood = {
  name: string;
  caloriesPer100g: number;
  source: FoodSource;
};

const COLUMNS = `
  id,
  name,
  calories_per_100g AS caloriesPer100g,
  source,
  created_at AS createdAt
`;

export async function createFood(food: NewFood): Promise<Food> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO foods (name, calories_per_100g, source) VALUES (?, ?, ?)`,
    food.name,
    food.caloriesPer100g,
    food.source,
  );
  const created = await getFood(result.lastInsertRowId);
  if (!created) throw new Error('Food creation failed');
  return created;
}

export async function getFood(id: number): Promise<Food | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Food>(
    `SELECT ${COLUMNS} FROM foods WHERE id = ?`,
    id,
  );
  return row ?? null;
}

export async function listFoods(limit = 100, offset = 0): Promise<Food[]> {
  const db = await getDatabase();
  return db.getAllAsync<Food>(
    `SELECT ${COLUMNS} FROM foods ORDER BY name ASC LIMIT ? OFFSET ?`,
    limit,
    offset,
  );
}

export async function searchFoods(query: string, limit = 50): Promise<Food[]> {
  const db = await getDatabase();
  const like = `%${query.trim()}%`;
  return db.getAllAsync<Food>(
    `SELECT ${COLUMNS} FROM foods WHERE name LIKE ? ORDER BY name ASC LIMIT ?`,
    like,
    limit,
  );
}

// Match case-insensitive sul nome esatto: usato per deduplicare quando si
// sta per salvare un alimento proveniente da un'API esterna (Open Food Facts).
export async function findByName(name: string): Promise<Food | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Food>(
    `SELECT ${COLUMNS} FROM foods WHERE LOWER(name) = LOWER(?) LIMIT 1`,
    name.trim(),
  );
  return row ?? null;
}

export async function updateFood(
  id: number,
  patch: Partial<NewFood>,
): Promise<Food | null> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (patch.name !== undefined) {
    fields.push('name = ?');
    values.push(patch.name);
  }
  if (patch.caloriesPer100g !== undefined) {
    fields.push('calories_per_100g = ?');
    values.push(patch.caloriesPer100g);
  }
  if (patch.source !== undefined) {
    fields.push('source = ?');
    values.push(patch.source);
  }
  if (fields.length === 0) return getFood(id);

  values.push(id);
  await db.runAsync(`UPDATE foods SET ${fields.join(', ')} WHERE id = ?`, ...values);
  return getFood(id);
}

export async function deleteFood(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM foods WHERE id = ?`, id);
}

export async function countFoods(): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM foods`,
  );
  return row?.count ?? 0;
}
