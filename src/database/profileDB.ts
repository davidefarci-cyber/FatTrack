import { getDatabase } from './db';

export type Gender = 'M' | 'F';
export type ActivityLevel = 1 | 2 | 3 | 4 | 5;

export type UserProfile = {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  weeklyGoalKg: number;
  tdee: number;
  targetCalories: number;
  // Campi opzionali aggiunti dopo l'onboarding base. Sono nullable per non
  // forzare migrazioni dei profili esistenti: l'utente li imposta da
  // ProfileScreen quando vuole.
  name: string | null;
  targetWeightKg: number | null;
  // Peso al momento dell'impostazione del target. Serve a calcolare il
  // progresso percentuale del WeightRing (start → current → target).
  startWeightKg: number | null;
};

const COLUMNS = `
  weight_kg AS weightKg,
  height_cm AS heightCm,
  age,
  gender,
  activity_level AS activityLevel,
  weekly_goal_kg AS weeklyGoalKg,
  tdee,
  target_calories AS targetCalories,
  name,
  target_weight_kg AS targetWeightKg,
  start_weight_kg AS startWeightKg
`;

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<UserProfile>(
    `SELECT ${COLUMNS} FROM user_profile WHERE id = 1`,
  );
  return row ?? null;
}

export async function upsertProfile(profile: UserProfile): Promise<UserProfile> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO user_profile
       (id, weight_kg, height_cm, age, gender, activity_level, weekly_goal_kg, tdee, target_calories, name, target_weight_kg, start_weight_kg)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       weight_kg = excluded.weight_kg,
       height_cm = excluded.height_cm,
       age = excluded.age,
       gender = excluded.gender,
       activity_level = excluded.activity_level,
       weekly_goal_kg = excluded.weekly_goal_kg,
       tdee = excluded.tdee,
       target_calories = excluded.target_calories,
       name = excluded.name,
       target_weight_kg = excluded.target_weight_kg,
       start_weight_kg = excluded.start_weight_kg`,
    profile.weightKg,
    profile.heightCm,
    profile.age,
    profile.gender,
    profile.activityLevel,
    profile.weeklyGoalKg,
    profile.tdee,
    profile.targetCalories,
    profile.name,
    profile.targetWeightKg,
    profile.startWeightKg,
  );
  const saved = await getProfile();
  if (!saved) throw new Error('Profile upsert failed');
  return saved;
}

export async function updateProfile(
  patch: Partial<UserProfile>,
): Promise<UserProfile | null> {
  const current = await getProfile();
  if (!current) return null;
  return upsertProfile({ ...current, ...patch });
}

export async function deleteProfile(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(`DELETE FROM user_profile WHERE id = 1`);
}
