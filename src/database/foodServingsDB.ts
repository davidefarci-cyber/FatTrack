import { getDatabase } from './db';

// Porzioni alternative associate a un food (es. "fetta" = 10g, "cucchiaino" = 5g).
// Ogni food può avere più porzioni; al massimo una è marcata `isDefault` per
// suggerirla come selezione iniziale nel `GramsInputModal`.

export type FoodServing = {
  id: number;
  foodId: number;
  label: string;
  grams: number;
  isDefault: boolean;
  position: number;
  createdAt: string;
};

export type NewFoodServing = {
  foodId: number;
  label: string;
  grams: number;
  isDefault?: boolean;
  position?: number;
};

type Row = {
  id: number;
  foodId: number;
  label: string;
  grams: number;
  isDefault: number;
  position: number;
  createdAt: string;
};

const COLUMNS = `
  id,
  food_id AS foodId,
  label,
  grams,
  is_default AS isDefault,
  position,
  created_at AS createdAt
`;

function rowToServing(row: Row): FoodServing {
  return { ...row, isDefault: row.isDefault === 1 };
}

export async function listServingsByFood(foodId: number): Promise<FoodServing[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Row>(
    `SELECT ${COLUMNS} FROM food_servings WHERE food_id = ?
     ORDER BY position ASC, id ASC`,
    foodId,
  );
  return rows.map(rowToServing);
}

export async function createServing(input: NewFoodServing): Promise<FoodServing> {
  const db = await getDatabase();
  const isDefault = input.isDefault ? 1 : 0;
  if (isDefault === 1) {
    await db.runAsync(
      `UPDATE food_servings SET is_default = 0 WHERE food_id = ?`,
      input.foodId,
    );
  }
  const result = await db.runAsync(
    `INSERT INTO food_servings (food_id, label, grams, is_default, position)
     VALUES (?, ?, ?, ?, ?)`,
    input.foodId,
    input.label.trim(),
    input.grams,
    isDefault,
    input.position ?? 0,
  );
  const created = await getServing(result.lastInsertRowId);
  if (!created) throw new Error('Food serving creation failed');
  return created;
}

export async function getServing(id: number): Promise<FoodServing | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${COLUMNS} FROM food_servings WHERE id = ?`,
    id,
  );
  return row ? rowToServing(row) : null;
}

export async function updateServing(
  id: number,
  patch: Partial<Omit<NewFoodServing, 'foodId'>>,
): Promise<FoodServing | null> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (patch.label !== undefined) {
    fields.push('label = ?');
    values.push(patch.label.trim());
  }
  if (patch.grams !== undefined) {
    fields.push('grams = ?');
    values.push(patch.grams);
  }
  if (patch.position !== undefined) {
    fields.push('position = ?');
    values.push(patch.position);
  }
  if (patch.isDefault !== undefined) {
    if (patch.isDefault) {
      const current = await getServing(id);
      if (current) {
        await db.runAsync(
          `UPDATE food_servings SET is_default = 0 WHERE food_id = ?`,
          current.foodId,
        );
      }
    }
    fields.push('is_default = ?');
    values.push(patch.isDefault ? 1 : 0);
  }
  if (fields.length === 0) return getServing(id);

  values.push(id);
  await db.runAsync(
    `UPDATE food_servings SET ${fields.join(', ')} WHERE id = ?`,
    ...values,
  );
  return getServing(id);
}

export async function setDefaultServing(
  foodId: number,
  servingId: number,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE food_servings SET is_default = 0 WHERE food_id = ?`,
    foodId,
  );
  await db.runAsync(
    `UPDATE food_servings SET is_default = 1 WHERE id = ? AND food_id = ?`,
    servingId,
    foodId,
  );
}

export async function deleteServing(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM food_servings WHERE id = ?`, id);
}
