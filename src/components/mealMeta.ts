import type { MealType } from '@/database';
import { mealPalette } from '@/theme';
import type { MealKey } from '@/theme';

// Ponte fra i tipi usati dal DB (italiano) e le chiavi della mealPalette del design (inglese).
export const MEAL_INFO: Record<MealType, { color: string; bg: string; label: string }> = {
  colazione: mealPalette.breakfast,
  pranzo: mealPalette.lunch,
  cena: mealPalette.dinner,
  spuntino: mealPalette.snack,
};

export const MEAL_ORDER: ReadonlyArray<MealType> = [
  'colazione',
  'pranzo',
  'cena',
  'spuntino',
];

// Solo per completezza — i chiamanti possono ancora risalire dalla MealKey se serve.
export const MEAL_KEY: Record<MealType, MealKey> = {
  colazione: 'breakfast',
  pranzo: 'lunch',
  cena: 'dinner',
  spuntino: 'snack',
};
