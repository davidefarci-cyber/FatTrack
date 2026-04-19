import type * as SQLite from 'expo-sqlite';

type SeedFood = { name: string; caloriesPer100g: number };

// Valori kcal/100g indicativi (fonte CREA - INRAN / USDA, arrotondati).
export const DEFAULT_ITALIAN_FOODS: SeedFood[] = [
  { name: 'Petto di pollo', caloriesPer100g: 165 },
  { name: 'Petto di tacchino', caloriesPer100g: 107 },
  { name: 'Fesa di manzo', caloriesPer100g: 130 },
  { name: 'Lonza di maiale', caloriesPer100g: 193 },
  { name: 'Bresaola', caloriesPer100g: 151 },
  { name: 'Prosciutto crudo', caloriesPer100g: 224 },
  { name: 'Prosciutto cotto', caloriesPer100g: 146 },
  { name: 'Tonno al naturale (sgocciolato)', caloriesPer100g: 116 },
  { name: 'Salmone', caloriesPer100g: 208 },
  { name: 'Merluzzo', caloriesPer100g: 82 },
  { name: 'Gamberi', caloriesPer100g: 99 },
  { name: 'Uovo intero', caloriesPer100g: 143 },
  { name: 'Albume d\u2019uovo', caloriesPer100g: 52 },
  { name: 'Pasta di semola (secca)', caloriesPer100g: 353 },
  { name: 'Riso bianco (crudo)', caloriesPer100g: 354 },
  { name: 'Riso integrale (crudo)', caloriesPer100g: 337 },
  { name: 'Pane comune', caloriesPer100g: 265 },
  { name: 'Pane integrale', caloriesPer100g: 247 },
  { name: 'Fette biscottate', caloriesPer100g: 408 },
  { name: 'Patate', caloriesPer100g: 77 },
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
  { name: 'Mela', caloriesPer100g: 52 },
  { name: 'Banana', caloriesPer100g: 89 },
  { name: 'Arancia', caloriesPer100g: 47 },
  { name: 'Pera', caloriesPer100g: 57 },
  { name: 'Fragole', caloriesPer100g: 32 },
  { name: 'Mozzarella', caloriesPer100g: 253 },
  { name: 'Parmigiano Reggiano', caloriesPer100g: 393 },
  { name: 'Ricotta vaccina', caloriesPer100g: 146 },
  { name: 'Yogurt bianco intero', caloriesPer100g: 61 },
  { name: 'Yogurt greco 0%', caloriesPer100g: 59 },
  { name: 'Latte parzialmente scremato', caloriesPer100g: 46 },
  { name: 'Olio extravergine d\u2019oliva', caloriesPer100g: 884 },
  { name: 'Burro', caloriesPer100g: 717 },
  { name: 'Noci', caloriesPer100g: 654 },
  { name: 'Mandorle', caloriesPer100g: 579 },
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
