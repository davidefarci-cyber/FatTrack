export { getDatabase, resetDatabase } from './db';
export { DEFAULT_ITALIAN_FOODS, applySeedServings, seedFoodsIfEmpty } from './seedFoods';

export * as foodsDB from './foodsDB';
export * as foodServingsDB from './foodServingsDB';
export * as mealsDB from './mealsDB';
export * as mealsStore from './mealsStore';
export * as favoritesDB from './favoritesDB';
export * as quickAddonsDB from './quickAddonsDB';
export * as settingsDB from './settingsDB';
export * as profileDB from './profileDB';

export type { Food, FoodSource, NewFood } from './foodsDB';
export type { FoodServing, NewFoodServing } from './foodServingsDB';
export type { Meal, MealType, NewMeal } from './mealsDB';
export type { Favorite, FavoriteItem, NewFavorite } from './favoritesDB';
export type { QuickAddon, NewQuickAddon } from './quickAddonsDB';
export type { DailySettings, DailySettingsPatch } from './settingsDB';
export type { UserProfile, Gender, ActivityLevel } from './profileDB';
