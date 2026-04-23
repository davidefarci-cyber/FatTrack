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
};

type UseProfileResult = {
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  bmr: number | null;
  tdee: number | null;
  targetCalories: number | null;
  saveProfile: (input: ProfileInput) => Promise<UserProfile>;
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
    ...input,
    tdee,
    targetCalories,
  });
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
  const deleteFn = useCallback(() => deleteProfile(), []);

  return {
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    bmr,
    tdee: state.profile?.tdee ?? null,
    targetCalories: state.profile?.targetCalories ?? null,
    saveProfile: saveFn,
    deleteProfile: deleteFn,
    reload: reloadFn,
  };
}
