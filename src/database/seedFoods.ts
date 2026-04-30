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
// Riferimento principale per i pesi commerciali (frutto medio, fetta,
// cucchiai, scatolette, vasetti): tabella pesi megamediateam + CREA.
export const DEFAULT_ITALIAN_FOODS: SeedFood[] = [
  // -- Carni ---------------------------------------------------------------
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
  // -- Salumi --------------------------------------------------------------
  {
    name: 'Bresaola',
    caloriesPer100g: 151,
    servings: [
      { label: 'fetta', grams: 8, isDefault: true },
      { label: 'porzione', grams: 50 },
    ],
  },
  {
    name: 'Prosciutto crudo',
    caloriesPer100g: 224,
    servings: [
      { label: 'fetta piccola', grams: 10 },
      { label: 'fetta', grams: 15, isDefault: true },
      { label: 'fetta grande', grams: 20 },
    ],
  },
  {
    name: 'Prosciutto cotto',
    caloriesPer100g: 146,
    servings: [
      { label: 'fetta piccola', grams: 10 },
      { label: 'fetta', grams: 20, isDefault: true },
    ],
  },
  {
    name: 'Salame',
    caloriesPer100g: 398,
    servings: [
      { label: 'fetta sottile', grams: 7, isDefault: true },
      { label: 'fetta spessa', grams: 11 },
    ],
  },
  // -- Pesce ---------------------------------------------------------------
  {
    name: 'Tonno al naturale (sgocciolato)',
    caloriesPer100g: 116,
    servings: [
      { label: 'scatoletta piccola', grams: 52, isDefault: true },
      { label: 'scatoletta', grams: 80 },
    ],
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
  // -- Uova ----------------------------------------------------------------
  {
    name: 'Uovo intero',
    caloriesPer100g: 143,
    servings: [
      { label: 'uovo medio', grams: 55, isDefault: true },
      { label: 'uovo grande', grams: 65 },
      { label: 'tuorlo', grams: 18 },
    ],
  },
  {
    name: 'Albume d’uovo',
    caloriesPer100g: 52,
    servings: [
      { label: 'albume', grams: 33, isDefault: true },
      { label: 'albume grande', grams: 35 },
    ],
  },
  // -- Cereali / pasta / pane ---------------------------------------------
  {
    name: 'Pasta di semola (secca)',
    caloriesPer100g: 353,
    servings: [
      { label: 'porzione', grams: 80, isDefault: true },
      { label: 'mezza porzione', grams: 60 },
      { label: 'cucchiaio colmo', grams: 14 },
    ],
  },
  {
    name: 'Riso bianco (crudo)',
    caloriesPer100g: 354,
    servings: [
      { label: 'porzione', grams: 70, isDefault: true },
      { label: 'mezza porzione', grams: 50 },
      { label: 'cucchiaio colmo', grams: 18 },
      { label: 'bicchiere', grams: 200 },
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
      { label: 'panino tartina', grams: 32 },
      { label: 'rosetta', grams: 55 },
      { label: 'panino', grams: 60 },
      { label: 'ciabattina', grams: 75 },
    ],
  },
  {
    name: 'Pane integrale',
    caloriesPer100g: 247,
    servings: [{ label: 'fetta', grams: 30, isDefault: true }],
  },
  {
    name: 'Pancarrè',
    caloriesPer100g: 290,
    servings: [{ label: 'fetta', grams: 18, isDefault: true }],
  },
  {
    name: 'Fette biscottate',
    caloriesPer100g: 408,
    servings: [{ label: 'fetta', grams: 9, isDefault: true }],
  },
  {
    name: 'Biscotti secchi',
    caloriesPer100g: 440,
    servings: [
      { label: 'biscotto', grams: 7, isDefault: true },
      { label: 'frollino', grams: 8 },
    ],
  },
  {
    name: 'Grissini',
    caloriesPer100g: 431,
    servings: [{ label: 'grissino', grams: 5, isDefault: true }],
  },
  {
    name: 'Cracker',
    caloriesPer100g: 428,
    servings: [{ label: 'cracker', grams: 6, isDefault: true }],
  },
  {
    name: 'Fiocchi d’avena',
    caloriesPer100g: 372,
    servings: [
      { label: 'porzione', grams: 40, isDefault: true },
      { label: 'tazza', grams: 85 },
    ],
  },
  // -- Tuberi / legumi / verdure ------------------------------------------
  {
    name: 'Patate',
    caloriesPer100g: 77,
    servings: [
      { label: 'patata media', grams: 120, isDefault: true },
      { label: 'patata piccola', grams: 100 },
      { label: 'patata grande', grams: 150 },
    ],
  },
  { name: 'Fagioli cannellini (cotti)', caloriesPer100g: 139 },
  { name: 'Ceci (cotti)', caloriesPer100g: 164 },
  { name: 'Lenticchie (cotte)', caloriesPer100g: 116 },
  {
    name: 'Zucchine',
    caloriesPer100g: 17,
    servings: [{ label: 'zucchina piccola', grams: 100, isDefault: true }],
  },
  {
    name: 'Pomodoro',
    caloriesPer100g: 18,
    servings: [
      { label: 'pomodoro medio', grams: 170, isDefault: true },
      { label: 'pomodoro piccolo', grams: 100 },
    ],
  },
  { name: 'Spinaci freschi', caloriesPer100g: 23 },
  { name: 'Lattuga', caloriesPer100g: 15 },
  {
    name: 'Carote',
    caloriesPer100g: 41,
    servings: [{ label: 'carota piccola', grams: 80, isDefault: true }],
  },
  {
    name: 'Cipolla',
    caloriesPer100g: 26,
    servings: [{ label: 'cipolla media', grams: 50, isDefault: true }],
  },
  { name: 'Peperoni', caloriesPer100g: 31 },
  { name: 'Melanzane', caloriesPer100g: 25 },
  { name: 'Broccoli', caloriesPer100g: 34 },
  { name: 'Finocchi', caloriesPer100g: 31 },
  {
    name: 'Olive verdi',
    caloriesPer100g: 145,
    servings: [
      { label: 'oliva', grams: 5, isDefault: true },
      { label: 'manciata', grams: 25 },
    ],
  },
  // -- Frutta --------------------------------------------------------------
  {
    name: 'Mela',
    caloriesPer100g: 52,
    servings: [
      { label: 'mela media', grams: 170, isDefault: true },
      { label: 'mela grande', grams: 240 },
    ],
  },
  {
    name: 'Banana',
    caloriesPer100g: 89,
    servings: [{ label: 'banana media', grams: 200, isDefault: true }],
  },
  {
    name: 'Arancia',
    caloriesPer100g: 47,
    servings: [{ label: 'arancia media', grams: 170, isDefault: true }],
  },
  {
    name: 'Pera',
    caloriesPer100g: 57,
    servings: [{ label: 'pera media', grams: 150, isDefault: true }],
  },
  {
    name: 'Albicocca',
    caloriesPer100g: 28,
    servings: [{ label: 'albicocca', grams: 25, isDefault: true }],
  },
  {
    name: 'Prugna',
    caloriesPer100g: 46,
    servings: [{ label: 'prugna', grams: 30, isDefault: true }],
  },
  { name: 'Fragole', caloriesPer100g: 32 },
  // -- Latticini -----------------------------------------------------------
  {
    name: 'Mozzarella',
    caloriesPer100g: 253,
    servings: [
      { label: 'mozzarella in busta', grams: 125, isDefault: true },
      { label: 'fetta', grams: 30 },
    ],
  },
  {
    name: 'Sottiletta',
    caloriesPer100g: 280,
    servings: [{ label: 'sottiletta', grams: 20, isDefault: true }],
  },
  {
    name: 'Formaggino',
    caloriesPer100g: 253,
    servings: [{ label: 'formaggino', grams: 20, isDefault: true }],
  },
  {
    name: 'Parmigiano Reggiano',
    caloriesPer100g: 393,
    servings: [
      { label: 'scaglia', grams: 10, isDefault: true },
      { label: 'cucchiaino grattugiato', grams: 5 },
      { label: 'cucchiaio grattugiato', grams: 15 },
    ],
  },
  {
    name: 'Ricotta vaccina',
    caloriesPer100g: 146,
    servings: [
      { label: 'porzione', grams: 80, isDefault: true },
      { label: 'cucchiaio raso', grams: 15 },
      { label: 'cucchiaio colmo', grams: 20 },
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
      { label: 'cucchiaio', grams: 12 },
      { label: 'cucchiaino', grams: 5 },
    ],
  },
  {
    name: 'Panna fresca',
    caloriesPer100g: 337,
    servings: [
      { label: 'cucchiaio', grams: 12, isDefault: true },
      { label: 'cucchiaino', grams: 5 },
    ],
  },
  // -- Grassi / condimenti ------------------------------------------------
  {
    name: 'Olio extravergine d’oliva',
    caloriesPer100g: 884,
    servings: [
      { label: 'cucchiaino', grams: 5, isDefault: true },
      { label: 'cucchiaio', grams: 10 },
      { label: 'bicchiere', grams: 200 },
    ],
  },
  {
    name: 'Burro',
    caloriesPer100g: 717,
    servings: [
      { label: 'noce', grams: 20, isDefault: true },
      { label: 'cucchiaino raso', grams: 5 },
      { label: 'cucchiaio colmo', grams: 15 },
      { label: 'confezione alberghiera', grams: 12 },
    ],
  },
  {
    name: 'Margarina',
    caloriesPer100g: 720,
    servings: [
      { label: 'cucchiaio colmo', grams: 14, isDefault: true },
      { label: 'cucchiaino', grams: 5 },
    ],
  },
  // -- Zuccheri / dolcificanti --------------------------------------------
  {
    name: 'Zucchero',
    caloriesPer100g: 387,
    servings: [
      { label: 'cucchiaino raso', grams: 5, isDefault: true },
      { label: 'cucchiaino colmo', grams: 8 },
      { label: 'cucchiaio raso', grams: 15 },
      { label: 'cucchiaio colmo', grams: 25 },
      { label: 'zolletta', grams: 4 },
      { label: 'bustina', grams: 7 },
    ],
  },
  {
    name: 'Zucchero a velo',
    caloriesPer100g: 387,
    servings: [
      { label: 'cucchiaino colmo', grams: 7, isDefault: true },
      { label: 'cucchiaio colmo', grams: 15 },
    ],
  },
  {
    name: 'Miele',
    caloriesPer100g: 304,
    servings: [
      { label: 'cucchiaino', grams: 7, isDefault: true },
      { label: 'cucchiaio', grams: 21 },
      { label: 'confezione alberghiera', grams: 20 },
    ],
  },
  {
    name: 'Marmellata',
    caloriesPer100g: 250,
    servings: [
      { label: 'cucchiaino raso', grams: 5, isDefault: true },
      { label: 'cucchiaio colmo', grams: 30 },
      { label: 'confezione alberghiera', grams: 28 },
    ],
  },
  // -- Frutta secca --------------------------------------------------------
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
      { label: 'mandorla', grams: 3 },
    ],
  },
  {
    name: 'Nocciole',
    caloriesPer100g: 628,
    servings: [
      { label: 'manciata', grams: 30, isDefault: true },
      { label: 'nocciola', grams: 3 },
    ],
  },
  {
    name: 'Arachidi',
    caloriesPer100g: 567,
    servings: [
      { label: 'manciata', grams: 30, isDefault: true },
      { label: 'arachide', grams: 4 },
    ],
  },
  // -- Bevande -------------------------------------------------------------
  {
    name: 'Vino rosso',
    caloriesPer100g: 85,
    servings: [
      { label: 'bicchiere', grams: 130, isDefault: true },
      { label: 'bicchiere grande', grams: 150 },
    ],
  },
  {
    name: 'Succo di frutta',
    caloriesPer100g: 50,
    servings: [
      { label: 'bottiglietta', grams: 125, isDefault: true },
      { label: 'cartoncino', grams: 200 },
    ],
  },
  {
    name: 'Bibita zuccherata',
    caloriesPer100g: 42,
    servings: [
      { label: 'lattina', grams: 330, isDefault: true },
      { label: 'bottiglietta', grams: 200 },
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

// Upsert idempotente delle porzioni standard.
// - Inserisce eventuali food del seed mancanti (match case-insensitive sul nome).
// - Per ogni food (esistente o appena creato) aggiunge SOLO le porzioni la
//   cui label non è già presente: il vincolo UNIQUE su `(food_id, lower(label))`
//   ci copre via INSERT OR IGNORE; in più non promuoviamo `is_default` se il
//   food ha già almeno una porzione, così non sovrascriviamo eventuali scelte
//   personali dell'utente fatte tramite l'editor.
// - Le label nuove vengono accodate con position incrementale per non
//   alterare l'ordine già presente.
export async function seedServingsIfEmpty(db: SQLite.SQLiteDatabase): Promise<void> {
  const existingFoods = await db.getAllAsync<{ id: number; name: string }>(
    `SELECT id, LOWER(name) AS name FROM foods`,
  );
  const foodIdByName = new Map<string, number>();
  for (const f of existingFoods) foodIdByName.set(f.name, f.id);

  const insertFood = await db.prepareAsync(
    `INSERT INTO foods (name, calories_per_100g, source) VALUES (?, ?, 'manual')`,
  );
  const insertServing = await db.prepareAsync(
    `INSERT OR IGNORE INTO food_servings (food_id, label, grams, is_default, position)
     VALUES (?, ?, ?, ?, ?)`,
  );
  try {
    for (const food of DEFAULT_ITALIAN_FOODS) {
      if (!food.servings || food.servings.length === 0) continue;
      const key = food.name.toLowerCase();
      let foodId = foodIdByName.get(key);
      if (foodId === undefined) {
        const result = await insertFood.executeAsync([food.name, food.caloriesPer100g]);
        foodId = result.lastInsertRowId as number;
        foodIdByName.set(key, foodId);
      }

      const existing = await db.getAllAsync<{ label: string; position: number }>(
        `SELECT lower(label) AS label, position FROM food_servings WHERE food_id = ?`,
        foodId,
      );
      const existingLabels = new Set(existing.map((r) => r.label));
      const hasAny = existing.length > 0;
      let nextPos = existing.reduce((m, r) => Math.max(m, r.position), -1) + 1;

      for (const serving of food.servings) {
        const labelKey = serving.label.trim().toLowerCase();
        if (existingLabels.has(labelKey)) continue;
        const isDefault = !hasAny && serving.isDefault ? 1 : 0;
        await insertServing.executeAsync([
          foodId,
          serving.label,
          serving.grams,
          isDefault,
          nextPos,
        ]);
        nextPos += 1;
      }
    }
  } finally {
    await insertFood.finalizeAsync();
    await insertServing.finalizeAsync();
  }
}
