import { getDatabase } from './db';

// Easter egg: contatore pizze annuale, raggiungibile via long-press del tab
// "Storico" in modalità diet. Tabella minimale (solo timestamp dell'evento);
// le query usano strftime per raggruppare per anno solare.

export async function addPizza(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`INSERT INTO pizza_log DEFAULT VALUES`);
}

export async function getCountForYear(year: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM pizza_log
       WHERE strftime('%Y', eaten_at) = ?`,
    String(year),
  );
  return row?.count ?? 0;
}

// Lista anni che hanno almeno una pizza, in ordine decrescente. Usata dal
// year picker. L'anno corrente viene sempre garantito dal chiamante.
export async function getYearsWithPizzas(): Promise<number[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ year: string }>(
    `SELECT DISTINCT strftime('%Y', eaten_at) AS year FROM pizza_log
       ORDER BY year DESC`,
  );
  return rows.map((r) => Number(r.year)).filter((y) => Number.isFinite(y));
}
