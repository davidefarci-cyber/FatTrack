import { getDatabase } from './db';

export type FavoriteItem = {
  foodId: number | null;
  foodName: string;
  grams: number;
  calories: number;
  servingLabel?: string | null;
  servingQty?: number | null;
};

export type Favorite = {
  id: number;
  name: string;
  items: FavoriteItem[];
  createdAt: string;
};

export type NewFavorite = {
  name: string;
  items: FavoriteItem[];
};

type Row = {
  id: number;
  name: string;
  items: string;
  createdAt: string;
};

const COLUMNS = `
  id,
  name,
  items,
  created_at AS createdAt
`;

function rowToFavorite(row: Row): Favorite {
  let parsed: FavoriteItem[];
  try {
    const candidate = JSON.parse(row.items);
    parsed = Array.isArray(candidate) ? (candidate as FavoriteItem[]) : [];
  } catch {
    parsed = [];
  }
  return { id: row.id, name: row.name, items: parsed, createdAt: row.createdAt };
}

export async function createFavorite(favorite: NewFavorite): Promise<Favorite> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO favorites (name, items) VALUES (?, ?)`,
    favorite.name,
    JSON.stringify(favorite.items),
  );
  const created = await getFavorite(result.lastInsertRowId);
  if (!created) throw new Error('Favorite creation failed');
  return created;
}

export async function getFavorite(id: number): Promise<Favorite | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${COLUMNS} FROM favorites WHERE id = ?`,
    id,
  );
  return row ? rowToFavorite(row) : null;
}

export async function listFavorites(): Promise<Favorite[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${COLUMNS} FROM favorites ORDER BY name ASC`,
  );
  return rows.map(rowToFavorite);
}

export async function updateFavorite(
  id: number,
  patch: Partial<NewFavorite>,
): Promise<Favorite | null> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: string[] = [];
  if (patch.name !== undefined) {
    fields.push('name = ?');
    values.push(patch.name);
  }
  if (patch.items !== undefined) {
    fields.push('items = ?');
    values.push(JSON.stringify(patch.items));
  }
  if (fields.length === 0) return getFavorite(id);

  await db.runAsync(
    `UPDATE favorites SET ${fields.join(', ')} WHERE id = ?`,
    ...values,
    id,
  );
  return getFavorite(id);
}

export async function deleteFavorite(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM favorites WHERE id = ?`, id);
}

export function totalCalories(favorite: Favorite): number {
  return favorite.items.reduce((sum, item) => sum + item.calories, 0);
}
