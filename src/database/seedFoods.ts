import type * as SQLite from 'expo-sqlite';

type SeedServing = { label: string; grams: number; isDefault?: boolean };
type SeedFood = {
  name: string;
  caloriesPer100g: number;
  servings?: SeedServing[];
};

// Valori kcal/100g indicativi (fonte CREA - INRAN / USDA, arrotondati).
// Le porzioni sono pesi medi tipici per facilitare l'input rapido (vedi
// `food_servings`); l'utente può comunque continuare a digitare i grammi.
export const DEFAULT_ITALIAN_FOODS: SeedFood[] = [
  {
    name: 'Petto di pollo',
    caloriesPer100g: 165,
    servings: [{ label: 'porzione media', grams: 150, isDefault: true }],
  },
  {
    name: 'Petto di tacchino',
    caloriesPer100g: 107,
    servings: [{ label: 'porzione media', grams: 150, isDefault: true }],
  },
  {
    name: 'Fesa di manzo',
    caloriesPer100g: 130,
    servings: [{ label: 'porzione media', grams: 150, isDefault: true }],
  },
  {
    name: 'Lonza di maiale',
    caloriesPer100g: 193,
    servings: [{ label: 'porzione media', grams: 150, isDefault: true }],
  },
  {
    name: 'Bresaola',
    caloriesPer100g: 151,
    servings: [{ label: 'fetta', grams: 8, isDefault: true }],
  },
  {
    name: 'Prosciutto crudo',
    caloriesPer100g: 224,
    servings: [{ label: 'fetta', grams: 15, isDefault: true }],
  },
  {
    name: 'Prosciutto cotto',
    caloriesPer100g: 146,
    servings: [{ label: 'fetta', grams: 20, isDefault: true }],
  },
  {
    name: 'Tonno al naturale (sgocciolato)',
    caloriesPer100g: 116,
    servings: [{ label: 'scatoletta', grams: 52, isDefault: true }],
  },
  {
    name: 'Salmone',
    caloriesPer100g: 208,
    servings: [{ label: 'filetto', grams: 120, isDefault: true }],
  },
  {
    name: 'Merluzzo',
    caloriesPer100g: 82,
    servings: [{ label: 'filetto', grams: 130, isDefault: true }],
  },
  { name: 'Gamberi', caloriesPer100g: 99 },
  {
    name: 'Uovo intero',
    caloriesPer100g: 143,
    servings: [
      { label: 'uovo medio', grams: 55, isDefault: true },
      { label: 'uovo grande', grams: 65 },
    ],
  },
  {
    name: 'Albume d’uovo',
    caloriesPer100g: 52,
    servings: [{ label: 'albume', grams: 33, isDefault: true }],
  },
  {
    name: 'Pasta di semola (secca)',
    caloriesPer100g: 353,
    servings: [
      { label: 'porzione', grams: 80, isDefault: true },
      { label: 'mezza porzione', grams: 60 },
    ],
  },
  {
    name: 'Riso bianco (crudo)',
    caloriesPer100g: 354,
    servings: [
      { label: 'porzione', grams: 70, isDefault: true },
      { label: 'mezza porzione', grams: 50 },
    ],
  },
  {
    name: 'Riso integrale (crudo)',
    caloriesPer100g: 337,
    servings: [{ label: 'porzione', grams: 70, isDefault: true }],
  },
  {
    name: 'Pane comune',
    caloriesPer100g: 265,
    servings: [
      { label: 'fetta', grams: 30, isDefault: true },
      { label: 'panino', grams: 50 },
    ],
  },
  {
    name: 'Pane integrale',
    caloriesPer100g: 247,
    servings: [{ label: 'fetta', grams: 30, isDefault: true }],
  },
  {
    name: 'Fette biscottate',
    caloriesPer100g: 408,
    servings: [{ label: 'fetta', grams: 10, isDefault: true }],
  },
  {
    name: 'Patate',
    caloriesPer100g: 77,
    servings: [{ label: 'patata media', grams: 150, isDefault: true }],
  },
  { name: 'Fagioli cannellini (cotti)', caloriesPer100g: 139 },
  { name: 'Ceci (cotti)', caloriesPer100g: 164 },
  { name: 'Lenticchie (cotte)', caloriesPer100g: 116 },
  { name: 'Zucchine', caloriesPer100g: 17 },
  { name: 'Pomodoro', caloriesPer100g: 18 },
  { name: 'Spinaci freschi', caloriesPer100g: 23 },
  { name: 'Lattuga', caloriesPer100g: 15 },
  { name: 'Carote', caloriesPer100g: 41 },
  { name: 'Peperoni', caloriesPer100g: 31 },
  { name: 'Melanzane', caloriesPer100g: 25 },
  { name: 'Broccoli', caloriesPer100g: 34 },
  { name: 'Finocchi', caloriesPer100g: 31 },
  {
    name: 'Mela',
    caloriesPer100g: 52,
    servings: [{ label: 'mela media', grams: 180, isDefault: true }],
  },
  {
    name: 'Banana',
    caloriesPer100g: 89,
    servings: [{ label: 'banana media', grams: 120, isDefault: true }],
  },
  {
    name: 'Arancia',
    caloriesPer100g: 47,
    servings: [{ label: 'arancia media', grams: 200, isDefault: true }],
  },
  {
    name: 'Pera',
    caloriesPer100g: 57,
    servings: [{ label: 'pera media', grams: 170, isDefault: true }],
  },
  { name: 'Fragole', caloriesPer100g: 32 },
  {
    name: 'Mozzarella',
    caloriesPer100g: 253,
    servings: [
      { label: 'mozzarella', grams: 125, isDefault: true },
      { label: 'fetta', grams: 30 },
    ],
  },
  {
    name: 'Parmigiano Reggiano',
    caloriesPer100g: 393,
    servings: [
      { label: 'scaglia', grams: 10, isDefault: true },
      { label: 'cucchiaio grattugiato', grams: 5 },
    ],
  },
  {
    name: 'Ricotta vaccina',
    caloriesPer100g: 146,
    servings: [
      { label: 'porzione', grams: 80, isDefault: true },
      { label: 'cucchiaio', grams: 25 },
    ],
  },
  {
    name: 'Yogurt bianco intero',
    caloriesPer100g: 61,
    servings: [{ label: 'vasetto', grams: 125, isDefault: true }],
  },
  {
    name: 'Yogurt greco 0%',
    caloriesPer100g: 59,
    servings: [{ label: 'vasetto', grams: 150, isDefault: true }],
  },
  {
    name: 'Latte parzialmente scremato',
    caloriesPer100g: 46,
    servings: [
      { label: 'bicchiere', grams: 200, isDefault: true },
      { label: 'tazza', grams: 250 },
    ],
  },
  {
    name: 'Olio extravergine d’oliva',
    caloriesPer100g: 884,
    servings: [
      { label: 'cucchiaino', grams: 5, isDefault: true },
      { label: 'cucchiaio', grams: 12 },
    ],
  },
  {
    name: 'Burro',
    caloriesPer100g: 717,
    servings: [
      { label: 'noce', grams: 10, isDefault: true },
      { label: 'cucchiaino', grams: 5 },
    ],
  },
  {
    name: 'Zucchero',
    caloriesPer100g: 387,
    servings: [
      { label: 'cucchiaino', grams: 5, isDefault: true },
      { label: 'zolletta', grams: 5 },
      { label: 'cucchiaio', grams: 12 },
    ],
  },
  {
    name: 'Miele',
    caloriesPer100g: 304,
    servings: [
      { label: 'cucchiaino', grams: 7, isDefault: true },
      { label: 'cucchiaio', grams: 21 },
    ],
  },
  {
    name: 'Noci',
    caloriesPer100g: 654,
    servings: [
      { label: 'manciata', grams: 30, isDefault: true },
      { label: 'gheriglio', grams: 5 },
    ],
  },
  {
    name: 'Mandorle',
    caloriesPer100g: 579,
    servings: [
      { label: 'manciata', grams: 30, isDefault: true },
      { label: 'mandorla', grams: 1 },
    ],
  },
];

export async function seedFoodsIfEmpty(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM foods');
  if (row && row.count > 0) return;

  const stmt = await db.prepareAsync(
    `INSERT INTO foods (name, calories_per_100g, source) VALUES (?, ?, 'manual')`,
  );
  try {
    for (const food of DEFAULT_ITALIAN_FOODS) {
      await stmt.executeAsync([food.name, food.caloriesPer100g]);
    }
  } finally {
    await stmt.finalizeAsync();
  }
}

// Popola le porzioni standard solo se la tabella è vuota. Idempotente:
// utenti con DB esistente recuperano le porzioni al primo avvio successivo
// all'aggiornamento. Lo stesso passaggio si occupa di inserire eventuali food
// del seed che mancano (es. "Zucchero" introdotto dopo il primo seed) — il
// match avviene per nome esatto case-insensitive, così rinominazioni manuali
// dell'utente non rischiano di rifondere i suoi food.
export async function seedServingsIfEmpty(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM food_servings',
  );
  if (row && row.count > 0) return;

  const existingFoods = await db.getAllAsync<{ id: number; name: string }>(
    `SELECT id, LOWER(name) AS name FROM foods`,
  );
  const foodIdByName = new Map<string, number>();
  for (const f of existingFoods) foodIdByName.set(f.name, f.id);

  const insertFood = await db.prepareAsync(
    `INSERT INTO foods (name, calories_per_100g, source) VALUES (?, ?, 'manual')`,
  );
  const insertServing = await db.prepareAsync(
    `INSERT INTO food_servings (food_id, label, grams, is_default, position)
     VALUES (?, ?, ?, ?, ?)`,
  );
  try {
    for (const food of DEFAULT_ITALIAN_FOODS) {
      const key = food.name.toLowerCase();
      let foodId = foodIdByName.get(key);
      if (foodId === undefined) {
        const result = await insertFood.executeAsync([food.name, food.caloriesPer100g]);
        foodId = result.lastInsertRowId as number;
        foodIdByName.set(key, foodId);
      }
      if (!food.servings || food.servings.length === 0) continue;
      let position = 0;
      for (const serving of food.servings) {
        await insertServing.executeAsync([
          foodId,
          serving.label,
          serving.grams,
          serving.isDefault ? 1 : 0,
          position,
        ]);
        position += 1;
      }
    }
  } finally {
    await insertFood.finalizeAsync();
    await insertServing.finalizeAsync();
  }
}
