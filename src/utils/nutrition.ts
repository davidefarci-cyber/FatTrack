import type { Food } from '@/database';

export function caloriesForGrams(caloriesPer100g: number, grams: number): number {
  return (caloriesPer100g * grams) / 100;
}

export function caloriesForFood(food: Food, grams: number): number {
  return caloriesForGrams(food.caloriesPer100g, grams);
}
