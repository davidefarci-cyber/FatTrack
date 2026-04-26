import { getDatabase } from './db';

// Add-on a calorie fisse (es. "Contorno verdure" 50 kcal, "Olio in cottura" 80
// kcal). Estende il pattern del vecchio singolo "contorno automatico" a una
// lista configurabile dall'utente in Settings.

export type QuickAddon = {
  id: number;
  label: string;
  calories: number;
  position: number;
  createdAt: string;
};

export type NewQuickAddon = {
  label: string;
  calories: number;
  position?: number;
};

const COLUMNS = `
  id,
  label,
  calories,
  position,
  created_at AS createdAt
`;

export async function listAddons(): Promise<QuickAddon[]> {
  const db = await getDatabase();
  return db.getAllAsync<QuickAddon>(
    `SELECT ${COLUMNS} FROM quick_addons ORDER BY position ASC, id ASC`,
  );
}

export async function createAddon(input: NewQuickAddon): Promise<QuickAddon> {
  const db = await getDatabase();
  const position = input.position ?? (await nextPosition(db));
  const result = await db.runAsync(
    `INSERT INTO quick_addons (label, calories, position) VALUES (?, ?, ?)`,
    input.label.trim(),
    input.calories,
    position,
  );
  const created = await getAddon(result.lastInsertRowId);
  if (!created) throw new Error('Quick addon creation failed');
  return created;
}

export async function getAddon(id: number): Promise<QuickAddon | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<QuickAddon>(
    `SELECT ${COLUMNS} FROM quick_addons WHERE id = ?`,
    id,
  );
  return row ?? null;
}

export async function updateAddon(
  id: number,
  patch: Partial<NewQuickAddon>,
): Promise<QuickAddon | null> {
  const db = await getDatabase();
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (patch.label !== undefined) {
    fields.push('label = ?');
    values.push(patch.label.trim());
  }
  if (patch.calories !== undefined) {
    fields.push('calories = ?');
    values.push(patch.calories);
  }
  if (patch.position !== undefined) {
    fields.push('position = ?');
    values.push(patch.position);
  }
  if (fields.length === 0) return getAddon(id);

  values.push(id);
  await db.runAsync(
    `UPDATE quick_addons SET ${fields.join(', ')} WHERE id = ?`,
    ...values,
  );
  return getAddon(id);
}

export async function deleteAddon(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM quick_addons WHERE id = ?`, id);
}

async function nextPosition(
  db: Awaited<ReturnType<typeof getDatabase>>,
): Promise<number> {
  const row = await db.getFirstAsync<{ max: number | null }>(
    `SELECT MAX(position) AS max FROM quick_addons`,
  );
  return (row?.max ?? -1) + 1;
}
