import { getDatabase } from './db';
import {
  EquipmentTag,
  parseEquipmentTags,
  serializeEquipmentTags,
} from '../types/equipment';

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
  // Attrezzatura disponibile in casa: filtra/rank schede ed esercizi.
  // Default [] = non specificato (nessun filtro applicato).
  availableEquipment: EquipmentTag[];
  // URI restituito dal photo picker. null = niente foto, mostra l'iniziale.
  // Non viene copiato in documentDirectory: se Android pulisce la cache,
  // l'<Image> degrada gracefully via onError → wipe automatico del campo.
  avatarUri: string | null;
};

type Row = Omit<UserProfile, 'availableEquipment'> & {
  availableEquipment: string | null;
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
  start_weight_kg AS startWeightKg,
  available_equipment AS availableEquipment,
  avatar_uri AS avatarUri
`;

function rowToProfile(row: Row): UserProfile {
  return {
    weightKg: row.weightKg,
    heightCm: row.heightCm,
    age: row.age,
    gender: row.gender,
    activityLevel: row.activityLevel,
    weeklyGoalKg: row.weeklyGoalKg,
    tdee: row.tdee,
    targetCalories: row.targetCalories,
    name: row.name,
    targetWeightKg: row.targetWeightKg,
    startWeightKg: row.startWeightKg,
    availableEquipment: parseEquipmentTags(row.availableEquipment),
    avatarUri: row.avatarUri ?? null,
  };
}

export async function getProfile(): Promise<UserProfile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Row>(
    `SELECT ${COLUMNS} FROM user_profile WHERE id = 1`,
  );
  return row ? rowToProfile(row) : null;
}

export async function upsertProfile(profile: UserProfile): Promise<UserProfile> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO user_profile
       (id, weight_kg, height_cm, age, gender, activity_level, weekly_goal_kg, tdee, target_calories, name, target_weight_kg, start_weight_kg, available_equipment, avatar_uri)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
       start_weight_kg = excluded.start_weight_kg,
       available_equipment = excluded.available_equipment,
       avatar_uri = excluded.avatar_uri`,
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
    serializeEquipmentTags(profile.availableEquipment),
    profile.avatarUri,
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
