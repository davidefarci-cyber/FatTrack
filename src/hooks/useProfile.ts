import { useCallback, useMemo, useSyncExternalStore } from 'react';

import { profileDB } from '@/database';
import type { ActivityLevel, Gender, UserProfile } from '@/database';
import {
  calculateBMR,
  calculateTDEE,
  calculateTarget,
} from '@/utils/calorieCalculator';

export type ProfileInput = {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: Gender;
  activityLevel: ActivityLevel;
  weeklyGoalKg: number;
  name?: string | null;
  targetWeightKg?: number | null;
  startWeightKg?: number | null;
};

type UseProfileResult = {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  bmr: number | null;
  tdee: number | null;
  targetCalories: number | null;
  saveProfile: (input: ProfileInput) => Promise<UserProfile>;
  patchProfile: (patch: Partial<UserProfile>) => Promise<UserProfile | null>;
  deleteProfile: () => Promise<void>;
  reload: () => Promise<void>;
};

// Stato condiviso a livello di modulo: così tutti i consumer di useProfile
// (RootNavigator, OnboardingScreen, SettingsScreen, ...) leggono lo stesso
// oggetto. Sottoscrizione via `useSyncExternalStore`. È fondamentale per
// far funzionare sia l'onboarding (salvo → passo ai tab senza flag locali)
// sia il reset (delete → torno all'onboarding).

type Snapshot = {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
};

let snapshot: Snapshot = { profile: null, loading: true, error: null };
const listeners = new Set<() => void>();

function setSnapshot(next: Snapshot) {
  snapshot = next;
  for (const fn of listeners) fn();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

async function reload(): Promise<void> {
  setSnapshot({ ...snapshot, loading: true });
  try {
    const profile = await profileDB.getProfile();
    setSnapshot({ profile, loading: false, error: null });
  } catch (err) {
    setSnapshot({
      profile: snapshot.profile,
      loading: false,
      error: err instanceof Error ? err : new Error(String(err)),
    });
  }
}

let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  void reload();
}

async function saveProfile(input: ProfileInput): Promise<UserProfile> {
  const bmr = calculateBMR(input.weightKg, input.heightCm, input.age, input.gender);
  const tdee = calculateTDEE(bmr, input.activityLevel);
  const targetCalories = calculateTarget(tdee, input.weeklyGoalKg);
  const saved = await profileDB.upsertProfile({
    weightKg: input.weightKg,
    heightCm: input.heightCm,
    age: input.age,
    gender: input.gender,
    activityLevel: input.activityLevel,
    weeklyGoalKg: input.weeklyGoalKg,
    tdee,
    targetCalories,
    name: input.name ?? snapshot.profile?.name ?? null,
    targetWeightKg: input.targetWeightKg ?? snapshot.profile?.targetWeightKg ?? null,
    startWeightKg: input.startWeightKg ?? snapshot.profile?.startWeightKg ?? null,
  });
  setSnapshot({ profile: saved, loading: false, error: null });
  return saved;
}

async function patchProfile(patch: Partial<UserProfile>): Promise<UserProfile | null> {
  const current = snapshot.profile;
  if (!current) return null;
  const merged: UserProfile = { ...current, ...patch };
  // Se cambia uno dei valori che incidono su BMR/TDEE/target, ricalcolo gli
  // snapshot calorici. Cambi puramente cosmetici (nome) o di obiettivo peso
  // (target_weight_kg, start_weight_kg) non li toccano.
  const recalcKeys: Array<keyof UserProfile> = [
    'weightKg',
    'heightCm',
    'age',
    'gender',
    'activityLevel',
    'weeklyGoalKg',
  ];
  if (recalcKeys.some((k) => k in patch)) {
    const bmr = calculateBMR(merged.weightKg, merged.heightCm, merged.age, merged.gender);
    merged.tdee = calculateTDEE(bmr, merged.activityLevel);
    merged.targetCalories = calculateTarget(merged.tdee, merged.weeklyGoalKg);
  }
  const saved = await profileDB.upsertProfile(merged);
  setSnapshot({ profile: saved, loading: false, error: null });
  return saved;
}

async function deleteProfile(): Promise<void> {
  await profileDB.deleteProfile();
  setSnapshot({ profile: null, loading: false, error: null });
}

export function useProfile(): UseProfileResult {
  ensureInitialized();
  const state = useSyncExternalStore(subscribe, () => snapshot);

  const bmr = useMemo(
    () =>
      state.profile
        ? calculateBMR(
            state.profile.weightKg,
            state.profile.heightCm,
            state.profile.age,
            state.profile.gender,
          )
        : null,
    [state.profile],
  );

  const reloadFn = useCallback(() => reload(), []);
  const saveFn = useCallback((input: ProfileInput) => saveProfile(input), []);
  const patchFn = useCallback((p: Partial<UserProfile>) => patchProfile(p), []);
  const deleteFn = useCallback(() => deleteProfile(), []);

  return {
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    bmr,
    tdee: state.profile?.tdee ?? null,
    targetCalories: state.profile?.targetCalories ?? null,
    saveProfile: saveFn,
    patchProfile: patchFn,
    deleteProfile: deleteFn,
    reload: reloadFn,
  };
}
