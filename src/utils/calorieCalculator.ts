import type { ActivityLevel, Gender } from '@/database';

// 1 kg di massa grassa ~ 7700 kcal (convenzione diffusa, valore approssimato).
export const KCAL_PER_KG_BODY_FAT = 7700;

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  1: 1.2, // sedentario
  2: 1.375, // leggero
  3: 1.55, // moderato
  4: 1.725, // attivo
  5: 1.9, // molto attivo
};

/**
 * Mifflin-St Jeor.
 * Uomo:  (10 * kg) + (6.25 * cm) - (5 * anni) + 5
 * Donna: (10 * kg) + (6.25 * cm) - (5 * anni) - 161
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: Gender,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'M' ? base + 5 : base - 161;
}

export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

/**
 * Sottrae il deficit calorico giornaliero necessario per l'obiettivo
 * settimanale di variazione peso.
 *
 * - weeklyGoalKg > 0 (es. 0.5) = dimagrimento ⇒ target < TDEE
 * - weeklyGoalKg < 0 (es. -0.25) = aumento ⇒ target > TDEE
 * - weeklyGoalKg = 0 = mantenimento ⇒ target = TDEE
 */
export function calculateTarget(tdee: number, weeklyGoalKg: number): number {
  const dailyDeficit = (weeklyGoalKg * KCAL_PER_KG_BODY_FAT) / 7;
  return tdee - dailyDeficit;
}

export function calculateMealCalories(caloriesPer100g: number, grams: number): number {
  return (caloriesPer100g * grams) / 100;
}
