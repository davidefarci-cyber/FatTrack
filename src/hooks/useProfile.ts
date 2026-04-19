import { useCallback, useEffect, useMemo, useState } from 'react';

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

export function useProfile(): UseProfileResult {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await profileDB.getProfile());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const saveProfile = useCallback(async (input: ProfileInput): Promise<UserProfile> => {
    const bmr = calculateBMR(input.weightKg, input.heightCm, input.age, input.gender);
    const tdee = calculateTDEE(bmr, input.activityLevel);
    const targetCalories = calculateTarget(tdee, input.weeklyGoalKg);
    const saved = await profileDB.upsertProfile({
      ...input,
      tdee,
      targetCalories,
    });
    setProfile(saved);
    return saved;
  }, []);

  const deleteProfile = useCallback(async () => {
    await profileDB.deleteProfile();
    setProfile(null);
  }, []);

  const bmr = useMemo(
    () =>
      profile
        ? calculateBMR(profile.weightKg, profile.heightCm, profile.age, profile.gender)
        : null,
    [profile],
  );

  return {
    profile,
    loading,
    error,
    bmr,
    tdee: profile?.tdee ?? null,
    targetCalories: profile?.targetCalories ?? null,
    saveProfile,
    deleteProfile,
    reload,
  };
}
